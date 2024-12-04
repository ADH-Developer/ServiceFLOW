import { Container, Center, Heading } from '@chakra-ui/react';
import { RegisterForm } from '../components/Auth/RegisterForm';

const RegisterPage = () => {
    return (
        <Container maxW="container.md" py={10}>
            <Center>
                <Heading size="lg" mr={4}>Step 1 of 3</Heading>
            </Center>
            <Center>
                <RegisterForm />
            </Center>
        </Container>
    );
};

export default RegisterPage; 