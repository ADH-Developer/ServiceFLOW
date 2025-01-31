import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import apiClient from '../../lib/api-client';

interface ServiceRequest {
    id: number;
    status: string;
    description: string;
    vehicle: {
        make: string;
        model: string;
        year: number;
        vin: string;
    };
    service_type: string;
    preferred_date: string;
}

describe('API Integration Tests', () => {
    beforeAll(() => {
        // Configure API client for integration tests
        process.env.NEXT_PUBLIC_API_URL = 'http://server:8000';
    });

    beforeEach(() => {
        localStorage.clear();
    });

    afterAll(() => {
        localStorage.clear();
    });

    describe('Service Request Flow', () => {
        test('complete service request flow', async () => {
            // 1. Register a new user
            const registrationData = {
                email: `test_${Date.now()}@example.com`,
                password: 'TestPass123!',
                first_name: 'Test',
                last_name: 'User',
                phone_number: '1234567890'
            };

            const registrationResponse = await apiClient.register(registrationData);
            expect(registrationResponse).toHaveProperty('id');
            expect(registrationResponse.email).toBe(registrationData.email);

            // 2. Login with the new user
            const loginResponse = await apiClient.login({
                email: registrationData.email,
                password: registrationData.password
            });
            expect(loginResponse).toHaveProperty('access');
            expect(loginResponse).toHaveProperty('refresh');

            // 3. Create a service request
            const serviceRequestData = {
                vehicle: {
                    make: 'Toyota',
                    model: 'Camry',
                    year: 2020,
                    vin: 'TEST1234567890'
                },
                service_type: 'maintenance',
                description: 'Regular maintenance check',
                preferred_date: new Date().toISOString().split('T')[0]
            };

            const createResponse = await apiClient.post('/api/customers/service-requests/', serviceRequestData);
            expect(createResponse.status).toBe(201);
            expect(createResponse.data).toHaveProperty('id');
            const serviceRequestId = createResponse.data.id;

            // 4. Get service request details
            const getResponse = await apiClient.get(`/api/customers/service-requests/${serviceRequestId}/`);
            expect(getResponse.status).toBe(200);
            expect(getResponse.data.id).toBe(serviceRequestId);
            expect(getResponse.data.status).toBe('pending');

            // 5. Update service request
            const updateData = {
                description: 'Updated maintenance check description'
            };
            const updateResponse = await apiClient.patch(
                `/api/customers/service-requests/${serviceRequestId}/`,
                updateData
            );
            expect(updateResponse.status).toBe(200);
            expect(updateResponse.data.description).toBe(updateData.description);

            // 6. List all service requests
            const listResponse = await apiClient.get('/api/customers/service-requests/');
            expect(listResponse.status).toBe(200);
            expect(Array.isArray(listResponse.data)).toBe(true);
            expect(listResponse.data.some((req: ServiceRequest) => req.id === serviceRequestId)).toBe(true);
        }, 30000);
    });

    describe('Workflow State Management', () => {
        let authToken: string;
        let serviceRequestId: number;

        beforeEach(async () => {
            // Login as admin
            const loginResponse = await apiClient.login({
                email: 'admin@example.com',
                password: 'adminpass123'
            });
            authToken = loginResponse.access;
            localStorage.setItem('accessToken', authToken);

            // Create a test service request
            const createResponse = await apiClient.post('/api/customers/service-requests/', {
                vehicle: {
                    make: 'Honda',
                    model: 'Civic',
                    year: 2021,
                    vin: 'TEST9876543210'
                },
                service_type: 'repair',
                description: 'Test repair request',
                preferred_date: new Date().toISOString().split('T')[0]
            });
            serviceRequestId = createResponse.data.id;
        });

        test('workflow state transitions', async () => {
            // 1. Get initial workflow state
            const initialState = await apiClient.get(`/api/customers/admin/workflow/states/${serviceRequestId}/`);
            expect(initialState.status).toBe(200);
            expect(initialState.data.current_state).toBe('pending');

            // 2. Transition to in_progress
            const transitionResponse = await apiClient.post(
                `/api/customers/admin/workflow/states/${serviceRequestId}/transition/`,
                { action: 'start' }
            );
            expect(transitionResponse.status).toBe(200);
            expect(transitionResponse.data.current_state).toBe('in_progress');

            // 3. Add a note
            const noteResponse = await apiClient.post(
                `/api/customers/admin/workflow/states/${serviceRequestId}/notes/`,
                { content: 'Work started on vehicle' }
            );
            expect(noteResponse.status).toBe(201);
            expect(noteResponse.data.content).toBe('Work started on vehicle');

            // 4. Complete the service
            const completeResponse = await apiClient.post(
                `/api/customers/admin/workflow/states/${serviceRequestId}/transition/`,
                { action: 'complete' }
            );
            expect(completeResponse.status).toBe(200);
            expect(completeResponse.data.current_state).toBe('completed');

            // 5. Verify workflow history
            const historyResponse = await apiClient.get(
                `/api/customers/admin/workflow/states/${serviceRequestId}/history/`
            );
            expect(historyResponse.status).toBe(200);
            expect(Array.isArray(historyResponse.data)).toBe(true);
            expect(historyResponse.data.length).toBeGreaterThanOrEqual(3); // Initial, start, complete
        }, 30000);
    });
}); 