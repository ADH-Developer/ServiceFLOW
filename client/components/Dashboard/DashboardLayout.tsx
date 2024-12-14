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
} from '@chakra-ui/react';
import {
    FiHome,
    FiTrendingUp,
    FiCompass,
    FiStar,
    FiSettings,
    FiBell,
    FiChevronDown,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import { customersApi } from '../../lib/api-services';

const LinkItems = [
    { name: 'Home', icon: FiHome, path: '/dashboard' },
    { name: 'Service History', icon: FiTrendingUp, path: '/dashboard/history' },
    { name: 'Vehicles', icon: FiCompass, path: '/dashboard/vehicles' },
    { name: 'Appointments', icon: FiStar, path: '/dashboard/appointments' },
    { name: 'Settings', icon: FiSettings, path: '/dashboard/settings' },
];

const Header = () => {
    const router = useRouter();
    const bg = useColorModeValue('white', 'gray.900');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    const handleLogout = () => {
        customersApi.logout();
        router.push('/login');
    };

    return (
        <Flex
            px={4}
            height="20"
            alignItems="center"
            bg={bg}
            borderBottomWidth="1px"
            borderBottomColor={borderColor}
            justifyContent="space-between"
        >
            <Box
                fontSize="2xl"
                fontWeight="bold"
                color="cyan.500"
            >
                ServiceFLOW
            </Box>
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
                            <Text fontSize="sm">Profile</Text>
                            <Icon as={FiChevronDown} />
                        </HStack>
                    </MenuButton>
                    <MenuList>
                        <MenuItem onClick={handleLogout}>Sign out</MenuItem>
                    </MenuList>
                </Menu>
            </HStack>
        </Flex>
    );
};

interface SidebarProps extends BoxProps {
    onClose: () => void;
}

const Sidebar = ({ onClose, ...rest }: SidebarProps) => {
    return (
        <Box
            bg={useColorModeValue('white', 'gray.900')}
            borderRight="1px"
            borderRightColor={useColorModeValue('gray.200', 'gray.700')}
            w={{ base: 'full', md: 60 }}
            pos="fixed"
            h="full"
            {...rest}
        >
            {LinkItems.map((link) => (
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
    return (
        <Link href={path} style={{ textDecoration: 'none' }}>
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
        </Link>
    );
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <Box minH="100vh" bg={useColorModeValue('gray.100', 'gray.900')}>
            <Header />
            <Flex pt="0">
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