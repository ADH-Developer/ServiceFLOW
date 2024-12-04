import { Container, VStack, Heading, Text, Button } from '@chakra-ui/react';
import { useRouter } from 'next/router';

const ThankYouPage = () => {
    const router = useRouter();

    return (
        <Container maxW="container.md" py={10}>
            <VStack spacing={6} textAlign="center">
                <Heading size="xl">Thank You!</Heading>
                <Text fontSize="lg">
                    Your service request has been successfully submitted. Our team will review your request
                    and contact you shortly using your preferred contact method.
                </Text>
                <Button
                    colorScheme="primary"
                    onClick={() => router.push('/')}
                >
                    Return to Home
                </Button>
            </VStack>
        </Container>
    );
};

export default ThankYouPage; 