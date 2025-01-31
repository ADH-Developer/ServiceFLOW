/// <reference types="jest" />

import apiClient from '../../lib/api-client';
import { describe, test, expect, beforeEach } from '@jest/globals';

describe('API Connectivity Tests', () => {
    beforeEach(() => {
        // Clear any stored tokens
        localStorage.clear();
        // Set up a test token
        localStorage.setItem('accessToken', 'test-token');
    });

    describe('CORS Configuration', () => {
        test('should handle preflight requests', async () => {
            const response = await apiClient.options('/api/customers/health-check/');
            expect(response.headers['access-control-allow-origin']).toBeDefined();
            expect(response.headers['access-control-allow-credentials']).toBe('true');
            expect(response.headers['access-control-allow-methods']).toContain('GET');
        });

        test('should pass CORS configuration test with credentials', async () => {
            const response = await apiClient.get('/api/customers/health-check/', {
                withCredentials: true
            });
            expect(response.status).toBe(200);
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
            expect(response.status).toBe(200);
        });
    });

    test('should pass authentication flow test', async () => {
        const response = await apiClient.post('/api/customers/login/', {
            email: 'test@example.com',
            password: 'password123'
        });
        expect(response.data).toHaveProperty('access');
        expect(response.data).toHaveProperty('refresh');
        expect(response.data).toHaveProperty('user');
    });

    test('should handle non-existent endpoints correctly', async () => {
        try {
            await apiClient.get('/api/non-existent-endpoint/');
            throw new Error('Should have thrown an error');
        } catch (error: any) {
            expect(error.response.status).toBe(404);
            expect(error.response.data.detail).toBe('Not Found');
        }
    });

    test('should handle token refresh', async () => {
        // First set an expired token
        localStorage.setItem('accessToken', 'expired-token');
        localStorage.setItem('refreshToken', 'valid-refresh-token');

        try {
            // This should trigger a token refresh
            await apiClient.get('/api/customers/service-requests/');
        } catch (error: any) {
            // We expect an auth error since our tokens are fake
            expect(error.response.status).toBe(401);
            expect(error.response.data.detail).toBe('Token refresh failed');
        }
    });
}); 