import { Container, Center } from '@chakra-ui/react';
import { RegisterForm } from '../components/Auth/RegisterForm';

const RegisterPage = () => {
    return (
        <Container maxW="container.md" py={10}>
            <Center>
                <RegisterForm />
            </Center>
        </Container>
    );
};

export default RegisterPage; 