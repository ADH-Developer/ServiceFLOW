import { AxiosError } from 'axios';

export interface ApiErrorResponse {
    detail?: string;
    message?: string;
    errors?: Record<string, string[]>;
    code?: string;
}

export interface ApiError extends Error {
    status?: number;
    data?: ApiErrorResponse;
    originalError?: AxiosError;
}

export interface ValidationError extends ApiError {
    fieldErrors?: Record<string, string[]>;
}

export interface AuthError extends ApiError {
    code: 'token_expired' | 'invalid_token' | 'no_token' | 'refresh_failed';
}

export interface NetworkError extends ApiError {
    retryCount?: number;
    willRetry?: boolean;
}

// Type guard functions
export const isValidationError = (error: unknown): error is ValidationError => {
    return error instanceof Error && !!(error as ValidationError).fieldErrors;
};

export const isAuthError = (error: unknown): error is AuthError => {
    return error instanceof Error && !!(error as AuthError).code;
};

export const isNetworkError = (error: unknown): error is NetworkError => {
    return error instanceof Error &&
        (error.message === 'Network Error' || !!(error as NetworkError).retryCount);
}; 