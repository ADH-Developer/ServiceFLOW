import React, { useEffect, useState } from 'react';
import { Box, Flex, useToast, Spinner, Text, Center, Button } from '@chakra-ui/react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCorners,
    defaultDropAnimation,
} from '@dnd-kit/core';
import { useSocketIO } from '../../hooks/useSocketIO';
import WorkflowColumn from './WorkflowColumn';
import type { ServiceRequest } from '../../types/service-request';
import { workflowApi } from '../../lib/api-services';
import CardDetail from './CardDetail';

interface BoardState {
    [key: string]: ServiceRequest[];
}

interface RetryState {
    isRetrying: boolean;
    retryCount: number;
    operation: 'move' | null;
    cardId: string | null;
    sourceColumn: string | null;
    targetColumn: string | null;
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
    const [selectedCard, setSelectedCard] = useState<ServiceRequest | null>(null);
    const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
    const toast = useToast();
    const [retryState, setRetryState] = useState<RetryState>({
        isRetrying: false,
        retryCount: 0,
        operation: null,
        cardId: null,
        sourceColumn: null,
        targetColumn: null
    });

    // Initialize Socket.IO connection
    const { isConnected, error: socketError, emit, on, socket } = useSocketIO('workflow');

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
                const data = await workflowApi.getBoard();
                setBoardState(transformBoardData(data.board));
                setColumnOrder(data.column_order || Object.keys(data.board));
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
        setActiveId(event.active.id.toString());
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const cardId = active.id.toString();
        const sourceColumn = active.data.current?.sortable.containerId;
        const targetColumn = over.id.toString();

        if (sourceColumn === targetColumn) return;

        emit('card_move', {
            card_id: cardId,
            from_column: sourceColumn,
            to_column: targetColumn
        });
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
                    {activeId ? <div>Dragging...</div> : null}
                </DragOverlay>
            </DndContext>

            {selectedCard && (
                <CardDetail
                    serviceRequest={selectedCard}
                    isOpen={isCardDetailOpen}
                    onClose={() => setIsCardDetailOpen(false)}
                    socket={socket}
                />
            )}
        </>
    );
};

export default WorkflowBoard; 