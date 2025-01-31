import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { WebSocket } from './tests/setup/websocket';

// Configure global WebSocket
(global as any).WebSocket = WebSocket;

// Configure localStorage mock
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

// Configure global fetch mock
global.fetch = jest.fn(); 