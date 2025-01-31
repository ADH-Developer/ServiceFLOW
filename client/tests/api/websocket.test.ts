/// <reference types="jest" />
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { WebSocket as MockWebSocket } from '../setup/websocket';
import apiClient from '../../lib/api-client';

// Mock WebSocket
(global as any).WebSocket = MockWebSocket;

describe('WebSocket Integration Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    describe('Connection Management', () => {
        test('establishes connection with authentication', async () => {
            localStorage.setItem('accessToken', 'valid-token');
            const ws = await apiClient.connectWebSocket();

            expect(ws.url).toBe('ws://localhost:8000/ws/service-updates/');
            expect(ws.readyState).toBe(WebSocket.OPEN);
            expect((ws as any).headers.Authorization).toBe('Bearer valid-token');
        });

        test('handles connection failure', async () => {
            (global as any).WebSocket.shouldFail = true;

            try {
                await apiClient.connectWebSocket();
            } catch (error: any) {
                expect(error.message).toBe('WebSocket connection failed');
                return;
            } finally {
                (global as any).WebSocket.shouldFail = false;
            }
            throw new Error('Should have thrown an error');
        });

        test('reconnects on connection loss', async () => {
            localStorage.setItem('accessToken', 'valid-token');
            const ws = await apiClient.connectWebSocket();

            // Simulate connection loss
            ws.close();

            // Wait for reconnection
            await new Promise(resolve => setTimeout(resolve, 1000));

            expect(ws.readyState).toBe(WebSocket.OPEN);
            expect((ws as any).reconnectAttempts).toBe(1);
        });
    });

    describe('Message Handling', () => {
        test('sends and receives messages', async () => {
            localStorage.setItem('accessToken', 'valid-token');
            const ws = await apiClient.connectWebSocket();

            const testMessage = {
                type: 'service_update',
                data: {
                    request_id: 123,
                    status: 'in_progress'
                }
            };

            // Set up message handler
            const receivedMessages: any[] = [];
            ws.onmessage = (event: any) => {
                receivedMessages.push(JSON.parse(event.data));
            };

            // Send message
            ws.send(JSON.stringify(testMessage));

            // Wait for message processing
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0]).toEqual(testMessage);
        });

        test('handles malformed messages', async () => {
            localStorage.setItem('accessToken', 'valid-token');
            const ws = await apiClient.connectWebSocket();

            const errorHandler = jest.fn();
            ws.onerror = errorHandler;

            // Send malformed message
            ws.send('invalid json');

            // Wait for error handling
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe('Authentication', () => {
        test('handles token refresh during connection', async () => {
            localStorage.setItem('accessToken', 'expired-token');
            localStorage.setItem('refreshToken', 'valid-refresh-token');

            const ws = await apiClient.connectWebSocket();

            expect(ws.readyState).toBe(WebSocket.OPEN);
            expect((ws as any).headers.Authorization).toContain('Bearer new-access-token');
            expect(localStorage.getItem('accessToken')).toBe('new-access-token');
        });

        test('handles authentication failure', async () => {
            localStorage.setItem('accessToken', 'invalid-token');

            try {
                await apiClient.connectWebSocket();
            } catch (error: any) {
                expect(error.message).toBe('Authentication failed');
                return;
            }
            throw new Error('Should have thrown an error');
        });
    });

    describe('Cleanup', () => {
        test('closes connection properly', async () => {
            localStorage.setItem('accessToken', 'valid-token');
            const ws = await apiClient.connectWebSocket();

            // Close connection
            await apiClient.disconnectWebSocket();

            expect(ws.readyState).toBe(WebSocket.CLOSED);
        });

        test('handles multiple close calls', async () => {
            localStorage.setItem('accessToken', 'valid-token');
            await apiClient.connectWebSocket();

            // Close multiple times
            await apiClient.disconnectWebSocket();
            await apiClient.disconnectWebSocket();

            // Should not throw error
        });
    });
}); 