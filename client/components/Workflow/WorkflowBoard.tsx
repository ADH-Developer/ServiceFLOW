import React, { useEffect, useState } from 'react';
import { Box, Flex, useToast, Spinner, Text, Center } from '@chakra-ui/react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCorners,
    defaultDropAnimation,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useSocketIO } from '../../hooks/useSocketIO';
import WorkflowColumn from './WorkflowColumn';
import type { ServiceRequest } from '../../types/service-request';
import { workflowApi } from '../../lib/api-services';
import CardDetail from './CardDetail';
import SortableCard from './SortableCard';

interface BoardState {
    [key: string]: ServiceRequest[];
}

const COLUMN_COLORS = {
    estimates: 'cyan.400',
    in_progress: 'green.400',
    waiting_parts: 'orange.400',
    completed: 'gray.400',
};

const transformBoardData = (data: any): BoardState => {
    const transformed: BoardState = {};
    Object.entries(data).forEach(([key, value]) => {
        transformed[key] = value as ServiceRequest[];
    });
    return transformed;
};

const WorkflowBoard: React.FC = () => {
    const [boardState, setBoardState] = useState<BoardState>({});
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeCard, setActiveCard] = useState<ServiceRequest | null>(null);
    const [selectedCard, setSelectedCard] = useState<ServiceRequest | null>(null);
    const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
    const toast = useToast();

    // Initialize Socket.IO connection
    const { isConnected, error: socketError, emit, on } = useSocketIO('workflow');

    // Subscribe to Socket.IO messages
    useEffect(() => {
        const unsubscribeBoardUpdate = on('board_updated', (data: any) => {
            if (data && typeof data === 'object') {
                setBoardState(transformBoardData(data));
            }
        });

        const unsubscribeCardMove = on('card_moved', (data: any) => {
            if (data.success && data.board && typeof data.board === 'object') {
                setBoardState(transformBoardData(data.board));
            } else {
                toast({
                    title: 'Error moving card',
                    description: data.message || 'Failed to move card',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
        });

        return () => {
            unsubscribeBoardUpdate();
            unsubscribeCardMove();
        };
    }, [on, toast]);

    // Load initial board state
    useEffect(() => {
        const loadBoardState = async () => {
            try {
                const data = await workflowApi.getBoardState();
                setBoardState(transformBoardData(data.columns));
                setColumnOrder(data.column_order || Object.keys(data.columns));
                setError(null);
            } catch (err) {
                console.error('Error loading board state:', err);
                setError('Failed to load workflow board');
            } finally {
                setIsLoading(false);
            }
        };

        loadBoardState();
    }, []);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id.toString());

        // Find the card being dragged
        const column = (active.data.current as any)?.column;
        if (column && boardState[column]) {
            const card = boardState[column].find(
                card => card.id.toString() === active.id.toString()
            );
            setActiveCard(card || null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveCard(null);

        if (!over) return;

        const cardId = active.id.toString();
        const sourceColumn = (active.data.current as any)?.column;

        // Get the actual target column - either from the card's data or the column itself
        const overData = over.data.current as any;
        const targetColumn = overData?.column || over.id.toString();

        // Validate that both source and target columns are valid
        const validColumns = ["estimates", "in_progress", "waiting_parts", "completed"];
        if (!validColumns.includes(sourceColumn) || !validColumns.includes(targetColumn)) {
            console.error('Invalid column:', { sourceColumn, targetColumn });
            toast({
                title: 'Error moving card',
                description: 'Invalid workflow column',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        // Prevent moving cards out of completed column
        if (sourceColumn === "completed" && targetColumn !== "completed") {
            toast({
                title: 'Invalid move',
                description: 'Cards cannot be moved out of the completed column',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (sourceColumn === targetColumn) {
            // Handle reordering within the same column
            const oldIndex = boardState[sourceColumn].findIndex(
                card => card.id.toString() === cardId
            );

            // Get the index of the card we're dropping on
            const overCardIndex = boardState[sourceColumn].findIndex(
                card => card.id.toString() === over.id.toString()
            );

            // If dropping on a card, use its index, otherwise append to the end
            const newIndex = overCardIndex !== -1 ? overCardIndex : boardState[sourceColumn].length;

            if (oldIndex !== newIndex) {
                const newCards = arrayMove(boardState[sourceColumn], oldIndex, newIndex);
                const newBoardState = {
                    ...boardState,
                    [sourceColumn]: newCards,
                };

                // Store original state for error handling
                const originalState = { ...boardState };

                try {
                    // Update state optimistically
                    setBoardState(newBoardState);
                    // Update server
                    await workflowApi.moveCard(cardId, targetColumn, newIndex);
                } catch (error) {
                    // Revert on error
                    setBoardState(originalState);
                    toast({
                        title: 'Error moving card',
                        description: 'Failed to update card position',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });
                }
            }
        } else {
            // Handle moving to a different column
            const newBoardState = { ...boardState };
            const card = newBoardState[sourceColumn].find(c => c.id.toString() === cardId);

            if (card) {
                // Store original state for error handling
                const originalState = { ...boardState };

                try {
                    // Remove card from source column
                    newBoardState[sourceColumn] = newBoardState[sourceColumn].filter(
                        c => c.id.toString() !== cardId
                    );

                    // Add card to target column
                    if (!newBoardState[targetColumn]) {
                        newBoardState[targetColumn] = [];
                    }

                    // If dropping on a card, insert at its position, otherwise append
                    const overCardIndex = boardState[targetColumn]?.findIndex(
                        card => card.id.toString() === over.id.toString()
                    );

                    if (overCardIndex !== -1) {
                        newBoardState[targetColumn].splice(overCardIndex, 0, card);
                    } else {
                        newBoardState[targetColumn].push(card);
                    }

                    // Update state optimistically
                    setBoardState(newBoardState);

                    // Update server
                    const position = overCardIndex !== -1 ? overCardIndex : newBoardState[targetColumn].length - 1;
                    await workflowApi.moveCard(cardId, targetColumn, position);
                } catch (error) {
                    // Revert on error
                    setBoardState(originalState);
                    toast({
                        title: 'Error moving card',
                        description: 'Failed to move card to new column',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });
                }
            }
        }
    };

    if (isLoading) {
        return (
            <Center h="calc(100vh - 100px)">
                <Spinner size="xl" />
            </Center>
        );
    }

    if (error) {
        return (
            <Center h="calc(100vh - 100px)">
                <Text color="red.500">{error}</Text>
            </Center>
        );
    }

    return (
        <>
            <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCorners}
            >
                <Flex direction="row" gap={4} p={4} overflowX="auto">
                    {columnOrder.map((columnId) => (
                        <WorkflowColumn
                            key={columnId}
                            id={columnId}
                            title={columnId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            cards={boardState[columnId] || []}
                            color={COLUMN_COLORS[columnId as keyof typeof COLUMN_COLORS]}
                            onCardClick={(card) => {
                                setSelectedCard(card);
                                setIsCardDetailOpen(true);
                            }}
                        />
                    ))}
                </Flex>

                <DragOverlay dropAnimation={defaultDropAnimation}>
                    {activeId && activeCard ? (
                        <Box opacity={0.8}>
                            <SortableCard
                                serviceRequest={activeCard}
                                column=""
                                onClick={() => { }}
                            />
                        </Box>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {selectedCard && (
                <CardDetail
                    serviceRequest={selectedCard}
                    isOpen={isCardDetailOpen}
                    onClose={() => setIsCardDetailOpen(false)}
                    socketIO={{ isConnected, error: socketError, emit, on }}
                />
            )}
        </>
    );
};

export default WorkflowBoard; 