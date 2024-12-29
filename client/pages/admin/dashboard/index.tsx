import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Text,
    SimpleGrid,
    Spinner,
    Center,
    Alert,
    AlertIcon,
    HStack,
} from '@chakra-ui/react';
import AdminDashboardLayout from '../../../components/Dashboard/AdminDashboardLayout';
import { StatCard } from '../../../components/Dashboard/StatCard';
import { AppointmentsList } from '../../../components/Dashboard/AppointmentsList';
import { ConnectionStatus } from '../../../components/Dashboard/ConnectionStatus';
import { appointmentsApi } from '../../../lib/api-services';
import { useTab } from '../../../contexts/TabContext';
import { useSocketIO } from '../../../hooks/useSocketIO';
import { withStaffAuth } from '../../../utils/withStaffAuth';
import { Appointment } from '../../../types/appointment';

const LoadingSpinner = () => (
    <Center h="100vh">
        <Spinner size="xl" color="blue.500" thickness="4px" />
    </Center>
);

interface ServiceAdvisorContentProps {
    todayAppointments: Appointment[];
    isConnected: boolean;
    isFallback: boolean;
}

const ServiceAdvisorContent = ({
    todayAppointments,
    isConnected,
    isFallback,
}: ServiceAdvisorContentProps) => {
    return (
        <Box>
            <HStack justify="space-between" mb={6}>
                <Text fontSize="2xl" fontWeight="bold">
                    Service Advisor Dashboard
                </Text>
                <ConnectionStatus
                    isConnected={isConnected}
                    isFallback={isFallback}
                />
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 1 }} spacing={6} mb={8}>
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
                    <AppointmentsList appointments={todayAppointments} />
                ) : (
                    <Text>No appointments scheduled for today</Text>
                )}
            </Box>
        </Box>
    );
};

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
    const [isFallback, setIsFallback] = useState(false);
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    const { activeTab } = useTab();
    const [error, setError] = useState<string | null>(null);

    // Socket.IO connection
    const { isConnected, on } = useSocketIO('appointments');

    // Fallback polling setup
    const fetchDashboardData = useCallback(async () => {
        try {
            const todayData = await appointmentsApi.getTodayAppointments();
            setTodayAppointments(todayData);
            setError(null);
        } catch (error) {
            console.error('[Dashboard] Error fetching dashboard data:', error);
            setError('Failed to fetch dashboard data');
        }
    }, []);

    // Socket.IO event listener
    useEffect(() => {
        const unsubSchedule = on<Appointment[]>('dashboard_schedule_updated',
            (appointments) => setTodayAppointments(appointments)
        );

        return () => {
            unsubSchedule();
        };
    }, [on]);

    // Fallback polling when Socket.IO is disconnected
    useEffect(() => {
        let pollInterval: NodeJS.Timeout | null = null;

        if (!isConnected) {
            setIsFallback(true);
            // Initial fetch
            fetchDashboardData();
            // Start polling every 30 seconds
            pollInterval = setInterval(fetchDashboardData, 30000);
        } else {
            setIsFallback(false);
        }

        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [isConnected, fetchDashboardData]);

    // Initial auth check and data fetch
    useEffect(() => {
        const checkAuthAndFetchData = async () => {
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

                await fetchDashboardData();
                setIsLoading(false);
            } catch (error) {
                console.error('[Dashboard] Error during auth check:', error);
                router.push('/login');
            }
        };

        checkAuthAndFetchData();
    }, [router, fetchDashboardData]);

    if (isLoading) {
        return (
            <Box h="100vh" display="flex" alignItems="center" justifyContent="center">
                <Text>Loading...</Text>
            </Box>
        );
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
                    isConnected={isConnected}
                    isFallback={isFallback}
                />
            ) : (
                <TechnicianContent />
            )}
        </AdminDashboardLayout>
    );
};

export default withStaffAuth(AdminDashboard); 