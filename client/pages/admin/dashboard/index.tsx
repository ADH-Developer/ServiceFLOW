import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Text,
    SimpleGrid,
    Spinner,
    Center,
    Alert,
    AlertIcon,
} from '@chakra-ui/react';
import AdminDashboardLayout from '../../../components/Dashboard/AdminDashboardLayout';
import { StatCard } from '../../../components/Dashboard/StatCard';
import { AppointmentsList } from '../../../components/Dashboard/AppointmentsList';
import { useTab } from '../../../contexts/TabContext';
import { withStaffAuth } from '../../../utils/withStaffAuth';
import { Appointment } from '../../../types/appointment';
import { AppointmentListItem } from '../../../types';
import { useWebSocket } from '../../../hooks/useWebSocket';

const LoadingSpinner = () => (
    <Center h="100vh">
        <Spinner size="xl" color="blue.500" thickness="4px" />
    </Center>
);

interface ServiceAdvisorContentProps {
    todayAppointments: Appointment[];
}

const convertToListItem = (appointment: Appointment): AppointmentListItem => ({
    id: parseInt(appointment.id),
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time,
    customer: {
        first_name: appointment.customer.first_name,
        last_name: appointment.customer.last_name
    },
    vehicle: {
        year: appointment.vehicle.year,
        make: appointment.vehicle.make,
        model: appointment.vehicle.model
    },
    services: appointment.services.map(service => ({
        service_type: service.service_type,
        urgency: service.urgency as 'low' | 'medium' | 'high'
    }))
});

const ServiceAdvisorContent = ({ todayAppointments }: ServiceAdvisorContentProps) => {
    const appointmentListItems = todayAppointments.map(convertToListItem);

    return (
        <Box>
            <Text fontSize="2xl" fontWeight="bold" mb={6}>
                Service Advisor Dashboard
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
                <StatCard
                    title="Today's Appointments"
                    stat={todayAppointments.length}
                    helpText="Scheduled for today"
                />
            </SimpleGrid>
            <Box>
                <Text fontSize="xl" fontWeight="bold" mb={4}>
                    Today's Schedule
                </Text>
                {todayAppointments.length > 0 ? (
                    <AppointmentsList appointments={appointmentListItems} />
                ) : (
                    <Text>No appointments scheduled for today</Text>
                )}
            </Box>
        </Box>
    );
}

const TechnicianContent = () => (
    <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>
            Technician Dashboard
        </Text>
        <Alert status="info">
            <AlertIcon />
            Technician view coming soon...
        </Alert>
    </Box>
);

const AdminDashboard = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    const { activeTab } = useTab();
    const [error, setError] = useState<string | null>(null);
    const lastUpdateRef = useRef<number>(0);

    const handleMessage = useCallback((data: any) => {
        if (!data) {
            console.log('Received empty WebSocket message');
            return;
        }

        try {
            console.log('Received WebSocket message:', {
                type: data.type,
                action: data.action,
                data: data
            });

            const now = Date.now();

            // Handle appointments list updates (full refresh)
            if (data.type === 'appointments_list' && Array.isArray(data.appointments)) {
                console.log('Received appointments list update:', {
                    appointmentsCount: data.appointments.length,
                    appointments: data.appointments
                });

                // Only update if this is our first load or if it's been more than 2 seconds since last update
                if (isLoading || (now - lastUpdateRef.current > 2000)) {
                    setTodayAppointments(data.appointments);
                    setIsLoading(false);
                    lastUpdateRef.current = now;
                }
                return;
            }

            // Handle individual appointment updates
            if (data.type === 'appointment_update' && data.appointment) {
                console.log('Received appointment update:', {
                    action: data.action,
                    appointmentId: data.appointment?.id,
                    appointment: data.appointment
                });

                // Only process updates if it's been more than 1 second since last update
                if (now - lastUpdateRef.current > 1000) {
                    setTodayAppointments(prev => {
                        const sortByTime = (appointments: Appointment[]): Appointment[] =>
                            appointments.sort((a, b) =>
                                new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
                            );

                        switch (data.action) {
                            case 'create':
                                // Check if appointment already exists
                                if (prev.some(a => a.id === data.appointment.id)) {
                                    return prev;
                                }
                                return sortByTime([...prev, data.appointment]);

                            case 'update':
                                return sortByTime([
                                    ...prev.filter(a => a.id !== data.appointment.id),
                                    data.appointment
                                ]);

                            case 'delete':
                                if (!data.appointment_id) return prev;
                                return prev.filter(a => a.id !== data.appointment_id);

                            default:
                                return prev;
                        }
                    });
                    lastUpdateRef.current = now;
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            if (error instanceof Error) {
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                });
            }
            setError('Error updating appointments');
        }
    }, [isLoading]);

    // Use WebSocket hook with a 5-minute fallback polling interval
    const { isConnected } = useWebSocket({
        url: '/ws/customers/appointments/',
        onMessage: handleMessage,
        fallbackPollInterval: 300000, // 5 minutes
    });

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('accessToken');
            const userData = localStorage.getItem('userData');

            if (!token || !userData) {
                router.push('/login');
                return;
            }

            try {
                const user = JSON.parse(userData);
                if (!user.is_staff) {
                    router.push('/dashboard');
                    return;
                }
            } catch (error) {
                console.error('Error during auth check:', error);
                router.push('/login');
            }
        };

        checkAuth();
    }, [router]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <AdminDashboardLayout>
                <Alert status="error">
                    <AlertIcon />
                    {error}
                </Alert>
            </AdminDashboardLayout>
        );
    }

    return (
        <AdminDashboardLayout>
            {activeTab === 'service-advisor' ? (
                <ServiceAdvisorContent
                    todayAppointments={todayAppointments}
                />
            ) : (
                <TechnicianContent />
            )}
        </AdminDashboardLayout>
    );
}

export default withStaffAuth(AdminDashboard); 