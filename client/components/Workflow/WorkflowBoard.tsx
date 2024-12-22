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
import { useWebSocket } from '../../hooks/useWebSocket';
import WorkflowColumn from './WorkflowColumn';
import type { ServiceRequest } from '../../types/service-request';
import { workflowApi } from '../../lib/api-services';
import CardDetail from './CardDetail';

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
    if (!data || !data.columns || typeof data.columns !== 'object') {
        return {};
    }

    const transformedColumns: BoardState = {};

    Object.entries(data.columns).forEach(([columnId, cards]) => {
        if (Array.isArray(cards)) {
            transformedColumns[columnId] = cards.map(card => ({
                ...card,
                // Ensure workflow_history is properly formatted
                workflow_history: Array.isArray(card.workflow_history)
                    ? card.workflow_history.map((entry: any) => ({
                        ...entry,
                        user: typeof entry.user === 'string' ? entry.user : entry.user?.name || ''
                    }))
                    : [],
                // Ensure comments are properly formatted
                comments: Array.isArray(card.comments)
                    ? card.comments.map((comment: any) => {
                        // If user is a string (e.g. "John Doe"), split it into first and last name
                        let userObj;
                        if (typeof comment.user === 'string') {
                            const [first_name = '', last_name = ''] = comment.user.split(' ');
                            userObj = { first_name, last_name };
                        } else {
                            userObj = comment.user || { first_name: '', last_name: '' };
                        }

                        return {
                            ...comment,
                            user: userObj
                        };
                    })
                    : [],
                // Ensure labels are properly formatted
                labels: Array.isArray(card.labels)
                    ? card.labels.map((label: any) => typeof label === 'object' ? label.name : label)
                    : []
            }));
        }
    });

    return transformedColumns;
};

interface RetryState {
    isRetrying: boolean;
    retryCount: number;
    operation: 'move' | null;
    cardId: string | null;
    sourceColumn: string | null;
    targetColumn: string | null;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const WorkflowBoard: React.FC = () => {
    const [boardState, setBoardState] = useState<BoardState>({});
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedCard, setSelectedCard] = useState<ServiceRequest | null>(null);
    const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
    const [websocket, setWebsocket] = useState<WebSocket | null>(null);
    const toast = useToast();
    const [retryState, setRetryState] = useState<RetryState>({
        isRetrying: false,
        retryCount: 0,
        operation: null,
        cardId: null,
        sourceColumn: null,
        targetColumn: null
    });

    // Initialize WebSocket connection
    const { lastMessage, sendMessage } = useWebSocket('workflow');

