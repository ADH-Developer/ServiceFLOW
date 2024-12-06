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

type FormProps = {
    onSubmit: (e: React.FormEvent) => void;
    children: React.ReactNode;
};

const LoginPage = () => {
    const router = useRouter();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            console.log('Submitting login form...');
            const response = await customersApi.login(formData);

            console.log('Login response received:', response);

            if (response?.token) {
                toast({
                    title: 'Login successful',
                    status: 'success',
                    duration: 2000,
                    isClosable: true,
                });

                // Small delay to show success message
                setTimeout(() => {
                    router.push('/dashboard');
                }, 500);
            } else {
                throw new Error('No token received');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            const errorMessage = error.response?.data?.message ||
                error.message ||
                'Login failed. Please try again.';

            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            setErrors({ auth: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box p={8} maxWidth="400px" mx="auto" mt={10}>
            <VStack spacing={6} as="form" onSubmit={handleSubmit as any}>
                <Heading size="lg">Welcome Back</Heading>
                <Text color="gray.600">Sign in to access your dashboard</Text>

                <FormControl isInvalid={!!errors.email}>
                    <FormLabel>Email</FormLabel>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({
                            ...formData,
                            email: e.target.value
                        })}
                        required
                    />
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.password}>
                    <FormLabel>Password</FormLabel>
                    <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({
                            ...formData,
                            password: e.target.value
                        })}
                        required
                    />
                    <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>

                {errors.auth && (
                    <Text color="red.500" fontSize="sm">
                        {errors.auth}
                    </Text>
                )}

                <Button
                    type="submit"
                    colorScheme="primary"
                    width="full"
                    isLoading={isLoading}
                >
                    Sign In
                </Button>

                <Text fontSize="sm">
                    Don't have an account?{' '}
                    <Link href="/register" passHref>
                        <ChakraLink color="primary.500">Register here</ChakraLink>
                    </Link>
                </Text>
            </VStack>
        </Box>
    );
};

export default LoginPage; 