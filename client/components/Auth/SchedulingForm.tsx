import { useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
    Box,
    Button,
    VStack,
    Heading,
    Grid,
    Text,
    useColorModeValue,
    HStack,
    Badge,
} from '@chakra-ui/react';
import { format, addDays, setHours, setMinutes } from 'date-fns';

interface SchedulingFormProps {
    onSubmit: (data: { date: Date; timeSlot: string }) => void;
}

export const SchedulingForm = ({ onSubmit }: SchedulingFormProps) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

    // For demo purposes - we'll hardcode available time slots
    const timeSlots = [
        '9:00 AM',
        '10:00 AM',
        '11:00 AM',
        '1:00 PM',
        '2:00 PM',
        '3:00 PM',
        '4:00 PM',
    ];

    const handleSubmit = () => {
        if (selectedDate && selectedTimeSlot) {
            onSubmit({
                date: selectedDate,
                timeSlot: selectedTimeSlot
            });
        }
    };

    const calendarBg = useColorModeValue('white', 'gray.700');
    const timeSlotBg = useColorModeValue('gray.50', 'gray.600');
    const selectedBg = useColorModeValue('primary.50', 'primary.200');
    const selectedColor = useColorModeValue('primary.700', 'primary.900');

    return (
        <Box p={8} maxWidth="800px" borderWidth={1} borderRadius="lg">
            <VStack spacing={6} align="stretch">
                <Heading size="md" mb={4}>Select Appointment Date & Time</Heading>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
                    <Box>
                        <Text mb={2} fontWeight="medium">Select Date</Text>
                        <Box
                            className="custom-datepicker-wrapper"
                            bg={calendarBg}
                            borderRadius="md"
                            p={2}
                        >
                            <ReactDatePicker
                                selected={selectedDate}
                                onChange={(date) => setSelectedDate(date)}
                                minDate={new Date()}
                                maxDate={addDays(new Date(), 30)}
                                dateFormat="MMMM d, yyyy"
                                inline
                                calendarClassName="custom-calendar"
                            />
                        </Box>
                    </Box>

                    <Box>
                        <Text mb={2} fontWeight="medium">Select Time</Text>
                        <VStack spacing={2} align="stretch">
                            {timeSlots.map((slot) => (
                                <Button
                                    key={slot}
                                    variant="outline"
                                    size="lg"
                                    bg={selectedTimeSlot === slot ? selectedBg : timeSlotBg}
                                    color={selectedTimeSlot === slot ? selectedColor : 'inherit'}
                                    borderColor={selectedTimeSlot === slot ? 'primary.500' : 'transparent'}
                                    onClick={() => setSelectedTimeSlot(slot)}
                                    _hover={{
                                        bg: selectedTimeSlot === slot ? selectedBg : 'primary.50',
                                    }}
                                >
                                    {slot}
                                    <Badge
                                        ml={2}
                                        colorScheme="green"
                                        variant="subtle"
                                    >
                                        Available
                                    </Badge>
                                </Button>
                            ))}
                        </VStack>
                    </Box>
                </Grid>

                <Button
                    colorScheme="primary"
                    size="lg"
                    width="full"
                    mt={6}
                    onClick={handleSubmit}
                    isDisabled={!selectedDate || !selectedTimeSlot}
                >
                    Confirm Appointment
                </Button>
            </VStack>
        </Box>
    );
}; 