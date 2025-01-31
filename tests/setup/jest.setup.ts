import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Increase default timeout
jest.setTimeout(30000);

// Suppress CORS errors
const originalConsoleError = console.error;
console.error = (...args) => {
    if (args[0]?.toString().includes('Cross origin')) {
        return;
    }
    originalConsoleError.apply(console, args);
};

// Mock XMLHttpRequest
const mockXHR = {
    open: jest.fn(),
    send: jest.fn(),
    setRequestHeader: jest.fn(),
    readyState: 4,
    status: 200,
    response: '{}',
    responseText: '{}',
    onreadystatechange: jest.fn()
};

Object.defineProperty(window, 'XMLHttpRequest', {
    writable: true,
    value: jest.fn(() => mockXHR)
});

// Mock WebSocket
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    url: string;
    readyState: number = MockWebSocket.CONNECTING;
    onopen: ((event: any) => void) | null = null;
    onclose: ((event: any) => void) | null = null;
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            this.onopen?.({ type: 'open' });
        }, 50);
    }

    send(data: string): void {
        setTimeout(() => {
            this.onmessage?.({ data });
        }, 50);
    }

    close(): void {
        this.readyState = MockWebSocket.CLOSING;
        setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED;
            this.onclose?.({ type: 'close' });
        }, 50);
    }
}

(global as any).WebSocket = MockWebSocket;

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

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    jest.clearAllTimers();
}); 