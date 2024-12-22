import React from 'react';
import {
    Box,
    Container,
    Heading,
    useColorModeValue,
    VStack,
} from '@chakra-ui/react';
import ErrorBoundary from '../Common/ErrorBoundary';
import WorkflowBoard from './WorkflowBoard';

const WorkflowView: React.FC = () => {
    const bgColor = useColorModeValue('gray.50', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    return (
        <ErrorBoundary>
            <Container maxW="container.xl" py={5}>
                <VStack spacing={5} align="stretch">
                    <Box
                        bg={bgColor}
                        p={5}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor={borderColor}
                    >
                        <Heading size="lg" mb={4}>
                            Service Workflow
                        </Heading>
                        <WorkflowBoard />
                    </Box>
                </VStack>
            </Container>
        </ErrorBoundary>
    );
};

export default WorkflowView; 