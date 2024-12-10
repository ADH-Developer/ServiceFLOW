import { useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    SimpleGrid,
    Text,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    useColorModeValue,
} from '@chakra-ui/react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';

const Dashboard = () => {
    const router = useRouter();

    useEffect(() => {
        // Update token name here too
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
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

interface StatCardProps {
    title: string;
    stat: string;
    helpText: string;
}

function StatCard({ title, stat, helpText }: StatCardProps) {
    const bgColor = useColorModeValue('white', 'gray.700');

    return (
        <Stat
            px={{ base: 4, md: 8 }}
            py="5"
            shadow="xl"
            border="1px solid"
            borderColor={useColorModeValue('gray.200', 'gray.500')}
            rounded="lg"
            bg={bgColor}
        >
            <StatLabel fontWeight="medium" isTruncated>
                {title}
            </StatLabel>
            <StatNumber fontSize="2xl" fontWeight="medium">
                {stat}
            </StatNumber>
            <StatHelpText>{helpText}</StatHelpText>
        </Stat>
    );
}

export default Dashboard; 