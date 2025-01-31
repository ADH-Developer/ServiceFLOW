import { ApiClient } from '../../src/services/apiClient';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Connectivity Tests', () => {
    let apiClient: ApiClient;

    beforeEach(() => {
        apiClient = new ApiClient();
        localStorage.clear();
        jest.clearAllMocks();
    });

    describe('CORS Configuration', () => {
        beforeEach(() => {
            mockedAxios.options.mockResolvedValue({
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-credentials': 'true',
                    'access-control-allow-methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
                },
                status: 200,
            });

            mockedAxios.get.mockResolvedValue({
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-credentials': 'true',
                },
                status: 200,
                data: { message: 'Success' },
            });
        });

        test('should handle preflight requests', async () => {
            const response = await apiClient.options('/api/customers/health-check/');
            expect(response.headers['access-control-allow-origin']).toBeDefined();
            expect(response.headers['access-control-allow-credentials']).toBe('true');
        });

        test('should pass CORS configuration test with credentials', async () => {
            const response = await apiClient.get('/api/customers/health-check/', {
                withCredentials: true
            });
            expect(response.headers['access-control-allow-origin']).toBeDefined();
            expect(response.headers['access-control-allow-credentials']).toBe('true');
        });

        test('should handle CORS headers in response', async () => {
            const response = await apiClient.get('/api/customers/health-check/');
            expect(response.headers['access-control-allow-origin']).toBeDefined();
            expect(response.headers['access-control-allow-credentials']).toBe('true');
        });

        test('should handle custom headers in CORS', async () => {
            const response = await apiClient.get('/api/customers/health-check/', {
                headers: {
                    'X-Custom-Header': 'test'
                }
            });
            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });
    });

    test('should pass authentication flow test', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token'
            },
            status: 200
        });

        const response = await apiClient.post('/api/customers/login/', {
            email: 'test@example.com',
            password: 'password123'
        });

        expect(response.status).toBe(200);
        expect(response.data.accessToken).toBeDefined();
        expect(response.data.refreshToken).toBeDefined();
    });

    test('should handle non-existent endpoints correctly', async () => {
        mockedAxios.get.mockRejectedValueOnce({
            response: {
                status: 404,
                data: { message: 'Not Found' }
            }
        });

        try {
            await apiClient.get('/api/non-existent-endpoint/');
            throw new Error('Should have thrown an error');
        } catch (error: any) {
            expect(error.response.status).toBe(404);
        }
    });

    test('should handle token refresh', async () => {
        localStorage.setItem('accessToken', 'expired-token');
        localStorage.setItem('refreshToken', 'valid-refresh-token');

        // Mock the refresh token request
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token'
            },
            status: 200
        });

        // Mock the actual request that triggers the refresh
        mockedAxios.get.mockRejectedValueOnce({
            response: { status: 401 }
        }).mockResolvedValueOnce({
            data: { message: 'Success' },
            status: 200
        });

        const response = await apiClient.get('/api/protected-endpoint/');
        expect(response.status).toBe(200);
        expect(localStorage.getItem('accessToken')).toBe('new-access-token');
    });
}); 