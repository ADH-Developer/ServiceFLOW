import { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    VStack,
    Textarea,
    Select,
    Heading,
    FormErrorMessage,
    Divider
} from '@chakra-ui/react';

interface ServiceRequest {
    serviceType: string;
    description: string;
    urgency: string;
}

interface ServiceFormProps {
    onSubmit: (serviceData: ServiceRequest[]) => void;
}

export const ServiceForm = ({ onSubmit }: ServiceFormProps) => {
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([{
        serviceType: '',
        description: '',
        urgency: ''
    }]);
    const [errors, setErrors] = useState<Record<string, string>[]>([{}]);

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

    const handleAddRequest = () => {
        setServiceRequests([...serviceRequests, {
            serviceType: '',
            description: '',
            urgency: ''
        }]);
        setErrors([...errors, {}]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation for all requests
        const newErrors: Record<string, string>[] = serviceRequests.map(request => {
            const requestErrors: Record<string, string> = {};
            if (!request.serviceType) requestErrors.serviceType = 'Service type is required';
            if (!request.description) requestErrors.description = 'Description is required';
            if (!request.urgency) requestErrors.urgency = 'Urgency level is required';
            return requestErrors;
        });

        if (newErrors.some(error => Object.keys(error).length > 0)) {
            setErrors(newErrors);
            return;
        }

        onSubmit(serviceRequests);
    };

    const updateServiceRequest = (index: number, field: keyof ServiceRequest, value: string) => {
        const updatedRequests = [...serviceRequests];
        updatedRequests[index] = {
            ...updatedRequests[index],
            [field]: value
        };
        setServiceRequests(updatedRequests);
    };

    return (
        <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg">
            <VStack spacing={4} as="form" onSubmit={handleSubmit}>
                <Heading size="md">Service Request</Heading>

                {serviceRequests.map((request, index) => (
                    <VStack key={index} width="100%" spacing={4}>
                        {index > 0 && <Divider />}

                        <FormControl isInvalid={!!errors[index]?.serviceType}>
                            <FormLabel>Service Type</FormLabel>
                            <Select
                                placeholder="Select service type"
                                value={request.serviceType}
                                onChange={(e) => updateServiceRequest(index, 'serviceType', e.target.value)}
                            >
                                {serviceTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </Select>
                            <FormErrorMessage>{errors[index]?.serviceType}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors[index]?.description}>
                            <FormLabel>Description of Problem</FormLabel>
                            <Textarea
                                placeholder="Please describe the issue you're experiencing..."
                                value={request.description}
                                onChange={(e) => updateServiceRequest(index, 'description', e.target.value)}
                            />
                            <FormErrorMessage>{errors[index]?.description}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors[index]?.urgency}>
                            <FormLabel>Urgency Level</FormLabel>
                            <Select
                                placeholder="Select urgency level"
                                value={request.urgency}
                                onChange={(e) => updateServiceRequest(index, 'urgency', e.target.value)}
                            >
                                <option value="low">Low - No immediate concern</option>
                                <option value="medium">Medium - Should be addressed soon</option>
                                <option value="high">High - Needs immediate attention</option>
                            </Select>
                            <FormErrorMessage>{errors[index]?.urgency}</FormErrorMessage>
                        </FormControl>
                    </VStack>
                ))}

                <Button
                    type="button"
                    colorScheme="primary"
                    variant="outline"
                    width="full"
                    onClick={handleAddRequest}
                >
                    Add Service Request
                </Button>

                <Button
                    type="submit"
                    colorScheme="primary"
                    width="full"
                >
                    Submit Request{serviceRequests.length > 1 ? 's' : ''}
                </Button>
            </VStack>
        </Box>
    );
}; 