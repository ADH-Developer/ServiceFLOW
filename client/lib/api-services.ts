import apiClient from './api-client';
import type { ServiceRequest } from '../types/service-request';
import type { RegisterInput } from './validations/auth';
import { format } from 'date-fns-tz'

export const serviceRequestsApi = {
    create: async (data: ServiceRequest & {
        appointment_date: string;
        appointment_time: string;
    }) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('Authentication required');
            }

            if (token === 'undefined' || token === 'null') {
                localStorage.removeItem('accessToken');
                throw new Error('Invalid authentication token');
            }

            const [timeStr, period] = data.appointment_time.split(' ');
            const [hours, minutes] = timeStr.split(':').map(Number);
            let hour24 = hours;

            if (period.toUpperCase() === 'PM' && hours !== 12) {
                hour24 += 12;
            } else if (period.toUpperCase() === 'AM' && hours === 12) {
                hour24 = 0;
            }

            const formattedTime = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            console.log('Formatted time for backend:', formattedTime);

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
                appointment_time: formattedTime
            };

            console.log('Sending appointment data:', {
                date: formattedData.appointment_date,
                time: formattedData.appointment_time
            });

            const response = await apiClient.post('/api/customers/service-requests/', formattedData);
            return response.data;
        } catch (error: any) {
            console.error('Service request creation error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                token: localStorage.getItem('accessToken')
            });
            throw error;
        }
    }
};

export const customersApi = {
    register: async (data: RegisterInput) => {
        try {
            const formattedData = {
                user: {
                    first_name: data.user.first_name,
                    last_name: data.user.last_name,
                    email: data.user.email,
                    password: data.user.password
                },
                phone: data.phone,
                preferred_contact: data.preferred_contact,
                vehicles: []
            };

            console.log('Formatted registration data:', formattedData);

            const response = await apiClient.post('/api/customers/register/', formattedData);
            console.log('Registration response:', response.data);

            if (response.data.token) {
                localStorage.setItem('accessToken', response.data.token.access);
                localStorage.setItem('refreshToken', response.data.token.refresh);
            }

            return response.data;
        } catch (error) {
            console.error('Registration error in API service:', error);
            throw error;
        }
    },

    login: async (credentials: { email: string; password: string }) => {
        try {
            console.log('Attempting login with:', credentials.email);
            const response = await apiClient.post('/api/customers/login/', credentials);
            console.log('Login response:', response.data);
            return response;
        } catch (error: any) {
            console.error('Login error:', error.response?.data || error);
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
    }
};

export const workflowApi = {
    getBoardState: async () => {
        const response = await apiClient.get('/api/customers/workflow/');
        return response.data;
    },

    moveCard: async (cardId: string | number, toColumn: string, position: number) => {
        const response = await apiClient.post(`/api/customers/workflow/${cardId}/move_card/`, {
            to_column: toColumn,
            position: position,
        });
        return response.data;
    },

    getComments: async (cardId: string | number) => {
        const response = await apiClient.get(`/api/customers/workflow/${cardId}/comments/`);
        return response.data;
    },

    addComment: async (cardId: string | number, text: string) => {
        const response = await apiClient.post(`/api/customers/workflow/${cardId}/comments/`, {
            text,
        });
        return response.data;
    },

    deleteComment: async (cardId: string | number, commentId: number) => {
        const response = await apiClient.delete(
            `/api/customers/workflow/${cardId}/comments/${commentId}/`
        );
        return response.data;
    },

    addLabel: async (cardId: string | number, label: string) => {
        const response = await apiClient.post(`/api/customers/workflow/${cardId}/labels/`, {
            label,
        });
        return response.data;
    },

    removeLabel: async (cardId: string | number, label: string) => {
        const response = await apiClient.delete(
            `/api/customers/workflow/${cardId}/labels/${label}/`
        );
        return response.data;
    }
};

export const appointmentsApi = {
    getPendingCount: async () => {
        const response = await apiClient.get('/api/customers/service-requests/pending/count/');
        return response.data;
    },

    getTodayAppointments: async () => {
        const response = await apiClient.get('/api/customers/service-requests/today/');
        return response.data;
    },

    getBusinessHours: async () => {
        const response = await apiClient.get('/api/customers/service-requests/business-hours/');
        return response.data;
    },

    getAvailableSlots: async (date: string) => {
        const response = await apiClient.get(`/api/customers/service-requests/available_slots/?date=${date}`);
        return response.data;
    }
};