import React, { useEffect, useState } from 'react';
import { Box, Flex, useToast, Spinner, Text, Center, VStack, Alert, AlertIcon, Button } from '@chakra-ui/react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCorners,
    defaultDropAnimation,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useWebSocket } from '../../hooks/useWebSocket';
import WorkflowColumn from './WorkflowColumn';
import type { ServiceRequest } from '../../types/service-request';
import { api } from '../../utils/api';
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

const LoadingState = () => (
    <Center h="calc(100vh - 200px)">
        <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text color="gray.500">Loading workflow board...</Text>
        </VStack>
    </Center>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <Center h="calc(100vh - 200px)">
        <VStack spacing={4}>
            <Alert status="error" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={2}>
                    <Text fontWeight="medium">{message}</Text>
                    <Button size="sm" onClick={onRetry}>
                        Try Again
                    </Button>
                </VStack>
            </Alert>
        </VStack>
    </Center>
);

const WorkflowBoard: React.FC = () => {
    const [boardState, setBoardState] = useState<BoardState>({});
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeCard, setActiveCard] = useState<ServiceRequest | null>(null);
    const [selectedCard, setSelectedCard] = useState<ServiceRequest | null>(null);
    const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const toast = useToast();

    // Load initial board state
    const loadBoardState = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await api.get('/api/admin/workflow/');
            const data = response.data;
            setBoardState(transformBoardData(data.columns));
            setColumnOrder(data.column_order || Object.keys(data.columns));
            return data;
        } catch (err) {
            console.error('Error loading board state:', err);
            setError('Failed to load workflow board. Please check your connection and try again.');
            return null;
        } finally {
            setIsLoading(false);
            setIsRetrying(false);
        }
    };

    // Handle retry
    const handleRetry = () => {
        setIsRetrying(true);
        loadBoardState();
    };

    // Handle WebSocket messages with better error handling
    const handleMessage = (data: any) => {
        if (!data) {
            console.warn('Received null/undefined WebSocket message');
            return;
        }

        try {
            if (data.type === 'card_position_update') {
                // Update the card's position in the board state
                setBoardState(prevState => {
                    const newState = { ...prevState };

                    // Find and remove the card from its current column
                    Object.keys(newState).forEach(column => {
                        newState[column] = newState[column].filter(
                            card => card.id !== data.card_id
                        );
                    });

                    // Add the card to its new column if we have it
                    const card = Object.values(prevState)
                        .flat()
                        .find(card => card.id === data.card_id);

                    if (card) {
                        if (!newState[data.new_status]) {
                            newState[data.new_status] = [];
                        }
                        newState[data.new_status].push({
                            ...card,
                            status: data.new_status
                        });
                    }

                    return newState;
                });

                // Show success toast for card movement
                toast({
                    title: 'Card Updated',
                    description: 'Card position has been updated successfully',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } else if (data.type === 'board_update') {
                // Handle full board update
                setBoardState(transformBoardData(data.columns));
                if (data.column_order) {
                    setColumnOrder(data.column_order);
                }

                // Show info toast for board update
                toast({
                    title: 'Board Updated',
                    description: 'Workflow board has been updated with latest changes',
                    status: 'info',
                    duration: 3000,
                    isClosable: true,
                });
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            toast({
                title: 'Update Error',
                description: 'Failed to process real-time update. The board may be out of sync.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Connect to WebSocket with fallback polling and better error handling
    const { isConnected, sendMessage, reconnectAttempts, maxReconnectAttempts } = useWebSocket({
        url: '/ws/admin/workflow/',
        onMessage: handleMessage,
        fallbackPollInterval: 60000,
        fallbackPollFn: loadBoardState,
        maxReconnectAttempts: 10,
        initialReconnectDelay: 1000,
        maxReconnectDelay: 30000
    });

    // Show WebSocket connection status with more detailed information
    useEffect(() => {
        if (!isConnected) {
            const message = reconnectAttempts >= maxReconnectAttempts
                ? 'Real-time updates are currently unavailable. Using periodic updates instead.'
                : `Attempting to reconnect... (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`;

            toast({
                title: 'Connection Status',
                description: message,
                status: reconnectAttempts >= maxReconnectAttempts ? 'warning' : 'info',
                duration: 5000,
                isClosable: true,
            });
        } else if (reconnectAttempts > 0) {
            // Show success message when reconnected
            toast({
                title: 'Connected',
                description: 'Real-time updates restored',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        }
    }, [isConnected, reconnectAttempts, maxReconnectAttempts, toast]);

    // Load initial data
    useEffect(() => {
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

        if (sourceColumn !== targetColumn) {
            // Store original state for error handling
            const originalState = { ...boardState };

            try {
                // Update server first
                await api.post(`/workflow/${cardId}/move-card/`, {
                    status: targetColumn
                });

                // Send WebSocket message
                sendMessage({
                    type: 'card_moved',
                    card_id: cardId,
                    new_status: targetColumn
                });

                // Update local state optimistically
                setBoardState(prevState => {
                    const newState = { ...prevState };
                    const card = newState[sourceColumn].find(c => c.id.toString() === cardId);

                    if (card) {
                        // Remove card from source column
                        newState[sourceColumn] = newState[sourceColumn].filter(
                            c => c.id.toString() !== cardId
                        );

                        // Add card to target column
                        if (!newState[targetColumn]) {
                            newState[targetColumn] = [];
                        }
                        newState[targetColumn].push({
                            ...card,
                            status: targetColumn
                        });
                    }

                    return newState;
                });
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
    };

    if (isLoading || isRetrying) {
        return <LoadingState />;
    }

    if (error) {
        return <ErrorState message={error} onRetry={handleRetry} />;
    }

    return (
        <Box p={4} h="calc(100vh - 100px)" overflowX="auto">
            <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCorners}
            >
                <Flex gap={4}>
                    {columnOrder.map(columnId => (
                        <WorkflowColumn
                            key={columnId}
                            id={columnId}
                            title={columnId.replace('_', ' ').toUpperCase()}
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
                        <SortableCard
                            id={activeId}
                            card={activeCard}
                            isDragging={true}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
            {selectedCard && (
                <CardDetail
                    isOpen={isCardDetailOpen}
                    onClose={() => setIsCardDetailOpen(false)}
                    card={selectedCard}
                />
            )}
        </Box>
    );
};

export default WorkflowBoard; 