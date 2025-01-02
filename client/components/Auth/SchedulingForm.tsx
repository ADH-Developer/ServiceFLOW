import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    VStack,
    HStack,
    Text,
    Grid,
    Badge,
    useColorModeValue,
    Alert,
    AlertIcon,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { appointmentsApi } from '../../lib/api-services';
import { Calendar } from '../Calendar';

interface BusinessHour {
    day: string;
    day_of_week: number;
    is_open: boolean;
    start_time: string | null;
    end_time: string | null;
    allow_after_hours_dropoff: boolean;
}

interface SchedulingFormProps {
    onSubmit: (data: { date: Date; timeSlot: string }) => void;
}

export const SchedulingForm = ({ onSubmit }: SchedulingFormProps) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);

    // Fetch business hours on component mount
    useEffect(() => {
        const fetchBusinessHours = async () => {
            try {
                const hours = await appointmentsApi.getBusinessHours();
                setBusinessHours(hours);
            } catch (err) {
                console.error('Failed to fetch business hours:', err);
            }
        };
        fetchBusinessHours();
    }, []);

    // Fetch available slots when date is selected
    useEffect(() => {
        const fetchAvailableSlots = async () => {
            if (selectedDate) {
                try {
                    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
                    const slots = await appointmentsApi.getAvailableSlots(formattedDate);
                    setAvailableSlots(slots);
                } catch (err) {
                    console.error('Failed to fetch available slots:', err);
                    setAvailableSlots([]);
                }
            }
        };
        fetchAvailableSlots();
    }, [selectedDate]);

    const calendarBg = useColorModeValue('white', 'gray.700');
    const timeSlotBg = useColorModeValue('gray.50', 'gray.600');
    const selectedBg = useColorModeValue('primary.50', 'primary.200');
    const selectedColor = useColorModeValue('primary.700', 'primary.900');

    const formatDateForDisplay = (date: Date) => {
        return format(date, 'EEEE, MMMM d, yyyy');
    };

    const handleSubmit = async () => {
        if (selectedDate && selectedTimeSlot) {
            // Parse the time slot
            const [timeStr, period] = selectedTimeSlot.split(' ');
            const [hours, minutes] = timeStr.split(':').map(Number);

            // Create a new date object for the selected date
            const appointmentDate = new Date(selectedDate);

            // Set the time on the appointment date
            let hour24 = hours;
            if (period.toUpperCase() === 'PM' && hours !== 12) {
                hour24 += 12;
            } else if (period.toUpperCase() === 'AM' && hours === 12) {
                hour24 = 0;
            }

            appointmentDate.setHours(hour24, minutes, 0, 0);

            setIsLoading(true);
            setError(null);

            try {
                await onSubmit({
                    date: appointmentDate,
                    timeSlot: selectedTimeSlot
                });
            } catch (err: any) {
                const errorMessage = err.response?.data?.[0] ||
                    err.response?.data?.message ||
                    err.message ||
                    'Failed to schedule appointment';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Get business hours string for display
    const getBusinessHoursString = () => {
        if (!businessHours.length) return 'Loading business hours...';

        const today = new Date().getDay();
        const todayHours = businessHours.find(h => h.day_of_week === (today === 0 ? 6 : today - 1));

        if (!todayHours || !todayHours.is_open) return 'Closed today';

        return `Today's hours: ${format(new Date(`2000-01-01T${todayHours.start_time}`), 'h:mm a')} - ${format(new Date(`2000-01-01T${todayHours.end_time}`), 'h:mm a')} (Closed 12:00 PM - 1:00 PM for lunch)`;
    };

    return (
        <Box bg={calendarBg} p={6} borderRadius="lg" shadow="base">
            <VStack spacing={6} align="stretch">
                {error && (
                    <Alert status="error">
                        <AlertIcon />
                        {error}
                    </Alert>
                )}

                <VStack spacing={4} align="stretch">
                    {/* Step 1: Date Selection */}
                    <Box>
                        <HStack mb={2} justify="space-between" align="center">
                            <Text fontWeight="medium">1. Select Date</Text>
                            {selectedDate && (
                                <Badge colorScheme="green">
                                    {formatDateForDisplay(selectedDate)}
                                </Badge>
                            )}
                        </HStack>
                        <Calendar
                            value={selectedDate}
                            onChange={(date) => {
                                setSelectedDate(date);
                                setSelectedTimeSlot('');
                            }}
                        />
                    </Box>

                    {/* Step 2: Time Slot Selection */}
                    {selectedDate && (
                        <Box>
                            <HStack mb={2} justify="space-between" align="center">
                                <Text fontWeight="medium">2. Select Time</Text>
                                {selectedTimeSlot && (
                                    <Badge colorScheme="green">{selectedTimeSlot}</Badge>
                                )}
                            </HStack>
                            <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                                {availableSlots.map((slot) => (
                                    <Button
                                        key={slot}
                                        size="sm"
                                        variant="outline"
                                        bg={selectedTimeSlot === slot ? selectedBg : timeSlotBg}
                                        color={selectedTimeSlot === slot ? selectedColor : 'inherit'}
                                        borderColor={selectedTimeSlot === slot ? 'primary.500' : 'transparent'}
                                        onClick={() => setSelectedTimeSlot(slot)}
                                    >
                                        {slot}
                                    </Button>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </VStack>

                <VStack spacing={4}>
                    <Button
                        colorScheme="primary"
                        size="lg"
                        width="full"
                        isLoading={isLoading}
                        loadingText="Confirming appointment..."
                        onClick={handleSubmit}
                        isDisabled={!selectedDate || !selectedTimeSlot || isLoading}
                    >
                        Confirm Appointment
                    </Button>

                    <HStack spacing={2} color="gray.600">
                        <InfoIcon />
                        <Text fontSize="sm">
                            {getBusinessHoursString()}
                        </Text>
                    </HStack>
                </VStack>
            </VStack>
        </Box>
    );
}; 