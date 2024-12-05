import { Container, Center, Heading, useToast } from '@chakra-ui/react';
import { SchedulingForm } from '../../components/Auth/SchedulingForm';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { serviceRequestsApi } from '../../lib/api-services';

const SchedulePage = () => {
    const router = useRouter();
    const toast = useToast();

    const handleSubmit = async (appointmentData: { date: Date; timeSlot: string }) => {
        try {
            // Get stored vehicle and service data
            const storedData = localStorage.getItem('serviceRegistration');
            if (!storedData) {
                throw new Error('No service registration data found');
            }

            // Combine stored data with appointment data
            const registrationData = {
                ...JSON.parse(storedData),
                appointment_date: format(appointmentData.date, 'yyyy-MM-dd'),
                appointment_time: appointmentData.timeSlot,
            };

            console.log('Submitting service request:', registrationData);

            // Submit to API
            await serviceRequestsApi.create(registrationData);

            // Clear stored data and redirect
            localStorage.removeItem('serviceRegistration');
            router.push('/register/thank-you');

        } catch (error: any) {
            console.error('Submission error:', error);

            toast({
                title: 'Error saving appointment',
                description: error.response?.data?.message || error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    return (
        <Container maxW="container.lg" py={10}>
            <Center>
                <Heading size="lg" mb={8}>Step 3 of 3</Heading>
            </Center>
            <Center>
                <SchedulingForm onSubmit={handleSubmit} />
            </Center>
        </Container>
    );
};

export default SchedulePage; 