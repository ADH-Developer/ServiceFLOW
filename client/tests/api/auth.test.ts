/// <reference types="jest" />

import apiClient from '../../lib/api-client';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Authentication Flow Tests', () => {
    beforeEach(() => {
        // Clear any stored tokens
        localStorage.clear();
    });

    describe('Registration Flow', () => {
        test('successful registration', async () => {
            const mockRegistrationData = {
                email: 'newuser@example.com',
                password: 'securepass123',
                first_name: 'New',
                last_name: 'User',
                phone_number: '1234567890'
            };

            const response = await apiClient.register(mockRegistrationData);
            expect(response).toHaveProperty('id');
            expect(response).toHaveProperty('email', mockRegistrationData.email);
        });

        test('registration with existing email', async () => {
            const mockRegistrationData = {
                email: 'existing@example.com',
                password: 'securepass123',
                first_name: 'Existing',
                last_name: 'User',
                phone_number: '1234567890'
            };

            try {
                await apiClient.register(mockRegistrationData);
                throw new Error('Should have thrown an error');
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.detail).toBe('User with this email already exists.');
            }
        });

        test('registration with invalid data', async () => {
            const invalidData = {
                email: 'invalid@',
                password: 'securepass123',
                first_name: 'Invalid',
                last_name: 'User',
                phone_number: '1234567890'
            };

            try {
                await apiClient.register(invalidData);
                throw new Error('Should have thrown an error');
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.detail).toBe('Enter a valid email address.');
            }
        });
    });

    describe('Login Flow', () => {
        test('successful login', async () => {
            const mockLoginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await apiClient.login(mockLoginData);

            expect(response).toHaveProperty('access');
            expect(response).toHaveProperty('refresh');
            expect(response).toHaveProperty('user');
            expect(localStorage.getItem('accessToken')).toBe(response.access);
            expect(localStorage.getItem('refreshToken')).toBe(response.refresh);
            expect(localStorage.getItem('userData')).toBe(JSON.stringify(response.user));
        });

        test('login with invalid credentials', async () => {
            const mockLoginData = {
                email: 'invalid@example.com',
                password: 'wrongpassword'
            };

            try {
                await apiClient.login(mockLoginData);
                throw new Error('Should have thrown an error');
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.detail).toBe('Invalid credentials');
                expect(localStorage.getItem('accessToken')).toBeNull();
                expect(localStorage.getItem('refreshToken')).toBeNull();
                expect(localStorage.getItem('userData')).toBeNull();
            }
        });

        test('login with inactive account', async () => {
            const mockLoginData = {
                email: 'inactive@example.com',
                password: 'password123'
            };

            try {
                await apiClient.login(mockLoginData);
                throw new Error('Should have thrown an error');
            } catch (error: any) {
                expect(error.response.status).toBe(403);
                expect(error.response.data.detail).toBe('Account is inactive');
            }
        });
    });

    describe('Token Management', () => {
        beforeEach(() => {
            jest.spyOn(apiClient, 'refreshToken');
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('successful token refresh', async () => {
            const mockNewToken = 'new-access-token';
            const mockRefreshToken = 'valid-refresh-token';

            // Mock the refresh token API call
            jest.spyOn(apiClient['instance'], 'post').mockResolvedValueOnce({
                data: { access: mockNewToken }
            });

            localStorage.setItem('refreshToken', mockRefreshToken);
            const response = await apiClient.refreshToken();

            expect(response).toBe(mockNewToken);
            expect(localStorage.getItem('accessToken')).toBe(mockNewToken);
            expect(localStorage.getItem('refreshToken')).toBe(mockRefreshToken);
        });

        test('token refresh with invalid refresh token', async () => {
            const mockRefreshToken = 'invalid-refresh-token';

            // Mock the refresh token API call to fail
            jest.spyOn(apiClient['instance'], 'post').mockRejectedValueOnce({
                response: {
                    status: 401,
                    data: { detail: 'Invalid or expired refresh token' }
                }
            });

            localStorage.setItem('refreshToken', mockRefreshToken);

            try {
                await apiClient.refreshToken();
                throw new Error('Should have thrown an error');
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.detail).toBe('Invalid or expired refresh token');
                expect(localStorage.getItem('accessToken')).toBeNull();
                expect(localStorage.getItem('refreshToken')).toBeNull();
                expect(localStorage.getItem('userData')).toBeNull();
            }
        });

        test('token refresh with network error', async () => {
            const mockRefreshToken = 'valid-refresh-token';

            // Mock the refresh token API call to fail with network error
            jest.spyOn(apiClient['instance'], 'post').mockRejectedValueOnce({
                message: 'Network Error',
                isAxiosError: true
            });

            localStorage.setItem('refreshToken', mockRefreshToken);

            try {
                await apiClient.refreshToken();
                throw new Error('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).toBe('Network Error');
                // Auth data should be preserved on network errors
                expect(localStorage.getItem('refreshToken')).toBe(mockRefreshToken);
            }
        });
    });

    describe('Session Management', () => {
        test('logout clears all auth data', async () => {
            // Set up initial auth state
            localStorage.setItem('accessToken', 'test-token');
            localStorage.setItem('refreshToken', 'test-refresh');
            localStorage.setItem('userData', JSON.stringify({ id: 1 }));

            await apiClient.logout();

            expect(localStorage.getItem('accessToken')).toBeNull();
            expect(localStorage.getItem('refreshToken')).toBeNull();
            expect(localStorage.getItem('userData')).toBeNull();
        });

        test('session timeout handling', async () => {
            localStorage.setItem('accessToken', 'expired-session-token');
            try {
                await apiClient.get('/api/test/');
                throw new Error('Should have thrown an error');
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.detail).toBe('Session has expired');
                expect(localStorage.getItem('accessToken')).toBeNull();
                expect(localStorage.getItem('refreshToken')).toBeNull();
                expect(localStorage.getItem('userData')).toBeNull();
            }
        });
    });
}); 