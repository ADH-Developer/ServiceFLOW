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
    Select,
    Heading,
    FormErrorMessage
} from '@chakra-ui/react';
import { registerSchema } from '../../lib/validations/auth';

export const RegisterForm = () => {
    const toast = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        user: {
            first_name: '',
            last_name: '',
            email: '',
            password: ''
        },
        phone: '',
        preferred_contact: 'email' as const
    });

    const validateForm = () => {
        try {
            registerSchema.parse(formData);
            setErrors({});
            return true;
        } catch (error) {
            if (error.errors) {
                const newErrors: Record<string, string> = {};
                error.errors.forEach((err: any) => {
                    const path = err.path.join('.');
                    newErrors[path] = err.message;
                });
                setErrors(newErrors);
            }
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/customers/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            toast({
                title: 'Account created.',
                description: "We've created your account for you.",
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            router.push('/login'); // Redirect to login page after successful registration
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Unable to create account.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg">
            <VStack spacing={4} as="form" onSubmit={handleSubmit}>
                <Heading size="lg">Create Account</Heading>

                <FormControl isInvalid={!!errors['user.first_name']}>
                    <FormLabel>First Name</FormLabel>
                    <Input
                        value={formData.user.first_name}
                        onChange={(e) => setFormData({
                            ...formData,
                            user: { ...formData.user, first_name: e.target.value }
                        })}
                    />
                    <FormErrorMessage>{errors['user.first_name']}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors['user.last_name']}>
                    <FormLabel>Last Name</FormLabel>
                    <Input
                        value={formData.user.last_name}
                        onChange={(e) => setFormData({
                            ...formData,
                            user: { ...formData.user, last_name: e.target.value }
                        })}
                    />
                    <FormErrorMessage>{errors['user.last_name']}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors['user.email']}>
                    <FormLabel>Email</FormLabel>
                    <Input
                        type="email"
                        value={formData.user.email}
                        onChange={(e) => setFormData({
                            ...formData,
                            user: { ...formData.user, email: e.target.value }
                        })}
                    />
                    <FormErrorMessage>{errors['user.email']}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors['user.password']}>
                    <FormLabel>Password</FormLabel>
                    <Input
                        type="password"
                        value={formData.user.password}
                        onChange={(e) => setFormData({
                            ...formData,
                            user: { ...formData.user, password: e.target.value }
                        })}
                    />
                    <FormErrorMessage>{errors['user.password']}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors['phone']}>
                    <FormLabel>Phone</FormLabel>
                    <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({
                            ...formData,
                            phone: e.target.value
                        })}
                    />
                    <FormErrorMessage>{errors['phone']}</FormErrorMessage>
                </FormControl>

                <FormControl>
                    <FormLabel>Preferred Contact Method</FormLabel>
                    <Select
                        value={formData.preferred_contact}
                        onChange={(e) => setFormData({
                            ...formData,
                            preferred_contact: e.target.value as 'email' | 'phone'
                        })}
                    >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                    </Select>
                </FormControl>

                <Button
                    type="submit"
                    colorScheme="primary"
                    width="full"
                    isLoading={isLoading}
                >
                    Create Account
                </Button>
            </VStack>
        </Box>
    );
}; 