import { Container, Center, Heading } from '@chakra-ui/react';
import { ServiceForm } from '../../components/Auth/ServiceForm';
import { useRouter } from 'next/router';

const ServiceRequestPage = () => {
    const router = useRouter();

    const handleSubmit = async (serviceData: {
        serviceType: string;
        description: string;
        urgency: string;
    }[]) => {
        // TODO: Save service request data to API
        console.log(serviceData);

        // Navigate to thank you page
        router.push('/register/thank-you');
    };

    return (
        <Container maxW="container.md" py={10}>
            <Center>
                <Heading size="lg" mr={4}>Step 3 of 3</Heading>
            </Center>
            <Center>
                <ServiceForm onSubmit={handleSubmit} />
            </Center>
        </Container>
    );
};

export default ServiceRequestPage; 