    // Load initial board state
    useEffect(() => {
        const fetchBoardState = async () => {
            try {
                setError(null);
                const data = await workflowApi.getBoardState();
                if (data && typeof data === 'object') {
                    setBoardState(transformBoardData(data));
                    setColumnOrder(data.column_order || []);
                } else {
                    throw new Error('Invalid board state data');
                }
            } catch (error) {
                console.error('Error loading workflow board:', error);
                setError('Failed to load workflow board. Please try refreshing the page.');
                toast({
                    title: 'Error loading workflow board',
                    description: 'Please try refreshing the page',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchBoardState();
    }, [toast]);

    // Handle WebSocket messages
    useEffect(() => {
        if (lastMessage) {
            try {
                const data = JSON.parse(lastMessage.data);
                switch (data.type) {
                    case 'board_update':
                        if (data.board && typeof data.board === 'object') {
                            setBoardState(transformBoardData(data.board));
                        }
                        break;
                    case 'card_move':
                        // Update local state to match server state
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
                        break;
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        }
    }, [lastMessage, toast]);

    useEffect(() => {
        // Initialize WebSocket connection
        const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/workflow/`);

        ws.onopen = () => {
            console.log('WebSocket connected');
            setWebsocket(ws);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (typeof data === 'object') {
                    handleWebSocketMessage(data);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setWebsocket(null);
        };

        return () => {
            ws.close();
        };
    }, []);

    const handleWebSocketMessage = (data: any) => {
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
            case 'board_update':
                if (data.board && typeof data.board === 'object') {
                    setBoardState(transformBoardData(data.board));
                }
                break;
            case 'card_move':
                if (data.success && data.board && typeof data.board === 'object') {
                    setBoardState(transformBoardData(data.board));
                }
                break;
            // Add other cases as needed
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    // Add retry functionality
    const retryOperation = async () => {
        if (!retryState.cardId || !retryState.targetColumn) return;

        setRetryState(prev => ({
            ...prev,
            isRetrying: true,
            retryCount: prev.retryCount + 1
        }));

        try {
            await workflowApi.moveCard(retryState.cardId, retryState.targetColumn, 0);
            // Reset retry state on success
            setRetryState({
                isRetrying: false,
                retryCount: 0,
                operation: null,
                cardId: null,
                sourceColumn: null,
                targetColumn: null
            });

            // Refresh board state
            const data = await workflowApi.getBoardState();
            if (data && typeof data === 'object') {
                setBoardState(transformBoardData(data));
            }
        } catch (error) {
            console.error('Retry failed:', error);
            if (retryState.retryCount < MAX_RETRIES) {
                // Attempt another retry after delay
                setTimeout(retryOperation, RETRY_DELAY);
            } else {
                toast({
                    title: 'Operation failed',
                    description: 'Maximum retry attempts reached. Please try again later.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                // Reset retry state
                setRetryState({
                    isRetrying: false,
                    retryCount: 0,
                    operation: null,
                    cardId: null,
                    sourceColumn: null,
                    targetColumn: null
                });
            }
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const cardId = active.id;
        const sourceColumn = active.data.current?.column;
        const destinationColumn = over.id;

        // If dropped in the same place
        if (sourceColumn === destinationColumn) return;

        try {
            // Optimistically update the UI
            const newBoardState = { ...boardState };
            const sourceCards = [...(newBoardState[sourceColumn] || [])];
            const destCards = [...(newBoardState[destinationColumn] || [])];

            // Find the card to move
            const cardIndex = sourceCards.findIndex(card => card.id.toString() === cardId);
            if (cardIndex === -1) return;

            const [movedCard] = sourceCards.splice(cardIndex, 1);
            destCards.push(movedCard);

            newBoardState[sourceColumn] = sourceCards;
            newBoardState[destinationColumn] = destCards;
            setBoardState(newBoardState);

            // Send update to server
            await workflowApi.moveCard(cardId, destinationColumn, destCards.length - 1);

            // Notify other clients via WebSocket
            if (sendMessage) {
                sendMessage(JSON.stringify({
                    type: 'card_moved',
                    card_id: cardId,
                    from_column: sourceColumn,
                    to_column: destinationColumn,
                    new_position: destCards.length - 1,
                }));
            }

        } catch (error) {
            console.error('Error moving card:', error);

            // Set up retry state
            setRetryState({
                isRetrying: false,
                retryCount: 0,
                operation: 'move',
                cardId: cardId.toString(),
                sourceColumn,
                targetColumn: destinationColumn
            });

            toast({
                title: 'Error moving card',
                description: (
                    <Box>
                        <Text mb={2}>Failed to update card position.</Text>
                        <Button
                            size="sm"
                            onClick={retryOperation}
                            isLoading={retryState.isRetrying}
                            loadingText="Retrying..."
                        >
                            Retry
                        </Button>
                    </Box>
                ),
                status: 'error',
                duration: 10000,
                isClosable: true,
            });

            try {
                // Refresh board state from server
                const data = await workflowApi.getBoardState();
                if (data && typeof data === 'object') {
                    setBoardState(transformBoardData(data));
                }
            } catch (refreshError) {
                console.error('Error refreshing board state:', refreshError);
                setError('Failed to refresh board state. Please reload the page.');
            }
        }
    };

    const handleCardClick = (card: ServiceRequest) => {
        setSelectedCard(card);
        setIsCardDetailOpen(true);
    };

    if (isLoading) {
        return (
            <Center h="calc(100vh - 200px)">
                <Spinner size="xl" color="blue.500" thickness="4px" />
            </Center>
        );
    }

    if (error) {
        return (
            <Center h="calc(100vh - 200px)">
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
                <Flex
                    direction="row"
                    gap={4}
                    overflowX="auto"
                    p={4}
                    minH="calc(100vh - 200px)"
                >
                    {columnOrder.map((columnId) => (
                        <WorkflowColumn
                            key={columnId}
                            id={columnId}
                            title={columnId}
                            cards={boardState[columnId] || []}
                            color={COLUMN_COLORS[columnId as keyof typeof COLUMN_COLORS]}
                            onCardClick={handleCardClick}
                        />
                    ))}
                </Flex>
                <DragOverlay dropAnimation={defaultDropAnimation}>
                    {activeId ? (
                        <Box
                            p={4}
                            bg="white"
                            borderWidth="1px"
                            borderRadius="md"
                            boxShadow="lg"
                            opacity={0.8}
                        >
                            Moving card...
                        </Box>
                    ) : null}
                </DragOverlay>
            </DndContext>
            {selectedCard && (
                <CardDetail
                    serviceRequest={selectedCard}
                    isOpen={isCardDetailOpen}
                    onClose={() => setIsCardDetailOpen(false)}
                    websocket={websocket}
                />
            )}
        </>
    );
};

export default WorkflowBoard; 