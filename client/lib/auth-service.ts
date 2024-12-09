import apiClient from './api-client';

interface LoginCredentials {
    email: string;
    password: string;
}

interface AuthTokens {
    access: string;
    refresh: string;
}

interface UserProfile {
    email: string;
    id: number;
    groups?: string[];
}

export const authService = {
    login: async (credentials: LoginCredentials) => {
        try {
            const payload = {
                username: credentials.email,
                password: credentials.password
            };

            const response = await apiClient.post<AuthTokens>('/auth/jwt/create/', payload);
            const { access, refresh } = response.data;

            // Store tokens
            localStorage.setItem('authToken', access);
            localStorage.setItem('refreshToken', refresh);

            return response.data;
        } catch (error) {
            console.error('Login request error:', error);
            throw error;
        }
    },

    getUserProfile: async (): Promise<UserProfile> => {
        const response = await apiClient.get('/auth/users/me/');
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
    }
}; 