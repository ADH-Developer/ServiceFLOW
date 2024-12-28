import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    VStack,
    HStack,
    Text,
    Badge,
    Box,
    useColorModeValue,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Input,
    Button,
    Textarea,
    FormControl,
    FormLabel,
    IconButton,
    useToast,
    Spinner,
} from '@chakra-ui/react';
import { FiPlus, FiX, FiMessageSquare, FiTag } from 'react-icons/fi';
import type { ServiceRequest } from '../../types/service-request';
import { workflowApi } from '../../lib/api-services';
import { useSocketIO } from '../../hooks/useSocketIO';

interface Comment {
    id: number;
    text: string;
    created_at?: string;
    timestamp?: string;
    user: {
        first_name: string;
        last_name: string;
    } | string;
}

interface CardDetailProps {
    serviceRequest: ServiceRequest;
    isOpen: boolean;
    onClose: () => void;
    socketIO: ReturnType<typeof useSocketIO>;
}

const CardDetail: React.FC<CardDetailProps> = ({
    serviceRequest,
    isOpen,
    onClose,
    socketIO,
}) => {
    const [newComment, setNewComment] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [labels, setLabels] = useState<string[]>(serviceRequest.labels || []);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const toast = useToast();

    const transformComment = (comment: any): Comment => {
        return {
            id: comment.id,
            text: comment.text,
            created_at: comment.created_at || comment.timestamp,
            user: typeof comment.user === 'string'
                ? {
                    first_name: comment.user.split(' ')[0] || '',
                    last_name: comment.user.split(' ')[1] || ''
                }
                : comment.user
        };
    };

    useEffect(() => {
        const fetchComments = async () => {
            setIsLoading(true);
            try {
                const response = await workflowApi.getComments(serviceRequest.id);
                if (response && Array.isArray(response)) {
                    const transformedComments = response.map(transformComment);
                    setComments(transformedComments);
                }
            } catch (error) {
                console.error('Error loading comments:', error);
                toast({
                    title: 'Error loading comments',
                    description: 'Please try again',
                    status: 'error',
                    duration: 3000,
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen) {
            fetchComments();
        }
    }, [isOpen, serviceRequest.id, toast]);

    useEffect(() => {
        if (!socketIO) return;

        const unsubscribeComment = socketIO.on('comment_updated', (data: any) => {
            if (data.card_id === serviceRequest.id) {
                if (data.action === 'add') {
                    const newComment = transformComment(data.comment);
                    setComments(prev => [...prev, newComment]);
                } else if (data.action === 'delete') {
                    setComments(prev => prev.filter(comment => comment.id !== data.comment.id));
                }
            }
        });

        const unsubscribeLabel = socketIO.on('label_updated', (data: any) => {
            if (data.card_id === serviceRequest.id) {
                if (data.action === 'add') {
                    setLabels(prev => [...prev, data.label]);
                } else if (data.action === 'remove') {
                    setLabels(prev => prev.filter(label => label !== data.label));
                }
            }
        });

        return () => {
            unsubscribeComment();
            unsubscribeLabel();
        };
    }, [socketIO, serviceRequest.id]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    const formatTime = (timeStr: string) => {
        return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency.toLowerCase()) {
            case 'high':
                return 'red';
            case 'medium':
                return 'orange';
            default:
                return 'green';
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            const response = await workflowApi.addComment(serviceRequest.id, newComment);
            const comment = transformComment(response);
            setComments(prev => [...prev, comment]);
            setNewComment('');

            // Notify other clients
            socketIO?.emit('comment_update', {
                card_id: serviceRequest.id,
                action: 'add',
                comment: response
            });
        } catch (error) {
            console.error('Error adding comment:', error);
            toast({
                title: 'Error adding comment',
                description: 'Please try again',
                status: 'error',
                duration: 3000,
            });
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await workflowApi.deleteComment(serviceRequest.id, commentId);
            setComments(prev => prev.filter(comment => comment.id !== commentId));

            // Notify other clients
            socketIO?.emit('comment_update', {
                card_id: serviceRequest.id,
                action: 'delete',
                comment: { id: commentId }
            });
        } catch (error) {
            console.error('Error deleting comment:', error);
            toast({
                title: 'Error deleting comment',
                description: 'Please try again',
                status: 'error',
                duration: 3000,
            });
        }
    };

    const handleAddLabel = async () => {
        if (!newLabel.trim()) return;

        try {
            await workflowApi.addLabel(serviceRequest.id, newLabel);
            setLabels(prev => [...prev, newLabel]);
            setNewLabel('');

            // Notify other clients
            socketIO?.emit('label_update', {
                card_id: serviceRequest.id,
                action: 'add',
                label: newLabel
            });
        } catch (error) {
            console.error('Error adding label:', error);
            toast({
                title: 'Error adding label',
                description: 'Please try again',
                status: 'error',
                duration: 3000,
            });
        }
    };

    const handleRemoveLabel = async (label: string) => {
        try {
            await workflowApi.removeLabel(serviceRequest.id, label);
            setLabels(prev => prev.filter(l => l !== label));

            // Notify other clients
            socketIO?.emit('label_update', {
                card_id: serviceRequest.id,
                action: 'remove',
                label
            });
        } catch (error) {
            console.error('Error removing label:', error);
            toast({
                title: 'Error removing label',
                description: 'Please try again',
                status: 'error',
                duration: 3000,
            });
        }
    };

    const renderCommentUser = (user: Comment['user']) => {
        if (typeof user === 'string') {
            return user;
        }
        return `${user.first_name} ${user.last_name}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Service Request Details</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <Tabs>
                        <TabList>
                            <Tab>Details</Tab>
                            <Tab>History</Tab>
                            <Tab>
                                <HStack spacing={1}>
                                    <FiMessageSquare />
                                    <Text>Comments</Text>
                                    <Badge colorScheme="blue" ml={1}>
                                        {comments.length}
                                    </Badge>
                                </HStack>
                            </Tab>
                        </TabList>

                        <TabPanels>
                            {/* Details Tab Panel */}
                            <TabPanel>
                                <VStack align="stretch" spacing={4}>
                                    {/* Customer Information */}
                                    <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                                        <Text fontWeight="bold" mb={2}>Customer Information</Text>
                                        {serviceRequest.customer && (
                                            <>
                                                <Text>Name: {serviceRequest.customer.first_name} {serviceRequest.customer.last_name}</Text>
                                            </>
                                        )}
                                    </Box>

                                    {/* Vehicle Information */}
                                    <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                                        <Text fontWeight="bold" mb={2}>Vehicle Information</Text>
                                        <Text>
                                            {serviceRequest.vehicle.year} {serviceRequest.vehicle.make} {serviceRequest.vehicle.model}
                                        </Text>
                                    </Box>

                                    {/* Labels */}
                                    <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                                        <HStack justify="space-between" mb={2}>
                                            <Text fontWeight="bold">Labels</Text>
                                            <HStack>
                                                <Input
                                                    placeholder="Add new label"
                                                    value={newLabel}
                                                    onChange={(e) => setNewLabel(e.target.value)}
                                                    size="sm"
                                                />
                                                <IconButton
                                                    aria-label="Add label"
                                                    icon={<FiPlus />}
                                                    onClick={handleAddLabel}
                                                    size="sm"
                                                />
                                            </HStack>
                                        </HStack>
                                        <HStack spacing={2} flexWrap="wrap">
                                            {labels.map((label, index) => (
                                                <Badge
                                                    key={index}
                                                    colorScheme="purple"
                                                    display="flex"
                                                    alignItems="center"
                                                >
                                                    <FiTag />
                                                    <Text ml={1}>{label}</Text>
                                                    <IconButton
                                                        aria-label="Remove label"
                                                        icon={<FiX />}
                                                        size="xs"
                                                        ml={1}
                                                        variant="ghost"
                                                        onClick={() => handleRemoveLabel(label)}
                                                    />
                                                </Badge>
                                            ))}
                                        </HStack>
                                    </Box>
                                </VStack>
                            </TabPanel>

                            {/* History Tab Panel */}
                            <TabPanel>
                                <VStack align="stretch" spacing={4}>
                                    {serviceRequest.workflow_history.map((entry, index) => (
                                        <Box
                                            key={index}
                                            p={4}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            borderColor={borderColor}
                                        >
                                            <Text fontSize="sm" color="gray.500">
                                                {new Date(entry.timestamp).toLocaleString()}
                                            </Text>
                                            <Text>
                                                Moved from{' '}
                                                <Badge>
                                                    {entry.from_column.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                </Badge>{' '}
                                                to{' '}
                                                <Badge>
                                                    {entry.to_column.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                </Badge>
                                            </Text>
                                            {entry.user && (
                                                <Text fontSize="sm">by {entry.user}</Text>
                                            )}
                                        </Box>
                                    ))}
                                </VStack>
                            </TabPanel>

                            {/* Comments Tab Panel */}
                            <TabPanel>
                                <VStack align="stretch" spacing={4}>
                                    {/* New Comment Form */}
                                    <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                                        <FormControl>
                                            <FormLabel>Add Comment</FormLabel>
                                            <Textarea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Type your comment here..."
                                                size="sm"
                                                mb={2}
                                            />
                                            <Button
                                                colorScheme="blue"
                                                size="sm"
                                                onClick={handleAddComment}
                                                leftIcon={<FiMessageSquare />}
                                            >
                                                Add Comment
                                            </Button>
                                        </FormControl>
                                    </Box>

                                    {/* Comments List */}
                                    {isLoading ? (
                                        <Box textAlign="center" py={4}>
                                            <Spinner />
                                        </Box>
                                    ) : (
                                        <VStack align="stretch" spacing={2}>
                                            {comments.length === 0 ? (
                                                <Text color="gray.500" textAlign="center">No comments yet</Text>
                                            ) : (
                                                comments.map((comment) => (
                                                    <Box
                                                        key={comment.id}
                                                        p={4}
                                                        borderWidth="1px"
                                                        borderRadius="md"
                                                        borderColor={borderColor}
                                                    >
                                                        <HStack justify="space-between" mb={2}>
                                                            <Text fontWeight="bold">
                                                                {renderCommentUser(comment.user)}
                                                            </Text>
                                                            <HStack spacing={2}>
                                                                <Text fontSize="sm" color="gray.500">
                                                                    {new Date(comment.created_at || comment.timestamp || '').toLocaleString()}
                                                                </Text>
                                                                <IconButton
                                                                    aria-label="Delete comment"
                                                                    icon={<FiX />}
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                />
                                                            </HStack>
                                                        </HStack>
                                                        <Text>{comment.text}</Text>
                                                    </Box>
                                                ))
                                            )}
                                        </VStack>
                                    )}
                                </VStack>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default CardDetail; 