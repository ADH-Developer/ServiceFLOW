import { ReactNode } from 'react';
import {
    Box,
    Flex,
    Icon,
    useColorModeValue,
    Link,
    BoxProps,
    FlexProps,
    useDisclosure,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Text,
    HStack,
    Tabs,
    TabList,
    Tab,
} from '@chakra-ui/react';
import {
    FiHome,
    FiCalendar,
    FiClipboard,
    FiTool,
    FiUsers,
    FiSettings,
    FiBell,
    FiChevronDown,
} from 'react-icons/fi';
import { useTab } from '../../contexts/TabContext';
import { useRouter } from 'next/router';
import { customersApi } from '../../lib/api-services';

interface LinkItemProps {
    name: string;
    icon: any;
    path: string;
}

const ServiceAdvisorLinks: Array<LinkItemProps> = [
    { name: 'Dashboard', icon: FiHome, path: '/admin/dashboard' },
    { name: 'Schedule', icon: FiCalendar, path: '/admin/schedule' },
    { name: 'Appointments', icon: FiClipboard, path: '/admin/appointments' },
    { name: 'Workflow', icon: FiClipboard, path: '/admin/workflow' },
    { name: 'Customers', icon: FiUsers, path: '/admin/customers' },
    { name: 'Settings', icon: FiSettings, path: '/admin/settings' },
];

const TechnicianLinks: Array<LinkItemProps> = [
    { name: 'Dashboard', icon: FiHome, path: '/admin/dashboard' },
    { name: 'Work Orders', icon: FiTool, path: '/admin/work-orders' },
    { name: 'Settings', icon: FiSettings, path: '/admin/settings' },
];

interface SidebarProps extends BoxProps {
    onClose: () => void;
}

const Sidebar = ({ onClose, ...rest }: SidebarProps) => {
    const { activeTab } = useTab();
    const links = activeTab === 'service-advisor' ? ServiceAdvisorLinks : TechnicianLinks;

    return (
        <Box
            bg={useColorModeValue('white', 'gray.900')}
            borderRight="1px"
            borderRightColor={useColorModeValue('gray.200', 'gray.700')}
            w={{ base: 'full', md: 60 }}
            position="fixed"
            h="full"
            overflowY="auto"
            {...rest}
        >
            {links.map((link) => (
                <NavItem key={link.name} icon={link.icon} path={link.path}>
                    {link.name}
                </NavItem>
            ))}
        </Box>
    );
};

interface NavItemProps extends FlexProps {
    icon: any;
    path: string;
    children: ReactNode;
}

const NavItem = ({ icon, path, children, ...rest }: NavItemProps) => {
    const router = useRouter();

    return (
        <Box
            as="a"
            href={path}
            onClick={(e) => {
                e.preventDefault();
                router.push(path);
            }}
            width="100%"
            style={{ textDecoration: 'none' }}
        >
            <Flex
                align="center"
                p="4"
                mx="4"
                borderRadius="lg"
                role="group"
                cursor="pointer"
                _hover={{
                    bg: 'cyan.400',
                    color: 'white',
                }}
                {...rest}
            >
                {icon && (
                    <Icon
                        mr="4"
                        fontSize="16"
                        _groupHover={{
                            color: 'white',
                        }}
                        as={icon}
                    />
                )}
                {children}
            </Flex>
        </Box>
    );
};

interface Customer {
    first_name: string;
    last_name: string;
}

interface Vehicle {
    year: string;
    make: string;
    model: string;
}

interface Appointment {
    appointment_date: string;
    appointment_time: string;
    customer?: Customer;
    vehicle?: Vehicle;
}

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { activeTab, setActiveTab } = useTab();
    const bg = useColorModeValue('white', 'gray.900');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const router = useRouter();

    const handleLogout = () => {
        customersApi.logout();
        router.push('/login');
    };

    return (
        <Box minH="100vh" bg={useColorModeValue('gray.100', 'gray.900')}>
            <Box
                bg={bg}
                borderBottom="1px"
                borderColor={borderColor}
                w="100%"
                h="20"
                position="fixed"
                zIndex="1000"
            >
                <Flex px={4} h="full" justify="space-between" align="center">
                    <Flex align="center">
                        <Box
                            fontSize="2xl"
                            fontWeight="bold"
                            color="cyan.500"
                            mr={8}
                        >
                            ServiceFLOW
                        </Box>
                        <Tabs
                            variant="enclosed"
                            onChange={(index) => setActiveTab(index === 0 ? 'service-advisor' : 'technician')}
                            index={activeTab === 'service-advisor' ? 0 : 1}
                            ml={7}
                        >
                            <TabList border="none">
                                <Tab>Service Advisor</Tab>
                                <Tab>Technician</Tab>
                            </TabList>
                        </Tabs>
                    </Flex>
                    <HStack spacing={4}>
                        <IconButton
                            aria-label="Notifications"
                            icon={<FiBell />}
                            variant="ghost"
                            size="lg"
                        />
                        <Menu>
                            <MenuButton
                                py={2}
                                transition="all 0.3s"
                                _focus={{ boxShadow: 'none' }}
                            >
                                <HStack>
                                    <Text fontSize="sm">Admin User</Text>
                                    <Icon as={FiChevronDown} />
                                </HStack>
                            </MenuButton>
                            <MenuList>
                                <MenuItem onClick={handleLogout}>Sign out</MenuItem>
                            </MenuList>
                        </Menu>
                    </HStack>
                </Flex>
            </Box>

            <Flex pt="20">
                <Sidebar onClose={() => onClose} display={{ base: 'none', md: 'block' }} />
                <Box ml={{ base: 0, md: 60 }} w="full">
                    <Box p="4">
                        {children}
                    </Box>
                </Box>
            </Flex>
        </Box>
    );
}