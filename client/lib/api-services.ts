import apiClient from './api-client';
import type { ServiceRequest } from '../types/service-request';
import type { RegisterInput } from './validations/auth';

export const serviceRequestsApi = {
    create: async (data: ServiceRequest & {
        appointment_date: string;
        appointment_time: string;
    }) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication required');
            }

            if (token === 'undefined' || token === 'null') {
                localStorage.removeItem('authToken');
                throw new Error('Invalid authentication token');
            }

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
                appointment_date: data.appointment_date,
                appointment_time: data.appointment_time
            };

            console.log('Token being sent:', token);
            const response = await apiClient.post('/api/customers/service-requests/', formattedData);
            return response.data;
        } catch (error: any) {
            console.error('Service request creation error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                token: localStorage.getItem('authToken')
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
    },

    login: async (credentials: { email: string; password: string }) => {
        try {
            console.log('Attempting login with:', { email: credentials.email });
            const response = await apiClient.post('/api/customers/login/', credentials);

            console.log('Login response:', response.data);

            // The token is nested inside response.data.data.token
            if (response.data?.data?.token) {
                localStorage.setItem('authToken', response.data.data.token);
                return {
                    ...response.data.data,
                    token: response.data.data.token
                };
            } else {
                console.error('No token received in login response');
                throw new Error('Invalid response from server');
            }

        } catch (error: any) {
            console.error('Login error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    }
};