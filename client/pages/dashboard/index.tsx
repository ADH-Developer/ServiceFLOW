import { useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    SimpleGrid,
    Text,
    useColorModeValue,
} from '@chakra-ui/react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import { StatCard } from '../../components/Dashboard/StatCard';

const Dashboard = () => {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('userData');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        // Redirect staff users to admin dashboard
        const user = JSON.parse(userData);
        if (user.is_staff) {
            router.push('/admin/dashboard');
        }
    }, [router]);

    return (
        <DashboardLayout>
            <Box>
                <Text fontSize="2xl" fontWeight="bold" mb={6}>
                    Dashboard
                </Text>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                    <StatCard
                        title="Active Services"
                        stat="2"
                        helpText="Current service requests"
                    />
                    <StatCard
                        title="Vehicles"
                        stat="3"
                        helpText="Registered vehicles"
                    />
                    <StatCard
                        title="Next Appointment"
                        stat="Mar 12"
                        helpText="Oil Change"
                    />
                </SimpleGrid>
            </Box>
        </DashboardLayout>
    );
};

export default Dashboard; 