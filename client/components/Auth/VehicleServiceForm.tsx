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
import { Vehicle, Service } from '../../types';

type VehicleFormData = Pick<Vehicle, 'year' | 'make' | 'model'>;
type ServiceFormData = Pick<Service, 'service_type' | 'description' | 'urgency'>;

interface NewServiceRequest {
    vehicle: VehicleFormData;
    services: ServiceFormData[];
    status: 'estimates';
    workflow_column: 'estimates';
    workflow_position: number;
}

interface VehicleServiceFormProps {
    onSubmit: (data: NewServiceRequest) => void;
}

interface UrgencyOption {
    value: Service['urgency'];
    label: string;
    description: string;
    color: string;
}

interface FormData {
    vehicle: VehicleFormData;
    services: ServiceFormData[];
}

export const VehicleServiceForm = ({ onSubmit }: VehicleServiceFormProps) => {
    const [formData, setFormData] = useState<FormData>({
        vehicle: {
            year: '',
            make: '',
            model: ''
        },
        services: [{
            service_type: '',
            description: '',
            urgency: 'low'
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
                service_type: '',
                description: '',
                urgency: 'low'
            }]
        });
    };

    const updateService = (index: number, field: keyof Service, value: string) => {
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
            if (!service.service_type) newErrors[`service${index}Type`] = 'Service type is required';
            if (!service.description) newErrors[`service${index}Description`] = 'Description is required';
            if (!service.urgency) newErrors[`service${index}Urgency`] = 'Urgency level is required';
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Ensure all required fields are present before submitting
        if (formData.vehicle.year && formData.vehicle.make && formData.vehicle.model) {
            onSubmit({
                vehicle: {
                    year: formData.vehicle.year,
                    make: formData.vehicle.make,
                    model: formData.vehicle.model
                },
                services: formData.services.map(service => ({
                    service_type: service.service_type || '',
                    description: service.description || '',
                    urgency: service.urgency || 'low'
                })),
                status: 'estimates',
                workflow_column: 'estimates',
                workflow_position: 0
            });
        }
    };

    // Update vehicle field handler
    const updateVehicle = (field: keyof Vehicle, value: string) => {
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
                                        value={service.service_type}
                                        onChange={(e) => updateService(index, 'service_type', e.target.value)}
                                    >
                                        {serviceTypes.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </Select>
                                    <FormErrorMessage>{errors[`service${index}Type`]}</FormErrorMessage>
                                </FormControl>

                                <FormControl isInvalid={!!errors[`service${index}Description`]}>
                                    <FormLabel>Description</FormLabel>
                                    <Textarea
                                        value={service.description}
                                        onChange={(e) => updateService(index, 'description', e.target.value)}
                                        placeholder="Please describe the issue or service needed"
                                    />
                                    <FormErrorMessage>{errors[`service${index}Description`]}</FormErrorMessage>
                                </FormControl>

                                <FormControl isInvalid={!!errors[`service${index}Urgency`]}>
                                    <FormLabel>Urgency Level</FormLabel>
                                    <RadioGroup
                                        value={service.urgency}
                                        onChange={(value) => updateService(index, 'urgency', value)}
                                    >
                                        <VStack align="start" spacing={2}>
                                            {urgencyOptions.map((option) => (
                                                <Tooltip
                                                    key={option.value}
                                                    label={option.description}
                                                    placement="right"
                                                >
                                                    <Radio value={option.value}>
                                                        <HStack>
                                                            <Text color={option.color}>{option.label}</Text>
                                                        </HStack>
                                                    </Radio>
                                                </Tooltip>
                                            ))}
                                        </VStack>
                                    </RadioGroup>
                                    <FormErrorMessage>{errors[`service${index}Urgency`]}</FormErrorMessage>
                                </FormControl>
                            </VStack>
                        </GridItem>
                    ))}

                    <GridItem colSpan={2}>
                        <Button onClick={handleAddService} width="full">
                            Add Another Service
                        </Button>
                    </GridItem>

                    <GridItem colSpan={2}>
                        <Button
                            type="submit"
                            colorScheme="blue"
                            size="lg"
                            width="full"
                        >
                            Submit Service Request
                        </Button>
                    </GridItem>
                </Grid>
            </VStack>
        </Box>
    );
}; 