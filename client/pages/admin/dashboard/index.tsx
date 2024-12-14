import { useEffect, useState, useRef } from 'react';
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
import { appointmentsApi } from '../../../lib/api-services';
import { useTab } from '../../../contexts/TabContext';
import { withStaffAuth } from '../../../utils/withStaffAuth';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/appointments/';

const ServiceAdvisorContent = ({ pendingCount, todayAppointments }: any) => (
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
            <AppointmentsList appointments={todayAppointments} />
        </Box>
    </Box>
);

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
    const [todayAppointments, setTodayAppointments] = useState([]);
    const { activeTab } = useTab();
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const connectWebSocket = () => {
        const ws = new WebSocket(WS_URL);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'pending_count') {
                setPendingCount(data.count);
            }
        };

        ws.onclose = () => {
            // Try to reconnect in 5 seconds
            setTimeout(connectWebSocket, 5000);
        };

        wsRef.current = ws;
    };

    const fetchDashboardData = async () => {
        try {
            const [pendingData, todayData] = await Promise.all([
                appointmentsApi.getPendingCount(),
                appointmentsApi.getTodayAppointments()
            ]);

            setPendingCount(pendingData.count);
            setTodayAppointments(todayData);
            setError(null);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to fetch dashboard data');
        }
    };

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
                connectWebSocket();
                setIsLoading(false);
            } catch (error) {
                console.error('Error:', error);
                router.push('/login');
            }
        };

        checkAuthAndFetchData();

        // Cleanup WebSocket connection
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [router]);

    // Fetch today's appointments every minute
    useEffect(() => {
        const interval = setInterval(() => {
            appointmentsApi.getTodayAppointments().then(setTodayAppointments);
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <Center h="100vh">
                <Spinner size="xl" />
            </Center>
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
                    pendingCount={pendingCount}
                    todayAppointments={todayAppointments}
                />
            ) : (
                <TechnicianContent />
            )}
        </AdminDashboardLayout>
    );
}

export default withStaffAuth(AdminDashboard); 