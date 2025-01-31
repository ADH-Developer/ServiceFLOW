// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

// Set up test environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://server:8000';

// Add fetch polyfill for node environment
global.fetch = require('node-fetch');

// Mock WebSocket
class WebSocketMock {
    constructor(url) {
        this.url = url;
        this.onopen = null;
        this.onclose = null;
        this.onmessage = null;
        this.onerror = null;
    }

    send(data) { }
    close() { }
}
global.WebSocket = WebSocketMock; 