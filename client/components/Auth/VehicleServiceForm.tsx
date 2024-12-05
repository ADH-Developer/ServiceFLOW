import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    VStack,
    Select,
    Heading,
    FormErrorMessage,
    Textarea,
    Divider,
    Grid,
    GridItem,
    RadioGroup,
    Radio,
    Tooltip,
    HStack,
    Text,
} from '@chakra-ui/react';
import type { ServiceRequest } from '../../types/service-request';

interface VehicleServiceFormProps {
    onSubmit: (data: ServiceRequest) => void;
}

interface UrgencyOption {
    value: string;
    label: string;
    description: string;
    color: string;
}

export const VehicleServiceForm = ({ onSubmit }: VehicleServiceFormProps) => {
    const [formData, setFormData] = useState<ServiceRequest>({
        vehicle: {
            year: '',
            make: '',
            model: ''
        },
        services: [{
            serviceType: '',
            description: '',
            urgency: ''
        }]
    });

    const [availableMakes, setAvailableMakes] = useState<string[]>([]);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Generate years (20 years from current year)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, i) => (currentYear - 20 + i).toString());

    const serviceTypes = [
        'Oil Change',
        'Brake Service',
        'Tire Service',
        'Engine Repair',
        'Transmission',
        'Electrical',
        'General Maintenance',
        'Other'
    ];

    const urgencyOptions: UrgencyOption[] = [
        {
            value: 'low',
            label: 'Low',
            description: 'No immediate concern - Can be addressed during regular maintenance',
            color: 'green.500'
        },
        {
            value: 'medium',
            label: 'Medium',
            description: 'Should be addressed soon - May lead to bigger issues if ignored',
            color: 'orange.500'
        },
        {
            value: 'high',
            label: 'High',
            description: 'Needs immediate attention - Safety or major mechanical concern',
            color: 'red.500'
        }
    ];

    // Fetch makes when year changes
    useEffect(() => {
        if (formData.vehicle.year) {
            // TODO: Replace with actual API call
            setAvailableMakes([
                'Toyota',
                'Honda',
                'Ford',
                'Chevrolet',
                'Nissan'
            ]);
        }
    }, [formData.vehicle.year]);

    // Fetch models when make changes
    useEffect(() => {
        if (formData.vehicle.make) {
            // TODO: Replace with actual API call
            setAvailableModels([
                'Model 1',
                'Model 2',
                'Model 3'
            ]);
        }
    }, [formData.vehicle.make]);

    const handleAddService = () => {
        setFormData({
            ...formData,
            services: [...formData.services, {
                serviceType: '',
                description: '',
                urgency: ''
            }]
        });
    };

    const updateService = (index: number, field: keyof ServiceRequest['services'][0], value: string) => {
        const updatedServices = [...formData.services];
        updatedServices[index] = {
            ...updatedServices[index],
            [field]: value
        };
        setFormData({
            ...formData,
            services: updatedServices
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        const newErrors: Record<string, string> = {};
        if (!formData.vehicle.year) newErrors.year = 'Year is required';
        if (!formData.vehicle.make) newErrors.make = 'Make is required';
        if (!formData.vehicle.model) newErrors.model = 'Model is required';

        formData.services.forEach((service, index) => {
            if (!service.serviceType) newErrors[`service${index}Type`] = 'Service type is required';
            if (!service.description) newErrors[`service${index}Description`] = 'Description is required';
            if (!service.urgency) newErrors[`service${index}Urgency`] = 'Urgency level is required';
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(formData);
    };

    // Update vehicle field handler
    const updateVehicle = (field: keyof ServiceRequest['vehicle'], value: string) => {
        setFormData({
            ...formData,
            vehicle: {
                ...formData.vehicle,
                [field]: value,
                // Only reset dependent fields when changing year or make
                ...(field === 'year' ? { make: '', model: '' } : {}),
                ...(field === 'make' ? { model: '' } : {})
            }
        });
    };

    return (
        <Box p={8} maxWidth="800px" borderWidth={1} borderRadius="lg">
            <VStack spacing={6} as="form" onSubmit={handleSubmit}>
                <Grid templateColumns="repeat(2, 1fr)" gap={6} width="100%">
                    <GridItem colSpan={2}>
                        <Heading size="md">Vehicle Information</Heading>
                    </GridItem>

                    <GridItem>
                        <FormControl isInvalid={!!errors.year}>
                            <FormLabel>Year</FormLabel>
                            <Select
                                placeholder="Select year"
                                value={formData.vehicle.year}
                                onChange={(e) => updateVehicle('year', e.target.value)}
                            >
                                {years.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </Select>
                            <FormErrorMessage>{errors.year}</FormErrorMessage>
                        </FormControl>
                    </GridItem>

                    <GridItem>
                        <FormControl isInvalid={!!errors.make}>
                            <FormLabel>Make</FormLabel>
                            <Select
                                placeholder="Select make"
                                value={formData.vehicle.make}
                                onChange={(e) => updateVehicle('make', e.target.value)}
                                isDisabled={!formData.vehicle.year}
                            >
                                {availableMakes.map((make) => (
                                    <option key={make} value={make}>{make}</option>
                                ))}
                            </Select>
                            <FormErrorMessage>{errors.make}</FormErrorMessage>
                        </FormControl>
                    </GridItem>

                    <GridItem colSpan={2}>
                        <FormControl isInvalid={!!errors.model}>
                            <FormLabel>Model</FormLabel>
                            <Select
                                placeholder="Select model"
                                value={formData.vehicle.model}
                                onChange={(e) => updateVehicle('model', e.target.value)}
                                isDisabled={!formData.vehicle.make}
                            >
                                {availableModels.map((model) => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </Select>
                            <FormErrorMessage>{errors.model}</FormErrorMessage>
                        </FormControl>
                    </GridItem>

                    <GridItem colSpan={2}>
                        <Divider my={4} />
                        <Heading size="md" mb={4}>Service Requests</Heading>
                    </GridItem>

                    {formData.services.map((service, index) => (
                        <GridItem key={index} colSpan={2}>
                            <VStack spacing={4} width="100%" p={4} borderWidth={1} borderRadius="md">
                                <Heading size="sm">Service Request {index + 1}</Heading>

                                <FormControl isInvalid={!!errors[`service${index}Type`]}>
                                    <FormLabel>Service Type</FormLabel>
                                    <Select
                                        placeholder="Select service type"
                                        value={service.serviceType}
                                        onChange={(e) => updateService(index, 'serviceType', e.target.value)}
                                    >
                                        {serviceTypes.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </Select>
                                    <FormErrorMessage>{errors[`service${index}Type`]}</FormErrorMessage>
                                </FormControl>

                                <FormControl isInvalid={!!errors[`service${index}Description`]}>
                                    <FormLabel>Description of Problem</FormLabel>
                                    <Textarea
                                        placeholder="Please describe the issue you're experiencing..."
                                        value={service.description}
                                        onChange={(e) => updateService(index, 'description', e.target.value)}
                                    />
                                    <FormErrorMessage>{errors[`service${index}Description`]}</FormErrorMessage>
                                </FormControl>

                                <FormControl isInvalid={!!errors[`service${index}Urgency`]}>
                                    <FormLabel>Urgency Level</FormLabel>
                                    <RadioGroup
                                        value={service.urgency}
                                        onChange={(value) => updateService(index, 'urgency', value)}
                                    >
                                        <HStack spacing={4} width="100%">
                                            {urgencyOptions.map((option) => (
                                                <Tooltip
                                                    key={option.value}
                                                    label={option.description}
                                                    hasArrow
                                                    placement="top"
                                                >
                                                    <Box
                                                        as="label"
                                                        cursor="pointer"
                                                        borderWidth={1}
                                                        borderRadius="md"
                                                        p={3}
                                                        _hover={{
                                                            bg: `${option.color}50`,
                                                            borderColor: option.color
                                                        }}
                                                        borderColor={service.urgency === option.value ? option.color : 'gray.200'}
                                                        bg={service.urgency === option.value ? `${option.color}50` : 'transparent'}
                                                        transition="all 0.2s"
                                                        width="100%"
                                                    >
                                                        <Radio
                                                            value={option.value}
                                                            colorScheme={option.value === 'low' ? 'green' :
                                                                option.value === 'medium' ? 'orange' : 'red'}
                                                        >
                                                            <Text color={option.color} fontWeight="semibold">
                                                                {option.label}
                                                            </Text>
                                                        </Radio>
                                                    </Box>
                                                </Tooltip>
                                            ))}
                                        </HStack>
                                    </RadioGroup>
                                    <FormErrorMessage>{errors[`service${index}Urgency`]}</FormErrorMessage>
                                </FormControl>

                                {index > 0 && (
                                    <Button
                                        colorScheme="red"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const updatedServices = formData.services.filter((_, i) => i !== index);
                                            setFormData({
                                                ...formData,
                                                services: updatedServices
                                            });
                                        }}
                                    >
                                        Remove Service Request
                                    </Button>
                                )}
                            </VStack>
                        </GridItem>
                    ))}
                </Grid>

                <Button
                    type="button"
                    colorScheme="primary"
                    variant="outline"
                    width="full"
                    onClick={handleAddService}
                >
                    Add Another Service
                </Button>

                <Button
                    type="submit"
                    colorScheme="primary"
                    width="full"
                    onClick={onSubmit}
                >
                    Next
                </Button>
            </VStack>
        </Box>
    );
}; 