import { Box, Text, Tooltip, Icon } from '@chakra-ui/react';
import { FiWifi, FiWifiOff } from 'react-icons/fi';

interface ConnectionStatusProps {
    isConnected: boolean;
    isFallback: boolean;
}

/**
 * Displays the current connection status with a visual indicator
 */
export const ConnectionStatus = ({ isConnected, isFallback }: ConnectionStatusProps) => {
    const getStatusColor = () => {
        if (isConnected) return 'green.500';
        if (isFallback) return 'yellow.500';
        return 'red.500';
    };

    const getStatusText = () => {
        if (isConnected) return 'Real-time updates active';
        if (isFallback) return 'Using fallback updates';
        return 'Connection lost';
    };

    return (
        <Tooltip
            label={getStatusText()}
            placement="left"
            hasArrow
        >
            <Box
                display="inline-flex"
                alignItems="center"
                gap={2}
                p={2}
                borderRadius="md"
                _hover={{ bg: 'blackAlpha.50' }}
            >
                <Icon
                    as={isConnected ? FiWifi : FiWifiOff}
                    color={getStatusColor()}
                    boxSize={4}
                />
                <Text
                    fontSize="sm"
                    color={getStatusColor()}
                    display={{ base: 'none', md: 'block' }}
                >
                    {getStatusText()}
                </Text>
            </Box>
        </Tooltip>
    );
}; 