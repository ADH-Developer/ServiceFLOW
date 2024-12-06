import { useState, useEffect } from 'react';
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
    Divider,
    Center,
} from '@chakra-ui/react';
import { format, addDays, setHours, setMinutes, isSameDay, isAfter, startOfHour, addMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { InfoIcon } from '@chakra-ui/icons';
import { Tooltip } from '@chakra-ui/react';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

interface SchedulingFormProps {
    onSubmit: (data: { date: Date; timeSlot: string }) => void;
}

export const SchedulingForm = ({ onSubmit }: SchedulingFormProps) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedHour, setSelectedHour] = useState<string | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Business hours
    const businessHours = [
        '9:00 AM', '10:00 AM', '11:00 AM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
    ];

    // Filter available hours based on current time for today
    const getAvailableHours = () => {
        if (!selectedDate) return [];

        const currentDate = new Date();

        // If it's not today, show all business hours
        if (!isSameDay(selectedDate, currentDate)) {
            return businessHours;
        }

        // For today, we need to filter based on current time
        const currentHour = currentDate.getHours();
        const currentMinute = currentDate.getMinutes();

        return businessHours.filter(hour => {
            // Parse the hour string
            const [time, period] = hour.split(' '); // Split "9:00 AM" into "9:00" and "AM"
            const [hourStr] = time.split(':'); // Get "9" from "9:00"
            let hourNum = parseInt(hourStr);

            // Convert to 24-hour format
            if (period === 'PM' && hourNum !== 12) {
                hourNum += 12;
            } else if (period === 'AM' && hourNum === 12) {
                hourNum = 0;
            }

            // If it's the current hour
            if (hourNum === currentHour) {
                // Only show if we have at least 15 minutes left in the hour
                return currentMinute <= 45;
            }

            // For 4 PM (16:00), don't show if we're past 3:45 PM
            if (hourNum === 16 && currentHour === 15 && currentMinute > 45) {
                return false;
            }

            // Show the hour if it's in the future
            return hourNum > currentHour;
        });
    };

    // Helper function to create a clean date object with proper timezone
    const createCleanDate = (date: Date) => {
        // Get the local timezone
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Create a clean date without seconds/milliseconds
        const cleanDate = setMilliseconds(setSeconds(new Date(date), 0), 0);
        // Convert to UTC to match server expectations
        return zonedTimeToUtc(cleanDate, timeZone);
    };

    // Generate available time slots for a given hour
    const getAvailableTimeSlots = (hour: string) => {
        if (!selectedDate) return [];

        // Shop timezone
        const shopTimeZone = 'America/New_York';

        // Parse the selected hour
        const [time, period] = hour.split(' ');
        const [hourStr] = time.split(':');
        let selectedHourNum = parseInt(hourStr);

        // Convert to 24-hour format for internal use
        if (period === 'PM' && selectedHourNum !== 12) {
            selectedHourNum += 12;
        } else if (period === 'AM' && selectedHourNum === 12) {
            selectedHourNum = 0;
        }

        const slots = [];
        const currentDate = new Date();
        const shopCurrentTime = utcToZonedTime(currentDate, shopTimeZone);

        // If it's today and the selected hour is the current hour
        if (
            isSameDay(selectedDate, shopCurrentTime) &&
            selectedHourNum === shopCurrentTime.getHours()
        ) {
            const currentMinute = shopCurrentTime.getMinutes();
            const startMinute = Math.ceil((currentMinute + 15) / 10) * 10;

            for (let minute = startMinute; minute < 60; minute += 10) {
                const slotTime = new Date(selectedDate);
                slotTime.setHours(selectedHourNum, minute, 0, 0);

                const utcSlotTime = zonedTimeToUtc(slotTime, shopTimeZone);
                const utcCurrentTime = zonedTimeToUtc(currentDate, shopTimeZone);

                if (isAfter(utcSlotTime, addMinutes(utcCurrentTime, 10))) {
                    // Format in 12-hour format
                    slots.push(format(slotTime, 'h:mm a'));
                }
            }
        } else {
            // For future hours/days
            for (let minute = 0; minute < 60; minute += 10) {
                const slotTime = new Date(selectedDate);
                slotTime.setHours(selectedHourNum, minute, 0, 0);
                // Format in 12-hour format
                slots.push(format(slotTime, 'h:mm a'));
            }
        }

        return slots;
    };

    // Reset selections when date changes
    useEffect(() => {
        setSelectedHour(null);
        setSelectedTimeSlot('');
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
            const shopTimeZone = 'America/New_York';

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

    return (
        <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg">
            <VStack spacing={8} align="stretch">
                <VStack align="stretch" spacing={2}>
                    <Heading size="md">Schedule Your Appointment</Heading>
                    <Text fontSize="sm" color="gray.600">
                        Select your preferred date and time below
                    </Text>
                </VStack>

                {error && (
                    <Box bg="red.50" color="red.600" p={3} borderRadius="md">
                        <Text>{error}</Text>
                    </Box>
                )}

                <VStack spacing={6} align="stretch">
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
                        <Center>
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
                        </Center>
                    </Box>

                    {/* Step 2: Hour Selection */}
                    {selectedDate && (
                        <Box>
                            <HStack mb={2} justify="space-between" align="center">
                                <Text fontWeight="medium">2. Select Hour</Text>
                                {selectedHour && (
                                    <Badge colorScheme="green">{selectedHour}</Badge>
                                )}
                            </HStack>
                            <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                                {getAvailableHours().map((hour) => (
                                    <Button
                                        key={hour}
                                        size="sm"
                                        variant="outline"
                                        bg={selectedHour === hour ? selectedBg : timeSlotBg}
                                        color={selectedHour === hour ? selectedColor : 'inherit'}
                                        borderColor={selectedHour === hour ? 'primary.500' : 'transparent'}
                                        onClick={() => {
                                            setSelectedHour(hour);
                                            setSelectedTimeSlot('');
                                        }}
                                    >
                                        {hour}
                                    </Button>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* Step 3: Time Slot Selection */}
                    {selectedHour && (
                        <Box>
                            <HStack mb={2} justify="space-between" align="center">
                                <Text fontWeight="medium">3. Select Time</Text>
                                {selectedTimeSlot && (
                                    <Badge colorScheme="green">{selectedTimeSlot}</Badge>
                                )}
                            </HStack>
                            <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                                {getAvailableTimeSlots(selectedHour).map((slot) => (
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
                            Business hours: 9:00 AM - 4:00 PM (Closed 12:00 PM - 1:00 PM for lunch)
                        </Text>
                    </HStack>
                </VStack>
            </VStack>
        </Box>
    );
}; 