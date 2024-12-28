import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Text, VStack, HStack, Badge, Icon } from '@chakra-ui/react';
import { DragHandleIcon } from '@chakra-ui/icons';
import type { ServiceRequest } from '../../types/service-request';

interface SortableCardProps {
    serviceRequest: ServiceRequest;
    column: string;
    onClick: () => void;
}

const SortableCard: React.FC<SortableCardProps> = ({ serviceRequest, column, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: serviceRequest.id.toString(),
        data: {
            serviceRequest,
            column,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
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

    return (
        <Box
            ref={setNodeRef}
            style={style}
            {...attributes}
            cursor="pointer"
            bg="white"
            p={4}
            borderRadius="md"
            boxShadow="md"
            borderWidth="1px"
            opacity={isDragging ? 0.5 : 1}
            _hover={{ boxShadow: 'lg' }}
            mb={2}
            onClick={onClick}
            position="relative"
        >
            {/* Drag Handle */}
            <Box
                position="absolute"
                top={2}
                right={2}
                cursor="grab"
                {...listeners}
                p={1}
                borderRadius="md"
                _hover={{ bg: 'gray.100' }}
            >
                <Icon as={DragHandleIcon} color="gray.400" />
            </Box>

            <VStack align="stretch" spacing={2}>
                <Text fontWeight="bold">
                    {serviceRequest.customer?.user?.first_name} {serviceRequest.customer?.user?.last_name}
                </Text>
                <Text fontSize="sm" color="gray.600">
                    {serviceRequest.vehicle?.year} {serviceRequest.vehicle?.make} {serviceRequest.vehicle?.model}
                </Text>
                <Text fontSize="sm" color="gray.500">
                    {new Date(serviceRequest.appointment_date).toLocaleDateString()} {serviceRequest.appointment_time}
                </Text>
                {/* Urgency Badge */}
                {serviceRequest.services?.[0]?.urgency && (
                    <Box textAlign="right">
                        <Badge colorScheme={getUrgencyColor(serviceRequest.services[0].urgency)}>
                            {serviceRequest.services[0].urgency}
                        </Badge>
                    </Box>
                )}
            </VStack>
        </Box>
    );
};

export default SortableCard; 