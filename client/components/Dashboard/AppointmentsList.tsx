import {
    Box,
    Text,
    Badge,
    useColorModeValue,
    BoxProps,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { Service, AppointmentListItem } from '../../types';

interface AppointmentsListProps {
    appointments: AppointmentListItem[];
}

type AppointmentCardProps = BoxProps & {
    appointment: AppointmentListItem;
};

const getUrgencyColor = (urgency: Service['urgency']): string => {
    switch (urgency) {
        case 'high':
            return 'red';
        case 'medium':
            return 'yellow';
        default:
            return 'green';
    }
};

const ServiceBadge = ({ service }: { service: Pick<Service, 'service_type' | 'urgency'> }) => (
    <Badge
        mr={2}
        colorScheme={getUrgencyColor(service.urgency)}
    >
        {service.service_type}
    </Badge>
);

const AppointmentCard = ({ appointment, ...rest }: AppointmentCardProps) => {
    return (
        <Box
            p={4}
            borderRadius="lg"
            borderWidth="1px"
            mb={4}
            {...rest}
        >
            <Text fontWeight="bold">
                {format(new Date(`${appointment.appointment_date}T${appointment.appointment_time}`), 'h:mm a')} -{' '}
                {`${appointment.customer.first_name} ${appointment.customer.last_name}`}
            </Text>
            <Text fontSize="sm" color="gray.500">
                {`${appointment.vehicle.year} ${appointment.vehicle.make} ${appointment.vehicle.model}`}
            </Text>
            <Box mt={2}>
                {appointment.services.map((service, idx) => (
                    <ServiceBadge key={idx} service={service} />
                ))}
            </Box>
        </Box>
    );
};

export const AppointmentsList = ({ appointments }: AppointmentsListProps) => {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    return (
        <div style={{ width: '100%' }}>
            {appointments.map((appointment) => (
                <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    bg={cardBg}
                    borderColor={borderColor}
                />
            ))}
        </div>
    );
}; 