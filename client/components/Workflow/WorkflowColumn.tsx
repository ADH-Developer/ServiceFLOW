import React from 'react';
import {
    Box,
    Heading,
    VStack,
    useColorModeValue,
} from '@chakra-ui/react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ServiceRequest } from '../../types/service-request';
import SortableCard from './SortableCard';

interface WorkflowColumnProps {
    id: string;
    title: string;
    cards: ServiceRequest[];
    color: string;
    onCardClick: (card: ServiceRequest) => void;
}

const WorkflowColumn: React.FC<WorkflowColumnProps> = ({
    id,
    title,
    cards,
    color,
    onCardClick,
}) => {
    const bgColor = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const dropBgColor = useColorModeValue('gray.50', 'gray.600');

    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    return (
        <Box
            width="300px"
            minW="300px"
            bg={bgColor}
            p={4}
            borderRadius="lg"
            borderWidth="1px"
            borderColor={borderColor}
            flex="0 0 auto"
        >
            <Heading
                size="md"
                mb={4}
                pb={2}
                borderBottom="3px solid"
                borderColor={color}
            >
                {title}
                <Box as="span" ml={2} color="gray.500" fontSize="sm">
                    ({cards.length})
                </Box>
            </Heading>

            <VStack
                ref={setNodeRef}
                spacing={4}
                align="stretch"
                minH="100px"
                bg={isOver ? dropBgColor : 'transparent'}
                transition="background-color 0.2s ease"
                borderRadius="md"
                p={2}
            >
                <SortableContext
                    items={cards.map(card => card.id.toString())}
                    strategy={verticalListSortingStrategy}
                >
                    {cards.map((serviceRequest) => (
                        <SortableCard
                            key={serviceRequest.id}
                            serviceRequest={serviceRequest}
                            column={id}
                            onClick={() => onCardClick(serviceRequest)}
                        />
                    ))}
                </SortableContext>
            </VStack>
        </Box>
    );
};

export default WorkflowColumn; 