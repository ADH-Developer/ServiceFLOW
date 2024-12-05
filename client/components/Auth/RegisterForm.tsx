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
import { registerSchema, type RegisterInput } from '../../lib/validations/auth';
import { customersApi } from '../../lib/api-services';
import axios from 'axios';

export const RegisterForm = () => {
    const router = useRouter();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<RegisterInput>({
        user: {
            first_name: '',
            last_name: '',
            email: '',
            password: ''
        },
        phone: '',
        preferred_contact: 'email'
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        try {
            registerSchema.parse(formData);
            setErrors({});
            return true;
        } catch (error: any) {
            const formattedErrors: Record<string, string> = {};
            error.errors.forEach((err: any) => {
                formattedErrors[err.path.join('.')] = err.message;
            });
            setErrors(formattedErrors);
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await customersApi.register(formData);

            // If registration is successful, redirect to the next step
            if (response.token) {
                router.push('/register/vehicle-service');
            }
        } catch (error) {
            // Handle registration errors
            if (axios.isAxiosError(error) && error.response) {
                setErrors(error.response.data);
            } else {
                setErrors({ general: 'An unexpected error occurred' });
            }
        }
    };

    return (
        <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg">
            <VStack spacing={4} as="form" onSubmit={handleSubmit}>
                <Heading size="md">Create Account</Heading>

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
                            preferred_contact: e.target.value as 'email' | 'phone' | 'both'
                        })}
                    >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="both">Both</option>
                    </Select>
                </FormControl>

                <Button
                    mt={4}
                    colorScheme="primary"
                    isLoading={isLoading}
                    type="submit"
                    width="full"
                    onClick={handleSubmit}
                >
                    Register
                </Button>
            </VStack>
        </Box>
    );
}; 