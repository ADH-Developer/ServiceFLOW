import { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    VStack,
    FormErrorMessage,
    Select,
    useToast,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { registerSchema, RegisterInput } from '../../lib/validations/auth';
import { customersApi } from '../../lib/api-services';
import { useRouter } from 'next/router';

export const RegisterForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: yupResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterInput) => {
        setIsLoading(true);
        try {
            await customersApi.register(data);
            toast({
                title: 'Account created.',
                description: "We've created your account for you.",
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            router.push('/register/vehicle-service');
        } catch (error: any) {
            toast({
                title: 'Registration failed.',
                description: error.response?.data?.message || 'Something went wrong.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box as="form" onSubmit={handleSubmit(onSubmit)} width="100%">
            <VStack spacing={4}>
                <FormControl isInvalid={!!errors.user?.first_name}>
                    <FormLabel>First Name</FormLabel>
                    <Input {...register('user.first_name')} />
                    <FormErrorMessage>
                        {errors.user?.first_name?.message}
                    </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.user?.last_name}>
                    <FormLabel>Last Name</FormLabel>
                    <Input {...register('user.last_name')} />
                    <FormErrorMessage>
                        {errors.user?.last_name?.message}
                    </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.user?.email}>
                    <FormLabel>Email</FormLabel>
                    <Input type="email" {...register('user.email')} />
                    <FormErrorMessage>
                        {errors.user?.email?.message}
                    </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.user?.password}>
                    <FormLabel>Password</FormLabel>
                    <Input type="password" {...register('user.password')} />
                    <FormErrorMessage>
                        {errors.user?.password?.message}
                    </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.phone}>
                    <FormLabel>Phone Number</FormLabel>
                    <Input type="tel" {...register('phone')} />
                    <FormErrorMessage>
                        {errors.phone?.message}
                    </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.preferred_contact}>
                    <FormLabel>Preferred Contact Method</FormLabel>
                    <Select {...register('preferred_contact')}>
                        <option value="">Select contact method</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                    </Select>
                    <FormErrorMessage>
                        {errors.preferred_contact?.message}
                    </FormErrorMessage>
                </FormControl>

                <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    width="full"
                    isLoading={isLoading}
                >
                    Register
                </Button>
            </VStack>
        </Box>
    );
}; 