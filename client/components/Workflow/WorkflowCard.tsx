import React from 'react';
import { Box, Text, VStack, HStack, Badge, Icon } from '@chakra-ui/react';
import { useDraggable } from '@dnd-kit/core';
import { FiGripVertical } from 'react-icons/fi';
import type { ServiceRequest } from '../../types/service-request';

interface WorkflowCardProps {
    serviceRequest: ServiceRequest;
    column: string;
    onClick: () => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ serviceRequest, column, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: serviceRequest.id.toString(),
        data: {
            column,
            serviceRequest,
        },
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

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

    return (
        <Box
            ref={setNodeRef}
            style={style}
            position="relative"
            p={4}
            bg="white"
            borderWidth="1px"
            borderRadius="md"
            boxShadow={isDragging ? 'lg' : 'sm'}
            cursor="pointer"
            _hover={{ boxShadow: 'md' }}
            transition="box-shadow 0.2s"
            role="button"
            aria-label="Open service request details"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <Box
                position="absolute"
                top={2}
                right={2}
                p={1}
                cursor="grab"
                borderRadius="md"
                _hover={{ bg: 'gray.100' }}
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
            >
                <Icon as={FiGripVertical} color="gray.400" />
            </Box>
            <Box onClick={onClick}>
                <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                        <Text fontWeight="bold">
                            {serviceRequest.customer?.first_name} {serviceRequest.customer?.last_name}
                        </Text>
                        {serviceRequest.services.map((service, index) => (
                            <Badge key={index} colorScheme={getUrgencyColor(service.urgency)}>
                                {service.urgency}
                            </Badge>
                        ))}
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                        {serviceRequest.vehicle.year} {serviceRequest.vehicle.make} {serviceRequest.vehicle.model}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                        {new Date(serviceRequest.appointment_date).toLocaleDateString()} at{' '}
                        {new Date(`2000-01-01T${serviceRequest.appointment_time}`).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                        })}
                    </Text>
                    {serviceRequest.labels && serviceRequest.labels.length > 0 && (
                        <HStack spacing={2} flexWrap="wrap">
                            {serviceRequest.labels.map((label, index) => (
                                <Badge key={index} colorScheme="purple" size="sm">
                                    {label}
                                </Badge>
                            ))}
                        </HStack>
                    )}
                </VStack>
            </Box>
        </Box>
    );
};

export default WorkflowCard; 