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
import { authService } from '../lib/auth-service';

interface FormData {
    email: string;
    password: string;
}

interface FormErrors {
    email?: string;
    password?: string;
    auth?: string;
}

const LoginPage = () => {
    const router = useRouter();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            // Validate inputs
            if (!formData.email) {
                setErrors(prev => ({ ...prev, email: 'Email is required' }));
                return;
            }
            if (!formData.password) {
                setErrors(prev => ({ ...prev, password: 'Password is required' }));
                return;
            }

            await authService.login({
                email: formData.email.trim(),
                password: formData.password
            });

            // Get user profile after successful login
            const profile = await authService.getUserProfile();

            const isAdmin = profile.groups?.some((group: string) =>
                ['super_admin', 'service_advisor', 'technician', 'parts_advisor'].includes(group)
            );

            toast({
                title: 'Login successful',
                status: 'success',
                duration: 2000,
                isClosable: true,
            });

            // Redirect based on user role
            router.push(isAdmin ? '/admin/dashboard' : '/dashboard');

        } catch (error: any) {
            console.error('Login error:', error);

            let errorMessage = 'Login failed. Please try again.';

            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                } else if (error.response.data.non_field_errors) {
                    errorMessage = error.response.data.non_field_errors[0];
                }
            }

            setErrors({ auth: errorMessage });

            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box p={8} maxWidth="400px" mx="auto" mt={10}>
            <VStack
                spacing={6}
                as="form"
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => handleSubmit(e)}
            >
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