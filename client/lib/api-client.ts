import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiError, AuthError, NetworkError, ValidationError } from '../types/api-error';

interface ApiErrorResponse {
    detail?: string;
    message?: string;
    errors?: Record<string, string[]>;
}

// Default timeout of 10 seconds
const DEFAULT_TIMEOUT = 10000;

export class ApiClient {
    private instance: AxiosInstance;
    private webSocket: WebSocket | null = null;
    private wsUrl: string;

    constructor() {
        this.instance = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
            withCredentials: true,
            timeout: DEFAULT_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.wsUrl = 'ws://localhost:8000/ws/service-updates/';

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor
        this.instance.interceptors.request.use(
            async (config: AxiosRequestConfig) => {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    if (!config.headers) {
                        config.headers = {};
                    }
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config as any;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.instance.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                // Handle token expiration
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const refreshToken = localStorage.getItem('refreshToken');
                        if (!refreshToken) {
                            throw new Error('No refresh token available');
                        }

                        const response = await this.instance.post('/api/customers/token/refresh/', {
                            refresh: refreshToken
                        });

                        const { access: newAccessToken } = response.data;
                        localStorage.setItem('accessToken', newAccessToken);

                        if (!originalRequest.headers) {
                            originalRequest.headers = {};
                        }
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        return this.instance(originalRequest);
                    } catch (refreshError) {
                        // Clear auth data on refresh token failure
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        localStorage.removeItem('userData');
                        throw refreshError;
                    }
                }

                // Handle network errors with retry
                if (error.message === 'Network Error' && originalRequest) {
                    const retries = (originalRequest as any)._retryCount || 0;
                    if (retries < 3) {
                        (originalRequest as any)._retryCount = retries + 1;

                        const networkError: NetworkError = new Error('Network error, retrying...') as NetworkError;
                        networkError.retryCount = retries + 1;
                        networkError.willRetry = true;
                        networkError.originalError = error;

                        return new Promise(resolve => {
                            setTimeout(() => {
                                resolve(this.instance(originalRequest));
                            }, Math.pow(2, retries) * 1000); // Exponential backoff
                        });
                    }
                }

                // Handle validation errors
                if (error.response?.status === 400 && error.response?.data?.errors) {
                    const validationError: ValidationError = new Error('Validation failed') as ValidationError;
                    validationError.status = 400;
                    validationError.fieldErrors = error.response.data.errors;
                    validationError.originalError = error;
                    return Promise.reject(validationError);
                }

                // Format error message
                const errorMessage = error.response?.data?.detail
                    || error.response?.data?.message
                    || error.message
                    || 'An unexpected error occurred';

                // Create generic API error
                const apiError: ApiError = new Error(errorMessage) as ApiError;
                apiError.status = error.response?.status;
                apiError.data = error.response?.data;
                apiError.originalError = error;

                // Clear auth data on auth errors
                if (error.response?.status === 401 || error.response?.status === 403) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('userData');
                }

                return Promise.reject(apiError);
            }
        );
    }

    // Auth methods
    async register(data: any): Promise<any> {
        const response = await this.instance.post('/api/customers/register/', data);
        return response.data;
    }

    async login(data: any): Promise<any> {
        const response = await this.instance.post('/api/customers/login/', data);
        const { access, refresh, user } = response.data;
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        localStorage.setItem('userData', JSON.stringify(user));
        return response.data;
    }

    async logout(): Promise<void> {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
    }

    async refreshToken(): Promise<string> {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        const response = await this.instance.post('/api/customers/token/refresh/', {
            refresh: refreshToken
        });
        const newAccessToken = response.data.access;
        localStorage.setItem('accessToken', newAccessToken);
        return newAccessToken;
    }

    // Proxy methods to axios instance
    get(url: string, config?: AxiosRequestConfig) {
        return this.instance.get(url, config);
    }

    post(url: string, data?: any, config?: AxiosRequestConfig) {
        return this.instance.post(url, data, config);
    }

    put(url: string, data?: any, config?: AxiosRequestConfig) {
        return this.instance.put(url, data, config);
    }

    delete(url: string, config?: AxiosRequestConfig) {
        return this.instance.delete(url, config);
    }

    patch(url: string, data?: any, config?: AxiosRequestConfig) {
        return this.instance.patch(url, data, config);
    }

    options(url: string, config?: AxiosRequestConfig) {
        return this.instance.options(url, config);
    }

    async connectWebSocket(): Promise<WebSocket> {
        if (this.webSocket?.readyState === WebSocket.OPEN) {
            return this.webSocket;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
            try {
                // Try to refresh token if available
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await this.instance.post('/api/customers/token/refresh/', {
                        refresh: refreshToken
                    });
                    const { access: newAccessToken } = response.data;
                    localStorage.setItem('accessToken', newAccessToken);
                } else {
                    throw new Error('No authentication token available');
                }
            } catch (error) {
                throw new Error('Authentication failed');
            }
        }

        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(`${this.wsUrl}?token=${localStorage.getItem('accessToken')}`);

                ws.onopen = () => {
                    this.webSocket = ws;
                    resolve(ws);
                };

                ws.onerror = (error) => {
                    reject(new Error('WebSocket connection failed'));
                };

                ws.onclose = () => {
                    this.webSocket = null;
                    // Attempt to reconnect after a delay
                    setTimeout(() => {
                        if (!this.webSocket) {
                            this.connectWebSocket().catch(() => {
                                // Silent catch to prevent error loop
                            });
                        }
                    }, 5000);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async disconnectWebSocket(): Promise<void> {
        if (this.webSocket) {
            this.webSocket.close();
            this.webSocket = null;
        }
    }
}

const apiClient = new ApiClient();
export default apiClient; 