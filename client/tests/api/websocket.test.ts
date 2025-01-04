/// <reference types="jest" />
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

const WS_URL = 'ws://server:8000/ws/workflow/';

describe('WebSocket Connection Tests', () => {
    let ws: WebSocket;

    beforeEach(() => {
        ws = new WebSocket(WS_URL);
    });

    afterEach(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });

    test('WebSocket connection establishes successfully', (done: jest.DoneCallback) => {
        const timeout = setTimeout(() => {
            ws.close();
            done(new Error('WebSocket connection timeout'));
        }, 10000); // Increase timeout to 10 seconds

        ws.onopen = () => {
            clearTimeout(timeout);
            expect(ws.readyState).toBe(WebSocket.OPEN);
            ws.close();
            done();
        };

        ws.onerror = (error) => {
            clearTimeout(timeout);
            ws.close();
            done(error);
        };

        ws.onclose = () => {
            clearTimeout(timeout);
            if (ws.readyState !== WebSocket.OPEN) {
                done(new Error('WebSocket connection closed before establishing'));
            }
        };
    }, 15000); // Increase test timeout to 15 seconds
}); 