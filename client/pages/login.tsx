import { useState } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    VStack,
    useToast,
    Heading,
    Text,
    Link as ChakraLink,
    FormErrorMessage,
} from '@chakra-ui/react';
import Link from 'next/link';
import { customersApi } from '../lib/api-services';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await customersApi.login({ email, password });

            // Check if user is staff and redirect accordingly
            if (response.data.user.is_staff) {
                router.push('/admin/dashboard');
            } else {
                router.push('/dashboard');
            }
        } catch (error: any) {
            setError(error.response?.data?.message || 'Login failed');
            setIsLoading(false);
        }
    };

    return (
        <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg">
            <VStack spacing={4} as="form" onSubmit={handleSubmit}>
                <Heading size="lg">Login</Heading>

                {error && (
                    <Text color="red.500" fontSize="sm">
                        {error}
                    </Text>
                )}

                <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </FormControl>

                <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </FormControl>

                <Button
                    type="submit"
                    colorScheme="blue"
                    width="full"
                    isLoading={isLoading}
                >
                    Login
                </Button>

                <Text>
                    Don't have an account?{' '}
                    <Link href="/register" passHref>
                        <ChakraLink color="blue.500">Register here</ChakraLink>
                    </Link>
                </Text>
            </VStack>
        </Box>
    );
};

export default LoginPage; 