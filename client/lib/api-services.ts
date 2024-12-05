import apiClient from './api-client';
import type { ServiceRequest } from '../types/service-request';
import type { RegisterInput } from './validations/auth';

export const serviceRequestsApi = {
    create: async (data: ServiceRequest & {
        appointment_date: string;
        appointment_time: string;
    }) => {
        try {
            // Format the date to YYYY-MM-DD
            const appointmentDate = new Date(data.appointment_date);
            const formattedDate = appointmentDate.toISOString().split('T')[0];

            // Format the data to match the backend expectations
            const formattedData = {
                vehicle: {
                    make: data.vehicle.make,
                    model: data.vehicle.model,
                    year: parseInt(data.vehicle.year)
                },
                services: data.services.map(service => ({
                    service_type: service.serviceType,
                    description: service.description,
                    urgency: service.urgency.toLowerCase()
                })),
                appointment_date: formattedDate,
                appointment_time: data.appointment_time
            };

            console.log('Sending service request data:', JSON.stringify(formattedData, null, 2));

            const token = localStorage.getItem('authToken');
            console.log('Auth token:', token ? 'Present' : 'Missing');

            const response = await apiClient.post('/api/customers/service-requests/', formattedData);
            return response.data;
        } catch (error: any) {
            console.error('Service request creation error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers
            });
            throw error;
        }
    }
};

export const customersApi = {
    register: async (data: RegisterInput) => {
        try {
            // Format the data to match the backend expectations
            const formattedData = {
                user: {
                    first_name: data.user.first_name,
                    last_name: data.user.last_name,
                    email: data.user.email,
                    password: data.user.password
                },
                phone: data.phone,
                preferred_contact: data.preferred_contact
            };

            const response = await apiClient.post('/api/customers/register/', formattedData);

            // Store the token
            if (response.data.token) {
                localStorage.setItem('authToken', response.data.token);
            }

            return response.data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }
};