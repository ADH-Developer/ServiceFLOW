import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    useColorModeValue,
    Text,
    SimpleGrid,
    Spinner,
    Center,
} from '@chakra-ui/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import { StatCard } from '../../../components/Dashboard/StatCard';
import { AppointmentsList } from '../../../components/Dashboard/AppointmentsList';
import { appointmentsApi } from '../../../lib/api-services';
import { useTab } from '../../../contexts/TabContext';

const AdminDashboard = () => {
    const router = useRouter();
    const tabBg = useColorModeValue('white', 'gray.800');
    const [isLoading, setIsLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [todayAppointments, setTodayAppointments] = useState([]);
    const { activeTab, setActiveTab } = useTab();

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

                // Fetch dashboard data
                const [pendingData, todayData] = await Promise.all([
                    appointmentsApi.getPendingCount(),
                    appointmentsApi.getTodayAppointments()
                ]);

                setPendingCount(pendingData.count);
                setTodayAppointments(todayData);
                setIsLoading(false);
            } catch (error) {
                console.error('Error:', error);
                router.push('/login');
            }
        };

        checkAuthAndFetchData();
    }, [router]);

    if (isLoading) {
        return (
            <Center h="100vh">
                <Spinner size="xl" />
            </Center>
        );
    }

    return (
        <DashboardLayout>
            <Box>
                <Tabs
                    variant="enclosed"
                    mb={6}
                    index={activeTab === 'service-advisor' ? 0 : 1}
                    onChange={(index) => setActiveTab(index === 0 ? 'service-advisor' : 'technician')}
                >
                    <TabList bg={tabBg} borderRadius="lg">
                        <Tab>Service Advisor</Tab>
                        <Tab>Technician</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel>
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
                        </TabPanel>
                        <TabPanel>
                            <Text fontSize="2xl" fontWeight="bold" mb={6}>
                                Technician Dashboard
                            </Text>
                            {/* Technician view will be implemented later */}
                            <Text>Coming soon...</Text>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>
        </DashboardLayout>
    );
};

export default AdminDashboard; 