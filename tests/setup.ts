import '@testing-library/jest-dom';
import { beforeEach } from '@jest/globals';

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
};
global.localStorage = localStorageMock;

// Increase default timeout
jest.setTimeout(30000);

// Configure JSDOM for CORS
const mockXHR = {
    open: jest.fn(),
    send: jest.fn(),
    setRequestHeader: jest.fn(),
    readyState: 4,
    status: 200,
    response: '{}',
    responseText: '{}',
    onreadystatechange: null,
    getAllResponseHeaders: () => '',
    withCredentials: false
};

// Mock XMLHttpRequest
global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

// Suppress CORS-related console errors
const originalError = console.error;
console.error = (...args: any[]) => {
    const errorMessage = args[0]?.toString() || '';
    if (errorMessage.includes('Cross origin') ||
        errorMessage.includes('CORS')) {
        return;
    }
    originalError.apply(console, args);
};

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    // Reset XHR mock for each test
    Object.assign(mockXHR, {
        readyState: 4,
        status: 200,
        response: '{}',
        responseText: '{}',
        onreadystatechange: null
    });
}); 