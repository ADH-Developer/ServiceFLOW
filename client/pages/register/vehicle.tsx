import { Container, Center, Heading } from '@chakra-ui/react';
import { VehicleForm } from '../../components/Auth/VehicleForm';
import { useRouter } from 'next/router';

const VehicleRegistrationPage = () => {
    const router = useRouter();

    const handleSubmit = async (vehicleData: {
        year: string;
        make: string;
        model: string;
    }) => {
        // TODO: Save vehicle data to API
        console.log(vehicleData);

        // Navigate to service request page instead of confirmation
        router.push('/register/service');
    };

    return (
        <Container maxW="container.md" py={10}>
            <Center>
                <Heading size="lg" mr={4}>Step 2 of 3</Heading>
            </Center>
            <Center>
                <VehicleForm onSubmit={handleSubmit} />
            </Center>
        </Container>
    );
};

export default VehicleRegistrationPage; 