import {
    Box,
    VStack,
    Text,
    Badge,
    useColorModeValue,
} from '@chakra-ui/react';
import { format } from 'date-fns';

interface Appointment {
    id: string;
    appointment_time: string;
    appointment_date: string;
    customer: {
        first_name: string;
        last_name: string;
    };
    vehicle: {
        make: string;
        model: string;
        year: string;
    };
    services: {
        service_type: string;
        urgency: string;
    }[];
}

interface AppointmentsListProps {
    appointments: Appointment[];
}

export const AppointmentsList = ({ appointments }: AppointmentsListProps) => {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    return (
        <VStack spacing={4} align="stretch" w="100%">
            {appointments.map((appointment) => (
                <Box
                    key={appointment.id}
                    p={4}
                    bg={cardBg}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor={borderColor}
                >
                    <Text fontWeight="bold">
                        {format(new Date(`${appointment.appointment_date}T${appointment.appointment_time}`), 'h:mm a')} -{' '}
                        {appointment.customer.first_name} {appointment.customer.last_name}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                        {appointment.vehicle.year} {appointment.vehicle.make} {appointment.vehicle.model}
                    </Text>
                    <Box mt={2}>
                        {appointment.services.map((service, idx) => (
                            <Badge
                                key={idx}
                                mr={2}
                                colorScheme={
                                    service.urgency === 'high'
                                        ? 'red'
                                        : service.urgency === 'medium'
                                            ? 'yellow'
                                            : 'green'
                                }
                            >
                                {service.service_type}
                            </Badge>
                        ))}
                    </Box>
                </Box>
            ))}
        </VStack>
    );
}; 