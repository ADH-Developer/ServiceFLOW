import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Configure Jest timeout
jest.setTimeout(30000);

// Mock localStorage
const mockLocalStorage = () => {
    const store: { [key: string]: string } = {};
    return {
        getItem: (key: string): string | null => store[key] || null,
        setItem: (key: string, value: string): void => { store[key] = value; },
        removeItem: (key: string): void => { delete store[key]; },
        clear: (): void => { Object.keys(store).forEach(key => delete store[key]); },
        length: 0,
        key: (index: number): string | null => Object.keys(store)[index] || null,
    };
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage() });

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

global.WebSocket = MockWebSocket as any; 