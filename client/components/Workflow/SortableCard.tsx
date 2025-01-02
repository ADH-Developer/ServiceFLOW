import React from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ServiceRequest } from '../../types/service-request';

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
    const shadowColor = useColorModeValue('gray.100', 'gray.900');

    const isBeingDragged = isDragging || isSortableDragging;
    const showTopIndicator = over?.id === id && over.data.current?.type === 'card';

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
            <Box
                {...attributes}
                {...listeners}
                position="absolute"
                top={0}
                left={0}
                right={0}
                height="24px"
                cursor="grab"
                zIndex={1}
            />
            <Box
                onClick={onClick}
                cursor="pointer"
                pt="4px"
            >
                <Text fontWeight="medium" mb={2}>
                    {card.customer?.first_name} {card.customer?.last_name}
                </Text>
                <Text fontSize="sm" color="gray.500">
                    {card.vehicle?.make} {card.vehicle?.model}
                </Text>
            </Box>
        </Box>
    );
};

export default SortableCard; 