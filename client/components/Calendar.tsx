import React from 'react';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Box, useColorModeValue } from '@chakra-ui/react';
import { addDays } from 'date-fns';

interface CalendarProps {
    value: Date | null;
    onChange: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ value, onChange }) => {
    const calendarBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    return (
        <Box
            className="custom-datepicker-wrapper"
            bg={calendarBg}
            borderRadius="md"
            p={2}
            borderWidth="1px"
            borderColor={borderColor}
        >
            <ReactDatePicker
                selected={value}
                onChange={onChange}
                minDate={new Date()}
                maxDate={addDays(new Date(), 30)}
                dateFormat="MMMM d, yyyy"
                inline
                calendarClassName="custom-calendar"
            />
        </Box>
    );
}; 