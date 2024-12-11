import {
    Box,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    useColorModeValue,
} from '@chakra-ui/react';

interface StatCardProps {
    title: string;
    stat: string | number;
    helpText: string;
}

export const StatCard = ({ title, stat, helpText }: StatCardProps) => {
    const bg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    return (
        <Box
            p={6}
            bg={bg}
            borderRadius="lg"
            borderWidth="1px"
            borderColor={borderColor}
        >
            <Stat>
                <StatLabel fontSize="md">{title}</StatLabel>
                <StatNumber fontSize="3xl">{stat}</StatNumber>
                <StatHelpText>{helpText}</StatHelpText>
            </Stat>
        </Box>
    );
}; 