import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { ApiClient } from '../../src/services/apiClient';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Authentication Flow Tests', () => {
    let apiClient: ApiClient;

    beforeEach(() => {
        localStorage.clear();
        apiClient = new ApiClient();
    });

    describe('Registration Flow', () => {
        test('successful registration', async () => {
            const mockRegistrationData = {
                email: 'newuser@example.com',
                password: 'securepass123',
                firstName: 'New',
                lastName: 'User'
            };

            mockedAxios.post.mockResolvedValueOnce({
                data: { message: 'Registration successful' }
            });

            const response = await apiClient.register(mockRegistrationData);
            expect(response.message).toBe('Registration successful');
        }, 10000);

        test('registration with existing email', async () => {
            const mockRegistrationData = {
                email: 'existing@example.com',
                password: 'securepass123',
                firstName: 'Existing',
                lastName: 'User'
            };

            mockedAxios.post.mockRejectedValueOnce({
                response: {
                    data: { detail: 'Email already exists' },
                    status: 400
                }
            });

            try {
                await apiClient.register(mockRegistrationData);
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.detail).toBe('Email already exists');
            }
        }, 10000);

        test('registration with invalid data', async () => {
            const invalidData = {
                email: 'invalid@',
                password: 'securepass123',
                firstName: '',
                lastName: ''
            };

            mockedAxios.post.mockRejectedValueOnce({
                response: {
                    data: { detail: 'Invalid registration data' },
                    status: 400
                }
            });

            try {
                await apiClient.register(invalidData);
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.detail).toBe('Invalid registration data');
            }
        }, 10000);
    });

    describe('Login Flow', () => {
        test('successful login', async () => {
            const mockLoginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const mockResponse = {
                data: {
                    access_token: 'mock-access-token',
                    refresh_token: 'mock-refresh-token',
                    user: {
                        id: 1,
                        email: 'test@example.com'
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            await apiClient.login(mockLoginData);

            expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
            expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
            expect(localStorage.getItem('userData')).toBe(JSON.stringify(mockResponse.data.user));
        }, 10000);

        test('login with invalid credentials', async () => {
            const mockLoginData = {
                email: 'invalid@example.com',
                password: 'wrongpassword'
            };

            mockedAxios.post.mockRejectedValueOnce({
                response: {
                    data: { detail: 'Invalid credentials' },
                    status: 401
                }
            });

            try {
                await apiClient.login(mockLoginData);
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.detail).toBe('Invalid credentials');
            }
        }, 10000);

        test('login with inactive account', async () => {
            const mockLoginData = {
                email: 'inactive@example.com',
                password: 'password123'
            };

            mockedAxios.post.mockRejectedValueOnce({
                response: {
                    data: { detail: 'Account is inactive' },
                    status: 403
                }
            });

            try {
                await apiClient.login(mockLoginData);
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.detail).toBe('Account is inactive');
            }
        }, 10000);
    });

    describe('Token Management', () => {
        test('successful token refresh', async () => {
            localStorage.setItem('refreshToken', 'valid-refresh-token');

            const mockResponse = {
                data: {
                    access_token: 'new-access-token',
                    refresh_token: 'new-refresh-token'
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            await apiClient.refreshToken();

            expect(localStorage.getItem('accessToken')).toBe('new-access-token');
            expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
        }, 10000);

        test('token refresh with invalid refresh token', async () => {
            localStorage.setItem('refreshToken', 'invalid-refresh-token');
            localStorage.setItem('accessToken', 'old-access-token');
            localStorage.setItem('userData', JSON.stringify({ id: 1, email: 'test@example.com' }));

            mockedAxios.post.mockRejectedValueOnce({
                response: {
                    data: { detail: 'Invalid or expired refresh token' },
                    status: 401
                }
            });

            try {
                await apiClient.refreshToken();
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.detail).toBe('Invalid or expired refresh token');
                expect(localStorage.getItem('accessToken')).toBeNull();
                expect(localStorage.getItem('refreshToken')).toBeNull();
                expect(localStorage.getItem('userData')).toBeNull();
            }
        }, 10000);
    });

    describe('Session Management', () => {
        test('automatic token refresh on expired access token', async () => {
            localStorage.setItem('refreshToken', 'valid-refresh-token');
            localStorage.setItem('accessToken', 'expired-access-token');

            const mockRefreshResponse = {
                data: {
                    access_token: 'new-access-token',
                    refresh_token: 'new-refresh-token'
                }
            };

            const mockApiResponse = {
                data: { message: 'Success' }
            };

            mockedAxios.post.mockResolvedValueOnce(mockRefreshResponse);
            mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

            const response = await apiClient.get('/api/test/');
            expect(response.data.message).toBe('Success');
            expect(localStorage.getItem('accessToken')).toBe('new-access-token');
            expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
        }, 10000);

        test('session timeout handling', async () => {
            localStorage.setItem('accessToken', 'expired-session-token');
            try {
                await apiClient.get('/api/test/');
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.detail).toBe('Session expired');
                expect(localStorage.getItem('accessToken')).toBeNull();
                expect(localStorage.getItem('refreshToken')).toBeNull();
                expect(localStorage.getItem('userData')).toBeNull();
            }
        }, 10000);
    });
}); 