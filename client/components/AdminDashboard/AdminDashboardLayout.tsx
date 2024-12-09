import { useEffect } from 'react';
import {
    Box,
    Flex,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    useColorModeValue,
} from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import MobileNav from '../Dashboard/MobileNav';

const AdminDashboardLayout: React.FC = () => {
    const dispatch = useDispatch();
    const { availableRoles, activeRole } = useSelector(
        (state: RootState) => state.dashboard
    );

    useEffect(() => {
        // Connect to WebSocket when component mounts
        dispatch({ type: 'dashboard/connect' });
    }, [dispatch]);

    return (
        <Box minH="100vh" bg={useColorModeValue('gray.100', 'gray.900')}>
            <MobileNav onOpen={() => { }} />
            <Box ml={{ base: 0, md: 0 }} p="4">
                <Tabs
                    isFitted
                    variant="enclosed"
                    onChange={(index) => {
                        dispatch(setActiveRole(availableRoles[index]));
                    }}
                >
                    <TabList>
                        {availableRoles.map((role) => (
                            <Tab key={role}>{role}</Tab>
                        ))}
                    </TabList>

                    <TabPanels>
                        {availableRoles.map((role) => (
                            <TabPanel key={role}>
                                {/* Role-specific dashboard content will go here */}
                                <Box p={4}>
                                    {role} Dashboard Content
                                </Box>
                            </TabPanel>
                        ))}
                    </TabPanels>
                </Tabs>
            </Box>
        </Box>
    );
};

export default AdminDashboardLayout; 