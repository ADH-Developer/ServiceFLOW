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
    SpinnerProps,
} from '@chakra-ui/react';
import AdminDashboardLayout from '../../../components/Dashboard/AdminDashboardLayout';
import { StatCard } from '../../../components/Dashboard/StatCard';
import { AppointmentsList } from '../../../components/Dashboard/AppointmentsList';
import { appointmentsApi } from '../../../lib/api-services';
import { useTab } from '../../../contexts/TabContext';
import { withStaffAuth } from '../../../utils/withStaffAuth';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/appointments/';

interface Appointment {
    id: string;
    appointment_date: string;
    appointment_time: string;
    customer?: {
        first_name: string;
        last_name: string;
    };
    vehicle?: {
        year: string;
        make: string;
        model: string;
    };
    services: Array<{
        service_type: string;
        urgency: string;
    }>;
}

interface ServiceAdvisorContentProps {
    pendingCount: number;
    todayAppointments: Appointment[];
}

const ServiceAdvisorContent = ({ pendingCount, todayAppointments }: ServiceAdvisorContentProps) => {
    console.log('Rendering ServiceAdvisorContent with:', { pendingCount, todayAppointments });

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

interface WebSocketMessage {
    type: 'pending_count' | 'today_appointments';
    count?: number;
    appointments?: Appointment[];
}

const AdminDashboard = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    const { activeTab } = useTab();
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const isMountedRef = useRef(true);

    const fetchDashboardData = async () => {
        try {
            const [pendingData, todayData] = await Promise.all([
                appointmentsApi.getPendingCount(),
                appointmentsApi.getTodayAppointments()
            ]);

            console.log('Initial data loaded:', { pendingData, todayData });
            setPendingCount(pendingData.count);
            setTodayAppointments(todayData);
            setError(null);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to fetch dashboard data');
        }
    };

    const connectWebSocket = () => {
        console.log('Attempting WebSocket connection...');
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            if (isMountedRef.current) {
                console.log('WebSocket connected successfully');
            }
        };

        ws.onmessage = (event) => {
            try {
                console.log('WebSocket message received:', event.data);
                const data = JSON.parse(event.data) as WebSocketMessage;

                if (!isMountedRef.current) return;

                if (data.type === 'pending_count' && typeof data.count === 'number') {
                    setPendingCount(data.count);
                } else if (data.type === 'today_appointments' && Array.isArray(data.appointments)) {
                    setTodayAppointments(data.appointments);
                }
            } catch (error) {
                console.error('Error processing websocket message:', error);
            }
        };

        ws.onclose = () => {
            if (isMountedRef.current) {
                console.log('WebSocket connection closed, attempting reconnect...');
                setTimeout(connectWebSocket, 5000);
            }
        };

        ws.onerror = (error) => {
            if (isMountedRef.current) {
                console.error('WebSocket error:', error);
                ws.close();
            }
        };

        wsRef.current = ws;
    };

    useEffect(() => {
        isMountedRef.current = true;

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

        return () => {
            isMountedRef.current = false;
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [router]);

    const spinnerProps: SpinnerProps = {
        size: 'xl',
        color: 'blue.500',
        thickness: '4px',
    };

    if (isLoading) {
        return (
            <Center h="100vh">
                <Spinner {...spinnerProps} />
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