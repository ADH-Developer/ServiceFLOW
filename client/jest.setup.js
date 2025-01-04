// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

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