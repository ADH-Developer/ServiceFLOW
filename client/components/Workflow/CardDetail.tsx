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
import type { ServiceRequest, Comment } from '../../types';
import { api } from '../../utils/api';

interface CardDetailProps {
    card: ServiceRequest;
    isOpen: boolean;
    onClose: () => void;
}

const CardDetail: React.FC<CardDetailProps> = ({
    card,
    isOpen,
    onClose,
}) => {
    const [newComment, setNewComment] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [labels, setLabels] = useState<string[]>(card.labels.map(l => l.name));
    const [comments, setComments] = useState<Comment[]>(card.comments);
    const [isLoading, setIsLoading] = useState(false);
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const toast = useToast();

    useEffect(() => {
        const fetchComments = async () => {
            setIsLoading(true);
            try {
                const response = await api.get(`/workflow/${card.id}/comments/`);
                setComments(response.data);
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

        if (isOpen && card.id) {
            fetchComments();
        }
    }, [isOpen, card.id, toast]);

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
            const response = await api.post(`/workflow/${card.id}/comments/`, {
                text: newComment
            });
            setComments(prev => [...prev, response.data]);
            setNewComment('');
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
            await api.delete(`/workflow/${card.id}/comments/${commentId}/`);
            setComments(prev => prev.filter(comment => comment.id !== commentId));
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
            const response = await api.post(`/workflow/${card.id}/labels/`, {
                label: newLabel
            });
            setLabels(prev => [...prev, response.data.name]);
            setNewLabel('');
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
            await api.delete(`/workflow/${card.id}/labels/${label}/`);
            setLabels(prev => prev.filter(l => l !== label));
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Service Request Details</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack spacing={4} align="stretch">
                        {/* Customer Info */}
                        <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                            <Text fontWeight="bold" mb={2}>Customer Information</Text>
                            <Text>
                                {card.customer.first_name} {card.customer.last_name}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                {card.customer.email}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                {card.customer.phone}
                            </Text>
                        </Box>

                        {/* Vehicle Info */}
                        <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                            <Text fontWeight="bold" mb={2}>Vehicle Information</Text>
                            <Text>
                                {card.vehicle.year} {card.vehicle.make} {card.vehicle.model}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                VIN: {card.vehicle.vin}
                            </Text>
                        </Box>

                        {/* Services */}
                        <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
                            <Text fontWeight="bold" mb={2}>Services</Text>
                            {card.services.map((service, idx) => (
                                <HStack key={idx} mb={2}>
                                    <Badge colorScheme={getUrgencyColor(service.urgency)}>
                                        {service.urgency}
                                    </Badge>
                                    <Text>{service.service_type}</Text>
                                </HStack>
                            ))}
                        </Box>

                        {/* Tabs for Comments and Labels */}
                        <Tabs>
                            <TabList>
                                <Tab><HStack><FiMessageSquare /><Text>Comments</Text></HStack></Tab>
                                <Tab><HStack><FiTag /><Text>Labels</Text></HStack></Tab>
                            </TabList>

                            <TabPanels>
                                {/* Comments Panel */}
                                <TabPanel>
                                    <VStack spacing={4} align="stretch">
                                        {isLoading ? (
                                            <Box textAlign="center">
                                                <Spinner />
                                            </Box>
                                        ) : (
                                            <>
                                                {comments.map((comment) => (
                                                    <Box
                                                        key={comment.id}
                                                        p={3}
                                                        borderWidth="1px"
                                                        borderRadius="md"
                                                        borderColor={borderColor}
                                                        position="relative"
                                                    >
                                                        <IconButton
                                                            aria-label="Delete comment"
                                                            icon={<FiX />}
                                                            size="sm"
                                                            position="absolute"
                                                            right={2}
                                                            top={2}
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                        />
                                                        <Text fontSize="sm" mb={1}>
                                                            {comment.user.username} - {new Date(comment.created_at).toLocaleString()}
                                                        </Text>
                                                        <Text>{comment.text}</Text>
                                                    </Box>
                                                ))}
                                                <FormControl>
                                                    <FormLabel>Add Comment</FormLabel>
                                                    <Textarea
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        placeholder="Type your comment..."
                                                    />
                                                    <Button
                                                        mt={2}
                                                        leftIcon={<FiPlus />}
                                                        onClick={handleAddComment}
                                                        isDisabled={!newComment.trim()}
                                                    >
                                                        Add Comment
                                                    </Button>
                                                </FormControl>
                                            </>
                                        )}
                                    </VStack>
                                </TabPanel>

                                {/* Labels Panel */}
                                <TabPanel>
                                    <VStack spacing={4} align="stretch">
                                        <Box>
                                            {labels.map((label) => (
                                                <Badge
                                                    key={label}
                                                    m={1}
                                                    p={2}
                                                    borderRadius="full"
                                                    variant="subtle"
                                                >
                                                    {label}
                                                    <IconButton
                                                        aria-label="Remove label"
                                                        icon={<FiX />}
                                                        size="xs"
                                                        ml={1}
                                                        onClick={() => handleRemoveLabel(label)}
                                                    />
                                                </Badge>
                                            ))}
                                        </Box>
                                        <FormControl>
                                            <FormLabel>Add Label</FormLabel>
                                            <Input
                                                value={newLabel}
                                                onChange={(e) => setNewLabel(e.target.value)}
                                                placeholder="Enter label name..."
                                            />
                                            <Button
                                                mt={2}
                                                leftIcon={<FiPlus />}
                                                onClick={handleAddLabel}
                                                isDisabled={!newLabel.trim()}
                                            >
                                                Add Label
                                            </Button>
                                        </FormControl>
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default CardDetail; 