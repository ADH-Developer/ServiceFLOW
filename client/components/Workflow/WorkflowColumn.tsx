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
        data: {
            type: 'column',
            accepts: ['card']
        }
    });

    // Sort cards by workflow_position
    const sortedCards = [...cards].sort((a, b) =>
        (a.workflow_position || 0) - (b.workflow_position || 0)
    );

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
                    items={sortedCards.map(card => card.id.toString())}
                    strategy={verticalListSortingStrategy}
                >
                    {sortedCards.map((card) => (
                        <SortableCard
                            key={card.id}
                            id={card.id.toString()}
                            card={card}
                            column={id}
                            onClick={() => onCardClick(card)}
                        />
                    ))}
                </SortableContext>
            </VStack>
        </Box>
    );
};

export default WorkflowColumn; 