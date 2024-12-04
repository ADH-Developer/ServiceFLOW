import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    VStack,
    Select,
    Heading,
    FormErrorMessage
} from '@chakra-ui/react';

interface VehicleFormProps {
    onSubmit: (vehicleData: {
        year: string;
        make: string;
        model: string;
    }) => void;
}

export const VehicleForm = ({ onSubmit }: VehicleFormProps) => {
    const [formData, setFormData] = useState({
        year: '',
        make: '',
        model: ''
    });
    const [availableMakes, setAvailableMakes] = useState<string[]>([]);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Generate years (20 years from current year)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, i) => (currentYear - 20 + i).toString());

    // Fetch makes when year changes
    useEffect(() => {
        if (formData.year) {
            // TODO: Replace with actual API call
            // For now, using placeholder data
            setAvailableMakes([
                'Toyota',
                'Honda',
                'Ford',
                'Chevrolet',
                'Nissan'
            ]);
        }
    }, [formData.year]);

    // Fetch models when make changes
    useEffect(() => {
        if (formData.make) {
            // TODO: Replace with actual API call
            // For now, using placeholder data
            setAvailableModels([
                'Model 1',
                'Model 2',
                'Model 3'
            ]);
        }
    }, [formData.make]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        const newErrors: Record<string, string> = {};
        if (!formData.year) newErrors.year = 'Year is required';
        if (!formData.make) newErrors.make = 'Make is required';
        if (!formData.model) newErrors.model = 'Model is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(formData);
    };

    return (
        <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg">
            <VStack spacing={4} as="form" onSubmit={handleSubmit}>
                <Heading size="md">Vehicle Information</Heading>

                <FormControl isInvalid={!!errors.year}>
                    <FormLabel>Year</FormLabel>
                    <Select
                        placeholder="Select year"
                        value={formData.year}
                        onChange={(e) => setFormData({
                            ...formData,
                            year: e.target.value,
                            make: '',
                            model: ''
                        })}
                    >
                        {years.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </Select>
                    <FormErrorMessage>{errors.year}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.make}>
                    <FormLabel>Make</FormLabel>
                    <Select
                        placeholder="Select make"
                        value={formData.make}
                        onChange={(e) => setFormData({
                            ...formData,
                            make: e.target.value,
                            model: ''
                        })}
                        isDisabled={!formData.year}
                    >
                        {availableMakes.map((make) => (
                            <option key={make} value={make}>
                                {make}
                            </option>
                        ))}
                    </Select>
                    <FormErrorMessage>{errors.make}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.model}>
                    <FormLabel>Model</FormLabel>
                    <Select
                        placeholder="Select model"
                        value={formData.model}
                        onChange={(e) => setFormData({
                            ...formData,
                            model: e.target.value
                        })}
                        isDisabled={!formData.make}
                    >
                        {availableModels.map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </Select>
                    <FormErrorMessage>{errors.model}</FormErrorMessage>
                </FormControl>

                <Button
                    type="submit"
                    colorScheme="primary"
                    width="full"
                >
                    Next
                </Button>
            </VStack>
        </Box>
    );
}; 