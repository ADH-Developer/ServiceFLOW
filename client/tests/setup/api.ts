import { AxiosRequestConfig } from 'axios';
import { jest, beforeEach } from '@jest/globals';

interface NetworkError extends Error {
    isAxiosError: boolean;
}

interface MockResponse {
    status: number;
    data: any;
}

// Mock response generator for API tests
export function getMockResponse(config: AxiosRequestConfig): MockResponse {
    const testData = config.data as {
        maxFailures?: number;
        forceNetworkError?: boolean;
        email?: string;
        password?: string;
    };

    // Handle network error test cases
    if (testData?.forceNetworkError) {
        const error = new Error('Network Error') as NetworkError;
        error.isAxiosError = true;
        throw error;
    }

    if (testData?.maxFailures) {
        const maxFailures = testData.maxFailures;
        const currentAttempt = (global as any).retryAttempts || 0;
        (global as any).retryAttempts = currentAttempt + 1;

        if (currentAttempt < maxFailures) {
            const error = new Error('Network Error') as NetworkError;
            error.isAxiosError = true;
            throw error;
        }

        // Reset retry counter after max failures
        (global as any).retryAttempts = 0;
        return { status: 200, data: { success: true } };
    }

    // Handle validation errors
    if (testData?.email === 'invalid@') {
        const error = new Error('Validation Error') as NetworkError;
        error.isAxiosError = true;
        (error as any).response = {
            status: 400,
            data: { detail: 'Enter a valid email address.' }
        };
        throw error;
    }

    // Handle authentication errors
    if (config.url === '/api/customers/token/refresh/') {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken === 'invalid-refresh-token') {
            const error = new Error('Invalid Refresh Token') as NetworkError;
            error.isAxiosError = true;
            (error as any).response = {
                status: 401,
                data: { detail: 'Invalid or expired refresh token' }
            };
            throw error;
        }
        return {
            status: 200,
            data: { access: 'new-access-token' }
        };
    }

    // Handle rate limiting
    if (config.url === '/api/customers/service-requests/' && config.method === 'post') {
        const error = new Error('Rate Limit Exceeded') as NetworkError;
        error.isAxiosError = true;
        (error as any).response = {
            status: 429,
            data: {
                detail: 'Too many requests. Please try again in 60 seconds.',
                retry_after: 60
            }
        };
        throw error;
    }

    // Handle login
    if (config.url === '/api/customers/login/') {
        return {
            status: 200,
            data: {
                access: 'mock-access-token',
                refresh: 'mock-refresh-token',
                user: {
                    id: 1,
                    email: 'test@example.com',
                    first_name: 'Test',
                    last_name: 'User'
                }
            }
        };
    }

    // Handle service requests
    if (config.url === '/api/customers/service-requests/') {
        return {
            status: 200,
            data: []
        };
    }

    // Handle workflow states
    if (config.url === '/api/customers/admin/workflow/states/') {
        return {
            status: 200,
            data: []
        };
    }

    // Default success response
    return { status: 200, data: { success: true } };
}

// Mock Axios instance
export const mockAxiosInstance = {
    defaults: {
        baseURL: 'http://localhost:8000',
        headers: {
            common: {
                'Content-Type': 'application/json'
            }
        }
    },
    interceptors: {
        request: {
            use: jest.fn((config: AxiosRequestConfig) => config),
            eject: jest.fn()
        },
        response: {
            use: jest.fn((config: AxiosRequestConfig) => config),
            eject: jest.fn()
        }
    },
    get: jest.fn((url: string, config?: AxiosRequestConfig) => {
        return Promise.resolve(getMockResponse({ ...config, url, method: 'get' }));
    }),
    post: jest.fn((url: string, data?: any, config?: AxiosRequestConfig) => {
        return Promise.resolve(getMockResponse({ ...config, url, method: 'post', data }));
    }),
    put: jest.fn((url: string, data?: any, config?: AxiosRequestConfig) => {
        return Promise.resolve(getMockResponse({ ...config, url, method: 'put', data }));
    }),
    delete: jest.fn((url: string, config?: AxiosRequestConfig) => {
        return Promise.resolve(getMockResponse({ ...config, url, method: 'delete' }));
    }),
    patch: jest.fn((url: string, data?: any, config?: AxiosRequestConfig) => {
        return Promise.resolve(getMockResponse({ ...config, url, method: 'patch', data }));
    })
};

// Mock localStorage for tests
const mockLocalStorage = {
    store: {} as { [key: string]: string },
    getItem(key: string): string | null {
        return this.store[key] || null;
    },
    setItem(key: string, value: string): void {
        this.store[key] = value;
    },
    removeItem(key: string): void {
        delete this.store[key];
    },
    clear(): void {
        this.store = {};
    }
};

Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

// Reset localStorage before each test
beforeEach(() => {
    mockLocalStorage.clear();
}); 