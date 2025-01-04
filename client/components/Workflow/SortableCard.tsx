import React from 'react';
import { Box, Text, useColorModeValue, Icon } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleIcon } from '@chakra-ui/icons';
import type { ServiceRequest } from '../../types';

interface SortableCardProps {
    id: string;
    card: ServiceRequest;
    column: string;
    onClick?: () => void;
    isDragging?: boolean;
}

const SortableCard: React.FC<SortableCardProps> = ({
    id,
    card,
    column,
    onClick,
    isDragging = false,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
        over,
    } = useSortable({
        id: id,
        data: {
            type: 'card',
            card,
            column,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const bgColor = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    const isBeingDragged = isDragging || isSortableDragging;
    const showTopIndicator = over?.id === id && over.data.current?.type === 'card';

    // Format customer name
    const customerName = `${card.customer.first_name} ${card.customer.last_name}`;

    // Format vehicle info
    const vehicleInfo = `${card.vehicle.make} ${card.vehicle.model}`;

    return (
        <Box
            ref={setNodeRef}
            style={style}
            position="relative"
            bg={bgColor}
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor={borderColor}
            boxShadow={isBeingDragged ? 'lg' : 'sm'}
            opacity={isBeingDragged ? 0.5 : 1}
            cursor="pointer"
            onClick={onClick}
            _hover={{
                borderColor: 'blue.500',
                boxShadow: 'md',
            }}
            _before={showTopIndicator ? {
                content: '""',
                position: 'absolute',
                top: '-2px',
                left: 0,
                right: 0,
                height: '4px',
                backgroundColor: 'blue.500',
                borderRadius: '2px',
            } : undefined}
        >
            {/* Drag Handle */}
            <Box
                {...attributes}
                {...listeners}
                position="absolute"
                top={2}
                right={2}
                cursor="grab"
                p={1}
                borderRadius="md"
                _hover={{ bg: 'gray.100' }}
                onClick={(e) => e.stopPropagation()}
            >
                <DragHandleIcon boxSize={4} color="gray.500" />
            </Box>

            <Text fontWeight="medium" mb={2} pr={8}>
                {customerName}
            </Text>
            <Text fontSize="sm" color="gray.500">
                {vehicleInfo}
            </Text>
        </Box>
    );
};

export default SortableCard; 