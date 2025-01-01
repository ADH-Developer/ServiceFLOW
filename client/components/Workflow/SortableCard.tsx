import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Text, VStack, HStack, Badge, Icon } from '@chakra-ui/react';
import { DragHandleIcon } from '@chakra-ui/icons';
import type { ServiceRequest } from '../../types/service-request';

interface SortableCardProps {
    id: string;
    card: ServiceRequest;
    column: string;
    isDragging?: boolean;
    onClick?: () => void;
}

const SortableCard: React.FC<SortableCardProps> = ({ id, card, column, isDragging, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id,
        data: {
            type: 'card',
            card,
            column,
        },
    });

    if (!card) {
        return null;
    }

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
            position="relative"
            onClick={onClick}
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
                    {card.customer.first_name} {card.customer.last_name}
                </Text>
                <Text fontSize="sm" color="gray.600">
                    {card.vehicle.year} {card.vehicle.make} {card.vehicle.model}
                </Text>
                <Text fontSize="sm" color="gray.500">
                    {new Date(card.appointment_date).toLocaleDateString()} {card.appointment_time}
                </Text>
                {/* Urgency Badge */}
                {card.services?.[0]?.urgency && (
                    <Box textAlign="right">
                        <Badge colorScheme={getUrgencyColor(card.services[0].urgency)}>
                            {card.services[0].urgency}
                        </Badge>
                    </Box>
                )}
            </VStack>
        </Box>
    );
};

export default SortableCard; 