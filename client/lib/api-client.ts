import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const apiClient: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    withCredentials: true,
});

// Request interceptor
apiClient.interceptors.request.use(
    (config: AxiosRequestConfig) => {
        // Don't add auth header for registration or login
        if (config.url?.includes('/register') || config.url?.includes('/login')) {
            return config;
        }

        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient; 