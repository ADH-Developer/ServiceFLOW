import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SocketMetrics {
    reconnectAttempts: number;
    lastReconnectTime: number | null;
    connectionStartTime: number | null;
}

/**
 * Custom hook for Socket.IO integration with automatic reconnection and metrics
 * @param namespace - The Socket.IO namespace to connect to
 * @returns Object containing connection state, error state, and event handlers
 */
export const useSocketIO = (namespace: string) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const mountedRef = useRef(true);
    const metricsRef = useRef<SocketMetrics>({
        reconnectAttempts: 0,
        lastReconnectTime: null,
        connectionStartTime: null,
    });

    const logSocketEvent = useCallback((event: string, details?: any) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            namespace,
            event,
            connectionState: isConnected,
            reconnectAttempts: metricsRef.current.reconnectAttempts,
            ...details
        };
        // In production, this could be sent to a logging service
        console.log(`[Socket.IO] ${event}:`, logEntry);
    }, [namespace, isConnected]);

    const connect = useCallback(() => {
        if (!mountedRef.current || socketRef.current?.connected) {
            return;
        }

        try {
            // Reset metrics on new connection attempt
            metricsRef.current = {
                reconnectAttempts: 0,
                lastReconnectTime: Date.now(),
                connectionStartTime: Date.now(),
            };

            const socket = io(API_URL, {
                path: '/socket.io',
                transports: ['websocket'],
                autoConnect: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 60, // 1 minute of attempts
                auth: { namespace }
            });

            socket.on('connect', () => {
                if (!mountedRef.current) return;

                setIsConnected(true);
                setError(null);
                socket.emit('join', namespace);

                logSocketEvent('connected', {
                    connectionTime: Date.now() - (metricsRef.current.connectionStartTime || 0),
                    reconnectAttempts: metricsRef.current.reconnectAttempts,
                });
            });

            socket.on('connect_error', (err) => {
                if (!mountedRef.current) return;

                metricsRef.current.reconnectAttempts++;
                metricsRef.current.lastReconnectTime = Date.now();

                logSocketEvent('connect_error', {
                    error: err.message,
                    attemptCount: metricsRef.current.reconnectAttempts
                });
            });

            socket.on('disconnect', (reason) => {
                if (!mountedRef.current) return;

                setIsConnected(false);
                logSocketEvent('disconnected', { reason });

                if (reason === 'io server disconnect') {
                    socket.connect();
                }
            });

            socketRef.current = socket;
            logSocketEvent('setup_complete');
        } catch (err) {
            if (!mountedRef.current) return;

            const error = err instanceof Error ? err : new Error('Failed to setup Socket.IO');
            setError(error);
            setIsConnected(false);
            logSocketEvent('setup_error', { error: error.message });
        }
    }, [namespace, logSocketEvent]);

    const emit = useCallback((event: string, data?: any) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
            logSocketEvent('emit', { event, data });
        } else {
            logSocketEvent('emit_failed', { event, data });
            connect();
        }
    }, [connect, logSocketEvent]);

    const on = useCallback(<T = any>(event: string, callback: (data: T) => void) => {
        if (!socketRef.current) {
            connect();
            return () => { };
        }

        const wrappedCallback = (data: T) => {
            if (mountedRef.current) {
                try {
                    callback(data);
                    logSocketEvent('event_handled', { event });
                } catch (error) {
                    logSocketEvent('event_error', { event, error: error instanceof Error ? error.message : 'Unknown error' });
                }
            }
        };

        socketRef.current.on(event, wrappedCallback);
        logSocketEvent('listener_added', { event });

        return () => {
            if (socketRef.current) {
                socketRef.current.off(event, wrappedCallback);
                logSocketEvent('listener_removed', { event });
            }
        };
    }, [connect, logSocketEvent]);

    useEffect(() => {
        mountedRef.current = true;
        connect();

        return () => {
            mountedRef.current = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                logSocketEvent('cleanup');
            }
        };
    }, [connect, logSocketEvent]);

    return {
        isConnected,
        error,
        emit,
        on,
        metrics: metricsRef.current
    };
}; 