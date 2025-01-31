import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AxiosRequestConfig } from 'axios';
import apiClient from '../../lib/api-client';
import { mockAxiosInstance } from '../setup/api';

// Mock the axios instance
jest.mock('axios', () => ({
    create: () => mockAxiosInstance
}));

describe('API Error Handling Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    describe('Network Error Handling', () => {
        test('retries on network error with exponential backoff', async () => {
            const config: AxiosRequestConfig = {
                data: { maxFailures: 2 },
                headers: {}
            };
            const response = await apiClient.get('/api/test-endpoint/', config);
            expect(response.status).toBe(200);
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // Initial + 2 retries
        }, 10000);

        test('gives up after max retries', async () => {
            const config: AxiosRequestConfig = {
                data: { forceNetworkError: true },
                headers: {}
            };

            try {
                await apiClient.get('/api/test-endpoint/', config);
            } catch (error: any) {
                expect(error.message).toBe('Network Error');
                expect(error.isAxiosError).toBe(true);
                expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // Initial + 2 retries
                return;
            }
            throw new Error('Should have thrown an error');
        });
    });

    describe('Validation Error Handling', () => {
        test('handles field validation errors', async () => {
            try {
                await apiClient.register({ email: 'invalid@', password: '123' });
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.detail).toBe('Enter a valid email address.');
                expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
                return;
            }
            throw new Error('Should have thrown an error');
        });
    });

    describe('Authentication Error Handling', () => {
        test('handles expired token with refresh', async () => {
            const mockNewToken = 'new-access-token';
            const mockRefreshToken = 'valid-refresh-token';
            localStorage.setItem('refreshToken', mockRefreshToken);

            const response = await apiClient.get('/api/protected-endpoint/');
            expect(response.data.success).toBe(true);
            expect(localStorage.getItem('accessToken')).toBe(mockNewToken);
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/api/customers/token/refresh/',
                expect.any(Object)
            );
        });

        test('handles refresh token failure', async () => {
            localStorage.setItem('refreshToken', 'invalid-refresh-token');
            localStorage.setItem('accessToken', 'expired-token');
            localStorage.setItem('userData', JSON.stringify({ id: 1 }));

            try {
                await apiClient.get('/api/protected-endpoint/');
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.detail).toBe('Invalid or expired refresh token');
                expect(localStorage.getItem('accessToken')).toBeNull();
                expect(localStorage.getItem('refreshToken')).toBeNull();
                expect(localStorage.getItem('userData')).toBeNull();
                expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                    '/api/customers/token/refresh/',
                    expect.any(Object)
                );
                return;
            }
            throw new Error('Should have thrown an error');
        });
    });

    describe('Concurrent Operation Handling', () => {
        test('handles concurrent token refresh requests', async () => {
            const mockNewToken = 'new-access-token';
            const mockRefreshToken = 'valid-refresh-token';
            localStorage.setItem('refreshToken', mockRefreshToken);

            // Make concurrent requests
            const requests = [
                apiClient.get('/api/endpoint-1/'),
                apiClient.get('/api/endpoint-2/'),
                apiClient.get('/api/endpoint-3/')
            ];

            try {
                await Promise.all(requests);
            } catch (error) {
                // Expected to fail due to mock always returning 401
                expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1); // Only one refresh token request
                expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // Three GET requests
                return;
            }
            throw new Error('Should have thrown an error');
        });
    });

    describe('Rate Limiting Handling', () => {
        test('handles rate limit errors', async () => {
            try {
                await apiClient.post('/api/customers/service-requests/', {});
            } catch (error: any) {
                expect(error.response.status).toBe(429);
                expect(error.response.data.retry_after).toBe(60);
                expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
                return;
            }
            throw new Error('Should have thrown an error');
        });
    });
}); 