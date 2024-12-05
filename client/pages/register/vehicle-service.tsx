import { Container, Center, Heading, useToast } from '@chakra-ui/react';
import { VehicleServiceForm } from '../../components/Auth/VehicleServiceForm';
import { useRouter } from 'next/router';
import type { ServiceRequest } from '../../types/service-request';
import { useState } from 'react';
import type { RegistrationData } from '../../types/registration';

const VehicleServicePage = () => {
    const router = useRouter();
    const toast = useToast();

    const handleSubmit = async (data: ServiceRequest) => {
        try {
            // Store data in localStorage for now
            localStorage.setItem('serviceRegistration', JSON.stringify({
                vehicle: data.vehicle,
                services: data.services
            }));

            // Navigate to scheduling page
            await router.push('/register/schedule');
        } catch (error) {
            toast({
                title: 'Error saving service information',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    return (
        <Container maxW="container.lg" py={10}>
            <Center>
                <Heading size="lg" mr={4}>Step 2 of 3</Heading>
            </Center>
            <Center>
                <VehicleServiceForm onSubmit={handleSubmit} />
            </Center>
        </Container>
    );
};

export default VehicleServicePage; 