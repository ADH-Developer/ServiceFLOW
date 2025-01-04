import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Flex, useToast, Spinner, Text, Center, VStack, Alert, AlertIcon, Button } from '@chakra-ui/react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    DragOverEvent,
    closestCenter,
    pointerWithin,
    getFirstCollision,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useWebSocket } from '../../hooks/useWebSocket';
import WorkflowColumn from './WorkflowColumn';
import { ServiceRequest, WorkflowState, WorkflowStatus, WebSocketMessage, Vehicle, Service, WorkflowHistory, Comment, Label } from '../../types/core';
import { api } from '../../utils/api';
import { workflowApi } from '../../lib/api-services';
import CardDetail from './CardDetail';
import SortableCard from './SortableCard';

const COLUMN_COLORS = {
    estimates: 'cyan.400',
    in_progress: 'green.400',
    waiting_parts: 'orange.400',
    completed: 'gray.400',
} as const;

interface RawCustomer {
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
    phone_number: string;
}

interface RawServiceRequest {
    id: string | number;
    customer: RawCustomer;
    vehicle: Vehicle;
    services: Service[];
    status: string;
    created_at: string;
    updated_at: string;
    workflow_column: WorkflowStatus;
    workflow_position: number;
    workflow_history: WorkflowHistory[];
    comments: Comment[];
    labels: Label[];
    appointment_date: string;
    appointment_time: string;
    after_hours_dropoff?: boolean;
}

const transformBoardData = (data: { [key: string]: RawServiceRequest[] }): WorkflowState => {
    const transformed: WorkflowState = {};
    if (!data || typeof data !== 'object') {
        console.warn('Invalid data received:', data);
        return transformed;
    }

    Object.entries(data).forEach(([key, value]) => {
        // Filter out any invalid cards
        const validCards = Array.isArray(value) ? value.filter(card =>
            card &&
            card.id &&
            typeof card.id !== 'undefined' &&
            card.customer?.user &&
            card.vehicle
        ) : [];

        transformed[key] = validCards.map(card => ({
            ...card,
            id: Number(card.id),
            customer: {
                id: 0, // Server doesn't send this
                first_name: card.customer.user.first_name,
                last_name: card.customer.user.last_name,
                email: card.customer.user.email,
                phone: card.customer.phone_number,
                preferred_contact: 'email' // Default value since server doesn't send this
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
    const [boardState, setBoardState] = useState<WorkflowState>({});
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
    const [activeColumn, setActiveColumn] = useState<string | null>(null);

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
    const handleMessage = useCallback((data: WebSocketMessage) => {
        if (!data) {
            console.log('[WorkflowBoard] Received empty WebSocket message');
            return;
        }

        try {
            // Handle heartbeat responses
            if (data.type === 'pong') {
                return;
            }

            console.log('[WorkflowBoard] Received WebSocket message:', {
                type: data.type,
                timestamp: new Date().toISOString(),
                data: data
            });

            const now = Date.now();
            if (now - lastUpdateRef.current > 1000) {
                if (data.type === 'workflow_update') {
                    console.log('[WorkflowBoard] Processing workflow update:', {
                        timestamp: new Date().toISOString(),
                        columnCount: Object.keys(data.data.columns).length,
                        totalCards: Object.values(data.data.columns).flat().length
                    });
                    setBoardState(transformBoardData(data.data.columns));
                    setColumnOrder(data.data.column_order || Object.keys(data.data.columns));
                    lastUpdateRef.current = now;
                } else if (data.type === 'card_moved' && data.success) {
                    console.log('[WorkflowBoard] Card movement confirmed:', {
                        timestamp: new Date().toISOString(),
                        success: data.success
                    });
                    loadBoardState();
                    lastUpdateRef.current = now;
                }
            }
        } catch (err) {
            console.error('[WorkflowBoard] Error handling WebSocket message:', err);
            if (err instanceof Error) {
                console.error('Error details:', {
                    message: err.message,
                    stack: err.stack
                });
            }
            setError('Error updating workflow board');
        }
    }, []);

    // WebSocket connection
    const { isConnected, connectionAttempts, lastMessageTime } = useWebSocket({
        url: '/ws/admin/workflow/',
        onMessage: handleMessage,
        fallbackPollInterval: 30000, // 30 seconds fallback polling
    });

    // Connection status effect
    useEffect(() => {
        console.log('[WorkflowBoard] WebSocket connection status:', {
            isConnected,
            connectionAttempts,
            lastMessageTime: new Date(lastMessageTime).toISOString()
        });
    }, [isConnected, connectionAttempts, lastMessageTime]);

    // Initial load
    useEffect(() => {
        loadBoardState();
    }, []);

    // Handle retry
    const handleRetry = () => {
        console.log('[WorkflowBoard] Retrying board state load');
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

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Find the containers
        const activeContainer = active.data.current?.column;
        const overContainer = over.data.current?.type === 'column'
            ? overId
            : over.data.current?.column;

        if (!activeContainer || !overContainer) return;

        if (activeContainer !== overContainer) {
            // Moving to a new container
            setBoardState(prev => {
                const activeItems = prev[activeContainer];
                const overItems = prev[overContainer] || [];
                const activeIndex = activeItems.findIndex(item => item.id.toString() === activeId);
                const overIndex = over.data.current?.type === 'card'
                    ? overItems.findIndex(item => item.id.toString() === overId)
                    : overItems.length;

                const newState = { ...prev };
                const [movedItem] = newState[activeContainer].splice(activeIndex, 1);

                // Insert at the correct position
                newState[overContainer] = [
                    ...overItems.slice(0, overIndex),
                    { ...movedItem, workflow_column: overContainer as WorkflowStatus },
                    ...overItems.slice(overIndex)
                ];

                return newState;
            });
        } else if (over.data.current?.type === 'card' && activeId !== overId) {
            // Moving within the same container
            setBoardState(prev => {
                const items = prev[activeContainer];
                const activeIndex = items.findIndex(item => item.id.toString() === activeId);
                const overIndex = items.findIndex(item => item.id.toString() === overId);

                const newState = { ...prev };
                newState[activeContainer] = arrayMove(items, activeIndex, overIndex);
                return newState;
            });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveColumn(null);

        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Find the containers
        const activeContainer = active.data.current?.column;
        const overContainer = over.data.current?.type === 'column'
            ? overId
            : over.data.current?.column;

        if (!activeContainer || !overContainer) return;

        try {
            const items = boardState[overContainer];
            const position = over.data.current?.type === 'card'
                ? items.findIndex(item => item.id.toString() === overId)
                : items.length;

            // Send update via API
            await workflowApi.moveCard(activeId, overContainer, position);
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
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCenter}
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
                            activeId={activeId}
                        />
                    ))}
                </Flex>
                <DragOverlay>
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