/// <reference types="jest" />
import axios from 'axios';
import { customersApi, workflowApi, appointmentsApi } from '../lib/api-services';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Connectivity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        // Set up a mock token for authenticated requests
        localStorage.setItem('accessToken', 'mock-token');
    });

    describe('CORS Configuration', () => {
        it('should include credentials in requests', async () => {
            const mockResponse = { data: { success: true } };
            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const loginData = { email: 'test@example.com', password: 'password123' };
            await customersApi.login(loginData);

            // Verify credentials were included
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/customers/login/',
                loginData,
                expect.objectContaining({
                    withCredentials: true
                })
            );
        });

        it('should handle CORS preflight responses', async () => {
            const mockResponse = { data: { success: true } };
            mockedAxios.options.mockResolvedValueOnce(mockResponse);

            // Simulate a preflight request
            await axios.options('/api/test-cors/');

            expect(mockedAxios.options).toHaveBeenCalledWith(
                '/api/test-cors/',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Access-Control-Request-Method': 'GET'
                    })
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

            await expect(appointmentsApi.getTodayAppointments()).rejects.toThrow('Network Error');
        });

        it('should handle API errors with proper status codes', async () => {
            const errorResponse = {
                response: {
                    status: 404,
                    data: { detail: 'Not found' }
                }
            };
            mockedAxios.get.mockRejectedValueOnce(errorResponse);

            await expect(appointmentsApi.getTodayAppointments()).rejects.toThrow('Not found');
        });

        it('should handle rate limiting', async () => {
            const rateLimitResponse = {
                response: {
                    status: 429,
                    data: { detail: 'Too many requests' }
                }
            };
            mockedAxios.get.mockRejectedValueOnce(rateLimitResponse);

            await expect(appointmentsApi.getTodayAppointments()).rejects.toThrow('Too many requests');
        });
    });

    describe('Authentication Headers', () => {
        it('should include auth token in requests', async () => {
            const mockResponse = { data: { appointments: [] } };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await appointmentsApi.getTodayAppointments();

            expect(mockedAxios.get).toHaveBeenCalledWith(
                '/api/customers/service-requests/today/',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer mock-token'
                    })
                })
            );
        });

        it('should handle expired tokens', async () => {
            const expiredTokenResponse = {
                response: {
                    status: 401,
                    data: { detail: 'Token has expired' }
                }
            };
            mockedAxios.get.mockRejectedValueOnce(expiredTokenResponse);

            await expect(appointmentsApi.getTodayAppointments()).rejects.toThrow('Token has expired');
        });
    });

    describe('Real-time Updates', () => {
        it('should establish WebSocket connection', () => {
            // Mock WebSocket
            const mockWebSocket = {
                send: jest.fn(),
                close: jest.fn()
            };
            global.WebSocket = jest.fn(() => mockWebSocket) as any;

            // Test WebSocket connection
            const ws = new WebSocket('ws://localhost:8000/ws/');
            expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8000/ws/');
        });

        it('should handle WebSocket connection errors', () => {
            // Mock WebSocket with error
            const mockWebSocket = {
                send: jest.fn(),
                close: jest.fn(),
                onerror: null as any
            };
            global.WebSocket = jest.fn(() => mockWebSocket) as any;

            // Create WebSocket and simulate error
            const ws = new WebSocket('ws://localhost:8000/ws/');
            const errorHandler = jest.fn();
            ws.onerror = errorHandler;

            // Simulate error event
            mockWebSocket.onerror({ error: new Error('WebSocket error') });

            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe('API Endpoints', () => {
        it('should access workflow endpoints', async () => {
            const mockResponse = { data: { columns: {} } };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await workflowApi.getBoardState();

            expect(mockedAxios.get).toHaveBeenCalledWith(
                '/workflow/board/',
                expect.any(Object)
            );
        });

        it('should access appointment endpoints', async () => {
            const mockResponse = { data: { appointments: [] } };
            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await appointmentsApi.getTodayAppointments();

            expect(mockedAxios.get).toHaveBeenCalledWith(
                '/api/customers/service-requests/today/',
                expect.any(Object)
            );
        });
    });
}); 