import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Box,
    Button,
    VStack,
} from '@chakra-ui/react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo,
        });

        // You can log the error to an error reporting service here
        console.error('Error caught by boundary:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <Box p={4}>
                    <Alert
                        status="error"
                        variant="subtle"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        textAlign="center"
                        borderRadius="md"
                        p={6}
                    >
                        <AlertIcon boxSize="40px" mr={0} />
                        <VStack spacing={4} mt={4}>
                            <AlertTitle fontSize="lg">
                                Something went wrong
                            </AlertTitle>
                            <AlertDescription maxWidth="sm">
                                {this.state.error?.message || 'An unexpected error occurred'}
                            </AlertDescription>
                            <Button
                                colorScheme="red"
                                onClick={this.handleReset}
                                size="sm"
                            >
                                Try Again
                            </Button>
                        </VStack>
                    </Alert>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 