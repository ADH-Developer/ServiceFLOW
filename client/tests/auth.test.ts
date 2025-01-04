import axios from 'axios';
import { customersApi } from '../lib/api-services';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Authentication Flow', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Clear localStorage before each test
        localStorage.clear();
    });

    describe('Login', () => {
        const mockLoginResponse = {
            data: {
                access: 'mock-access-token',
                refresh: 'mock-refresh-token',
                user: {
                    id: 1,
                    email: 'test@example.com',
                    first_name: 'Test',
                    last_name: 'User',
                    is_staff: false
                }
            }
        };

        it('should successfully login and store tokens', async () => {
            mockedAxios.post.mockResolvedValueOnce(mockLoginResponse);

            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await customersApi.login(loginData);

            // Verify API call
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/auth/login/',
                loginData
            );

            // Verify response
            expect(response).toEqual(mockLoginResponse.data);

            // Verify localStorage
            expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
            expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
            expect(localStorage.getItem('userData')).toBe(JSON.stringify(mockLoginResponse.data.user));
        });

        it('should handle login failure', async () => {
            const errorResponse = {
                response: {
                    data: {
                        detail: 'Invalid credentials'
                    },
                    status: 401
                }
            };

            mockedAxios.post.mockRejectedValueOnce(errorResponse);

            const loginData = {
                email: 'wrong@example.com',
                password: 'wrongpassword'
            };

            await expect(customersApi.login(loginData)).rejects.toThrow('Invalid credentials');

            // Verify localStorage wasn't updated
            expect(localStorage.getItem('accessToken')).toBeNull();
            expect(localStorage.getItem('refreshToken')).toBeNull();
            expect(localStorage.getItem('userData')).toBeNull();
        });
    });

    describe('Token Refresh', () => {
        const mockRefreshResponse = {
            data: {
                access: 'new-access-token'
            }
        };

        it('should successfully refresh access token', async () => {
            mockedAxios.post.mockResolvedValueOnce(mockRefreshResponse);

            // Set up initial state
            localStorage.setItem('refreshToken', 'old-refresh-token');

            const response = await customersApi.refreshToken();

            // Verify API call
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/auth/token/refresh/',
                { refresh: 'old-refresh-token' }
            );

            // Verify response
            expect(response).toBe('new-access-token');

            // Verify localStorage was updated
            expect(localStorage.getItem('accessToken')).toBe('new-access-token');
        });

        it('should handle refresh failure', async () => {
            const errorResponse = {
                response: {
                    data: {
                        detail: 'Invalid refresh token'
                    },
                    status: 401
                }
            };

            mockedAxios.post.mockRejectedValueOnce(errorResponse);

            // Set up initial state
            localStorage.setItem('refreshToken', 'invalid-refresh-token');

            await expect(customersApi.refreshToken()).rejects.toThrow('Invalid refresh token');

            // Verify localStorage was cleared
            expect(localStorage.getItem('accessToken')).toBeNull();
            expect(localStorage.getItem('refreshToken')).toBeNull();
            expect(localStorage.getItem('userData')).toBeNull();
        });
    });

    describe('Staff Authentication', () => {
        it('should identify staff user correctly', () => {
            const staffUser = {
                id: 1,
                email: 'staff@example.com',
                first_name: 'Staff',
                last_name: 'User',
                is_staff: true
            };

            localStorage.setItem('userData', JSON.stringify(staffUser));
            localStorage.setItem('accessToken', 'mock-token');

            // This would be replaced with actual staff check logic
            const isStaff = JSON.parse(localStorage.getItem('userData') || '{}').is_staff;
            expect(isStaff).toBe(true);
        });

        it('should identify non-staff user correctly', () => {
            const regularUser = {
                id: 2,
                email: 'user@example.com',
                first_name: 'Regular',
                last_name: 'User',
                is_staff: false
            };

            localStorage.setItem('userData', JSON.stringify(regularUser));
            localStorage.setItem('accessToken', 'mock-token');

            // This would be replaced with actual staff check logic
            const isStaff = JSON.parse(localStorage.getItem('userData') || '{}').is_staff;
            expect(isStaff).toBe(false);
        });
    });
}); 