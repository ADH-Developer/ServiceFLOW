import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { workflowApi } from '../../lib/api-services';
import CardDetail from './CardDetail';
import SortableCard from './SortableCard';

interface BoardState {
    [key: string]: ServiceRequest[];
}

type WorkflowStatus = 'estimates' | 'in_progress' | 'waiting_parts' | 'completed';

const COLUMN_COLORS = {
    estimates: 'cyan.400',
    in_progress: 'green.400',
    waiting_parts: 'orange.400',
    completed: 'gray.400',
} as const;

const transformBoardData = (data: any): BoardState => {
    const transformed: BoardState = {};
    if (!data || typeof data !== 'object') {
        console.warn('Invalid data received:', data);
        return transformed;
    }

    Object.entries(data).forEach(([key, value]) => {
        // Filter out any invalid cards
        const validCards = Array.isArray(value) ? (value as any[]).filter(card =>
            card &&
            card.id &&
            typeof card.id !== 'undefined' &&
            card.customer?.user &&  // Check for nested user data
            card.vehicle
        ) : [];

        transformed[key] = validCards.map(card => ({
            ...card,
            customer: {
                ...card.customer,
                first_name: card.customer.user.first_name,
                last_name: card.customer.user.last_name,
                email: card.customer.user.email
            }
        }));
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
    const lastUpdateRef = useRef<number>(0);
    const toast = useToast();
    const ws = useRef<WebSocket | null>(null);

    // Load initial board state
    const loadBoardState = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Fetch initial state from API
            const data = await workflowApi.getBoardState();
            console.log('Initial board state:', data);

            setBoardState(transformBoardData(data.columns));
            setColumnOrder(data.column_order || Object.keys(data.columns));
            setIsLoading(false);
        } catch (err) {
            console.error('Error loading board state:', err);
            setError('Failed to load workflow board. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
            setIsRetrying(false);
        }
    };

    // Handle WebSocket messages
    const handleMessage = useCallback((data: any) => {
        if (!data) {
            console.log('Received empty WebSocket message');
            return;
        }

        try {
            console.log('Received WebSocket message:', {
                type: data.type,
                data: data
            });

            const now = Date.now();
            if (now - lastUpdateRef.current > 1000) {
                if (data.type === 'workflow_update' && data.data?.columns) {
                    console.log('Received workflow update:', data.data);
                    setBoardState(transformBoardData(data.data.columns));
                    setColumnOrder(data.data.column_order || Object.keys(data.data.columns));
                    lastUpdateRef.current = now;
                } else if (data.type === 'card_moved' && data.success) {
                    // Trigger a refresh of the board state
                    loadBoardState();
                    lastUpdateRef.current = now;
                }
            }
        } catch (err) {
            console.error('Error handling WebSocket message:', err);
            setError('Error updating workflow board');
        }
    }, []);

    // WebSocket connection
    const { isConnected } = useWebSocket({
        url: '/ws/admin/workflow/',
        onMessage: handleMessage,
    });

    // Initial load
    useEffect(() => {
        loadBoardState();
    }, []);

    // Handle retry
    const handleRetry = () => {
        setIsRetrying(true);
        loadBoardState();
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        console.log('DragStart event:', event);
        setActiveId(active.id.toString());

        // Find the card being dragged
        const column = (active.data.current as any)?.column;
        console.log('Active column:', column);
        console.log('Board state:', boardState);

        if (column && boardState[column]) {
            const card = boardState[column].find(
                card => card.id.toString() === active.id.toString()
            );
            console.log('Found card:', card);
            setActiveCard(card || null);
        } else {
            console.log('Could not find card in column:', column);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Handle dropping a card into a new column
        if (active.data.current?.type === 'card' && over.data.current?.type === 'column') {
            const oldColumn = active.data.current.column;
            const newColumn = over.id.toString();

            if (oldColumn !== newColumn) {
                try {
                    // Find the card being moved
                    const card = boardState[oldColumn]?.find(c => c.id.toString() === activeId);
                    if (!card) {
                        console.error('Card not found:', activeId);
                        return;
                    }

                    // Calculate new position based on where the card was dropped
                    const targetColumn = boardState[newColumn] || [];
                    let newPosition = targetColumn.length; // Default to end of column

                    // If dropped over another card, insert at that position
                    if (over.data.current?.type === 'card') {
                        const overCardIndex = targetColumn.findIndex(c => c.id.toString() === overId);
                        if (overCardIndex !== -1) {
                            newPosition = overCardIndex;
                        }
                    }

                    // Update local state optimistically
                    setBoardState(prev => {
                        const newState = { ...prev };

                        // Find and remove card from old column
                        const cardIndex = newState[oldColumn].findIndex(c => c.id.toString() === activeId);
                        if (cardIndex === -1) return prev;

                        const [movedCard] = newState[oldColumn].splice(cardIndex, 1);

                        // Update positions in old column
                        newState[oldColumn] = newState[oldColumn].map((card, index) => ({
                            ...card,
                            workflow_position: index
                        }));

                        // Initialize new column if needed
                        if (!newState[newColumn]) {
                            newState[newColumn] = [];
                        }

                        // Add card to new column at the calculated position
                        newState[newColumn].splice(newPosition, 0, {
                            ...movedCard,
                            workflow_position: newPosition,
                            workflow_column: newColumn as WorkflowStatus
                        });

                        // Update positions in new column
                        newState[newColumn] = newState[newColumn].map((card, index) => ({
                            ...card,
                            workflow_position: index
                        }));

                        return newState;
                    });

                    // Send update via API
                    await workflowApi.moveCard(activeId, newColumn, newPosition);

                } catch (error: any) {
                    console.error('Error moving card:', error);
                    const errorMessage = error.response?.data?.error || 'Failed to move card. Please try again.';
                    toast({
                        title: 'Error',
                        description: errorMessage,
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });

                    // Revert the optimistic update by reloading the board state
                    loadBoardState();
                }
            }
        }
        // Handle reordering within the same column
        else if (active.data.current?.type === 'card' && over.data.current?.type === 'card') {
            const column = active.data.current.column;
            const oldIndex = boardState[column].findIndex(c => c.id.toString() === activeId);
            const newIndex = boardState[column].findIndex(c => c.id.toString() === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
                try {
                    // Update local state optimistically
                    setBoardState(prev => {
                        const newState = { ...prev };
                        const newColumnState = [...newState[column]];
                        const [movedCard] = newColumnState.splice(oldIndex, 1);
                        newColumnState.splice(newIndex, 0, movedCard);

                        // Update positions
                        newState[column] = newColumnState.map((card, index) => ({
                            ...card,
                            workflow_position: index
                        }));

                        return newState;
                    });

                    // Send update via API
                    await workflowApi.moveCard(activeId, column, newIndex);

                } catch (error: any) {
                    console.error('Error reordering card:', error);
                    const errorMessage = error.response?.data?.error || 'Failed to reorder card. Please try again.';
                    toast({
                        title: 'Error',
                        description: errorMessage,
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });

                    // Revert the optimistic update by reloading the board state
                    loadBoardState();
                }
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
                onDragOver={(event) => {
                    console.log('DragOver event:', event);
                }}
            >
                <Flex gap={4}>
                    {columnOrder.map(columnId => (
                        <WorkflowColumn
                            key={columnId}
                            id={columnId}
                            title={columnId.replace('_', ' ').toUpperCase()}
                            cards={boardState[columnId]?.map(card => ({
                                ...card,
                                id: card.id.toString()
                            })) || []}
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
                            column={activeCard.status}
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