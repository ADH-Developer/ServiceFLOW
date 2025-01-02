import { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    VStack,
    FormErrorMessage,
    useToast,
} from '@chakra-ui/react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginSchema, LoginInput } from '../../lib/validations/auth';
import { customersApi } from '../../lib/api-services';
import { useRouter } from 'next/router';

export const LoginForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: yupResolver(loginSchema),
        mode: 'onBlur',
    });

    const onSubmit: SubmitHandler<LoginInput> = async (data) => {
        setIsLoading(true);
        try {
            const response = await customersApi.login(data);

            if (response.data.user.is_staff) {
                router.push('/admin/dashboard');
            } else {
                router.push('/dashboard');
            }

            toast({
                title: 'Login successful',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error: any) {
            toast({
                title: 'Login failed',
                description: error.response?.data?.message || 'Invalid credentials',
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
                <FormControl isInvalid={!!errors.email}>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        aria-describedby="email-error"
                    />
                    <FormErrorMessage id="email-error">
                        {errors.email?.message}
                    </FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.password}>
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <Input
                        id="password"
                        type="password"
                        {...register('password')}
                        aria-describedby="password-error"
                    />
                    <FormErrorMessage id="password-error">
                        {errors.password?.message}
                    </FormErrorMessage>
                </FormControl>

                <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    width="full"
                    isLoading={isLoading}
                >
                    Login
                </Button>
            </VStack>
        </Box>
    );
}; 