import { AxiosRequestConfig } from 'axios';
import { jest, beforeEach } from '@jest/globals';

// Mock response generator for API tests
export function getMockResponse(config: AxiosRequestConfig): any {
    const url = config.url || '';
    const method = config.method || 'get';
    const data = config.data || {};

    // Registration endpoint
    if (url === '/api/customers/register/' && method === 'post') {
        if (data.email === 'existing@example.com') {
            throw {
                response: {
                    status: 400,
                    data: { detail: 'Email already exists' }
                }
            };
        }
        return {
            status: 201,
            data: {
                id: 1,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name
            }
        };
    }

    // Login endpoint
    if (url === '/api/customers/login/' && method === 'post') {
        if (data.email === 'inactive@example.com') {
            throw {
                response: {
                    status: 403,
                    data: { detail: 'Account is inactive' }
                }
            };
        }
        if (data.email === 'invalid@example.com') {
            throw {
                response: {
                    status: 401,
                    data: { detail: 'Invalid credentials' }
                }
            };
        }
        return {
            status: 200,
            data: {
                access: 'mock-access-token',
                refresh: 'mock-refresh-token',
                user: {
                    id: 1,
                    email: data.email
                }
            }
        };
    }

    // Token refresh endpoint
    if (url === '/api/customers/token/refresh/' && method === 'post') {
        const refreshToken = data.refresh;
        if (refreshToken === 'invalid-refresh-token') {
            throw {
                response: {
                    status: 401,
                    data: { detail: 'Invalid or expired refresh token' }
                }
            };
        }
        return {
            status: 200,
            data: {
                access: 'new-access-token'
            }
        };
    }

    // Protected endpoint
    if (url === '/api/test/' && method === 'get') {
        const token = config.headers?.Authorization;
        if (!token || token === 'Bearer expired-session-token') {
            throw {
                response: {
                    status: 401,
                    data: { detail: 'Session expired' }
                }
            };
        }
        return {
            status: 200,
            data: { message: 'Success' }
        };
    }

    // Default success response
    return {
        status: 200,
        data: { success: true }
    };
}

// Mock Axios instance
export const mockAxiosInstance = {
    defaults: {
        baseURL: 'http://localhost:8000',
        headers: { 'Content-Type': 'application/json' }
    },
    interceptors: {
        request: {
            use: jest.fn((config) => config),
            eject: jest.fn()
        },
        response: {
            use: jest.fn((config) => config),
            eject: jest.fn()
        }
    },
    request: jest.fn((config: AxiosRequestConfig) => Promise.resolve(getMockResponse(config))),
    get: jest.fn((url: string, config?: AxiosRequestConfig) =>
        Promise.resolve(getMockResponse({ ...config, url, method: 'get' }))),
    post: jest.fn((url: string, data?: any, config?: AxiosRequestConfig) =>
        Promise.resolve(getMockResponse({ ...config, url, method: 'post', data }))),
    put: jest.fn((url: string, data?: any, config?: AxiosRequestConfig) =>
        Promise.resolve(getMockResponse({ ...config, url, method: 'put', data }))),
    patch: jest.fn((url: string, data?: any, config?: AxiosRequestConfig) =>
        Promise.resolve(getMockResponse({ ...config, url, method: 'patch', data }))),
    delete: jest.fn((url: string, config?: AxiosRequestConfig) =>
        Promise.resolve(getMockResponse({ ...config, url, method: 'delete' })))
};

// Mock localStorage
const mockStorage: { [key: string]: string } = {};
const mockLocalStorage = {
    getItem: jest.fn((key: string) => mockStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: jest.fn((key: string) => { delete mockStorage[key]; }),
    clear: jest.fn(() => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }),
    length: 0,
    key: (index: number) => Object.keys(mockStorage)[index] || null
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
}); 