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
    SpinnerProps,
} from '@chakra-ui/react';
import AdminDashboardLayout from '../../../components/Dashboard/AdminDashboardLayout';
import { StatCard } from '../../../components/Dashboard/StatCard';
import { AppointmentsList } from '../../../components/Dashboard/AppointmentsList';
import { appointmentsApi } from '../../../lib/api-services';
import { useTab } from '../../../contexts/TabContext';
import { withStaffAuth } from '../../../utils/withStaffAuth';
import { SocketTest } from '../../../components/SocketTest';
import { Appointment } from '../../../types/appointment';

const LoadingSpinner = () => (
    <Center h="100vh">
        <Spinner size="xl" color="blue.500" thickness="4px" />
    </Center>
);

interface ServiceAdvisorContentProps {
    pendingCount: number;
    todayAppointments: Appointment[];
}

const ServiceAdvisorContent = ({ pendingCount, todayAppointments }: ServiceAdvisorContentProps) => {
    console.log('[ServiceAdvisorContent] Rendering with:', {
        pendingCount,
        todayAppointmentsCount: todayAppointments.length,
        todayAppointmentIds: todayAppointments.map(a => a.id)
    });

    useEffect(() => {
        console.log('[ServiceAdvisorContent] State updated:', {
            pendingCount,
            todayAppointmentsCount: todayAppointments.length,
            todayAppointmentIds: todayAppointments.map(a => a.id)
        });
    }, [pendingCount, todayAppointments]);

    return (
        <Box>
            <Text fontSize="2xl" fontWeight="bold" mb={6}>
                Service Advisor Dashboard
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
                <StatCard
                    title="Pending Appointments"
                    stat={pendingCount}
                    helpText="Awaiting confirmation"
                />
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
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    const { activeTab } = useTab();
    const [error, setError] = useState<string | null>(null);

    const handlePendingCountUpdate = useCallback((count: number) => {
        console.log('[Dashboard] handlePendingCountUpdate called with count:', count);
        console.log('[Dashboard] Previous pending count:', pendingCount);
        setPendingCount(count);
        console.log('[Dashboard] Set new pending count:', count);
    }, [pendingCount]);

    const handleTodayAppointmentsUpdate = useCallback((appointments: Appointment[]) => {
        console.log('[Dashboard] handleTodayAppointmentsUpdate called with appointments:', appointments.map(a => a.id));
        console.log('[Dashboard] Previous today appointments:', todayAppointments.map(a => a.id));
        setTodayAppointments(appointments);
        console.log('[Dashboard] Set new today appointments:', appointments.map(a => a.id));
    }, [todayAppointments]);

    const fetchDashboardData = useCallback(async () => {
        try {
            console.log('[Dashboard] Fetching dashboard data...');
            const [pendingData, todayData] = await Promise.all([
                appointmentsApi.getPendingCount(),
                appointmentsApi.getTodayAppointments()
            ]);

            console.log('[Dashboard] Dashboard data loaded:', { pendingData, todayData });
            handlePendingCountUpdate(pendingData.count);
            handleTodayAppointmentsUpdate(todayData);
            setError(null);
        } catch (error) {
            console.error('[Dashboard] Error fetching dashboard data:', error);
            setError('Failed to fetch dashboard data');
        }
    }, [handlePendingCountUpdate, handleTodayAppointmentsUpdate]);

    useEffect(() => {
        console.log('[Dashboard] Current state:', { pendingCount, todayAppointments });
    }, [pendingCount, todayAppointments]);

    useEffect(() => {
        const checkAuthAndFetchData = async () => {
            console.log('[Dashboard] Checking auth and fetching data...');
            const token = localStorage.getItem('accessToken');
            const userData = localStorage.getItem('userData');

            if (!token || !userData) {
                console.log('[Dashboard] No token or user data found, redirecting to login');
                router.push('/login');
                return;
            }

            try {
                const user = JSON.parse(userData);
                if (!user.is_staff) {
                    console.log('[Dashboard] User is not staff, redirecting to dashboard');
                    router.push('/dashboard');
                    return;
                }

                console.log('[Dashboard] User is authenticated, fetching data');
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
            <SocketTest
                onAppointmentCreated={fetchDashboardData}
                onPendingCountUpdated={handlePendingCountUpdate}
                onTodayAppointmentsUpdated={handleTodayAppointmentsUpdate}
            />
            {activeTab === 'service-advisor' ? (
                <ServiceAdvisorContent
                    pendingCount={pendingCount}
                    todayAppointments={todayAppointments}
                />
            ) : (
                <TechnicianContent />
            )}
        </AdminDashboardLayout>
    );
};

export default withStaffAuth(AdminDashboard); 