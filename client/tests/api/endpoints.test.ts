import axios from 'axios';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeAll } from '@jest/globals';

describe('API Endpoint Tests', () => {
    const baseURL = 'http://localhost:8000';
    let authToken: string;

    beforeAll(() => {
        // Configure axios defaults
        axios.defaults.baseURL = baseURL;
        axios.defaults.headers.common['Content-Type'] = 'application/json';
        axios.defaults.withCredentials = true;
    });

    describe('Authentication Endpoints', () => {
        test('POST /api/customers/login/', async () => {
            try {
                const response = await axios.post('/api/customers/login/', {
                    email: 'test@example.com',
                    password: 'testpassword'
                });
                expect(response.status).toBe(200);
                expect(response.data).toHaveProperty('token');
                authToken = response.data.token;
            } catch (error) {
                console.error('Login test failed:', error);
                throw error;
            }
        });
    });

    describe('Service Request Endpoints', () => {
        test('GET /api/customers/service-requests/', async () => {
            try {
                const response = await axios.get('/api/customers/service-requests/', {
                    headers: {
                        Authorization: `Bearer ${authToken}`
                    }
                });
                expect(response.status).toBe(200);
                expect(Array.isArray(response.data)).toBe(true);
            } catch (error) {
                console.error('Service requests fetch failed:', error);
                throw error;
            }
        });
    });

    describe('Workflow Endpoints', () => {
        test('GET /api/customers/admin/workflow/states/', async () => {
            try {
                const response = await axios.get('/api/customers/admin/workflow/states/', {
                    headers: {
                        Authorization: `Bearer ${authToken}`
                    }
                });
                expect(response.status).toBe(200);
                expect(Array.isArray(response.data)).toBe(true);
            } catch (error) {
                console.error('Workflow states fetch failed:', error);
                throw error;
            }
        });
    });
}); 