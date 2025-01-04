/// <reference types="jest" />

import { api } from '../../utils/api';

describe('API Connectivity Tests', () => {
    test('should pass CORS configuration test', async () => {
        const response = await api.get('/api/health-check/');
        expect(response.status).toBe(200);
    });

    test('should pass authentication flow test', async () => {
        const response = await api.get('/api/auth/user/');
        expect(response.status).toBe(200);
    });

    test('should handle non-existent endpoints correctly', async () => {
        try {
            await api.get('/api/non-existent-endpoint/');
            throw new Error('Should have thrown an error');
        } catch (error: any) {
            expect(error.response?.status).toBe(404);
        }
    });

    test('should handle token refresh', async () => {
        const response = await api.post('/api/auth/token/refresh/');
        expect(response.status).toBe(200);
    });
}); 