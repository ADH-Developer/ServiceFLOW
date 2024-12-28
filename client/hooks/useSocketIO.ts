import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useSocketIO = (namespace: string) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const mountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!mountedRef.current) {
            console.log('[useSocketIO] Component unmounted, skipping connection');
            return;
        }
        if (socketRef.current?.connected) {
            console.log('[useSocketIO] Socket already connected, skipping connection');
            return;
        }

        try {
            console.log(`[useSocketIO] Connecting to Socket.IO at ${API_URL} with namespace /${namespace}`);

            // Create socket instance
            const socket = io(API_URL, {
                path: '/socket.io',
                transports: ['websocket'],
                autoConnect: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: Infinity,
                auth: {
                    namespace
                }
            });

            // Debug socket events
            socket.onAny((event, ...args) => {
                console.log(`[useSocketIO] Received event '${event}':`, args);
            });

            socket.on('connect_error', (err) => {
                console.error(`[useSocketIO] Connection error:`, err);
            });

            socket.on('error', (err) => {
                console.error(`[useSocketIO] Socket error:`, err);
            });

            // Namespace handling
            socket.emit('join', namespace);
            console.log(`[useSocketIO] Emitted join event for namespace /${namespace}`);

            socket.on('connect', () => {
                if (!mountedRef.current) {
                    console.log('[useSocketIO] Component unmounted during connect event, skipping');
                    return;
                }
                console.log(`[useSocketIO] Socket.IO connected successfully to namespace /${namespace}`);
                setIsConnected(true);
                setError(null);

                // Re-join namespace after reconnection
                socket.emit('join', namespace);
                console.log(`[useSocketIO] Re-joined namespace /${namespace} after connection`);
            });

            socket.on('disconnect', (reason) => {
                if (!mountedRef.current) {
                    console.log('[useSocketIO] Component unmounted during disconnect event, skipping');
                    return;
                }
                console.log(`[useSocketIO] Socket.IO disconnected from namespace /${namespace}. Reason:`, reason);
                setIsConnected(false);
                // Attempt to reconnect unless explicitly disconnected
                if (reason === 'io server disconnect') {
                    console.log('[useSocketIO] Server initiated disconnect, attempting to reconnect');
                    socket.connect();
                }
            });

            socketRef.current = socket;
        } catch (err) {
            if (!mountedRef.current) {
                console.log('[useSocketIO] Component unmounted during setup, skipping error handling');
                return;
            }
            console.error(`[useSocketIO] Socket.IO setup error:`, err);
            setError(err instanceof Error ? err : new Error('Failed to setup Socket.IO'));
            setIsConnected(false);
        }
    }, [namespace]);

    const emit = useCallback((event: string, data?: any) => {
        if (socketRef.current?.connected) {
            console.log(`[useSocketIO] Emitting event '${event}' to namespace /${namespace}:`, data);
            socketRef.current.emit(event, data);
        } else {
            console.warn(`[useSocketIO] Socket.IO is not connected to namespace /${namespace}, message not sent:`, { event, data });
            // Attempt to reconnect
            connect();
        }
    }, [namespace, connect]);

    const on = useCallback(<T = any>(event: string, callback: (data: T) => void) => {
        if (!socketRef.current) {
            console.warn(`[useSocketIO] Socket.IO not initialized, attempting to connect...`);
            connect();
            return () => { };
        }

        console.log(`[useSocketIO] Setting up listener for event '${event}' on namespace /${namespace}`);
        const wrappedCallback = (data: T) => {
            console.log(`[useSocketIO] Received event '${event}' on namespace /${namespace}:`, data);
            console.log(`[useSocketIO] Calling callback for event '${event}'...`);
            if (mountedRef.current) {
                try {
                    callback(data);
                    console.log(`[useSocketIO] Successfully executed callback for event '${event}'`);
                } catch (error) {
                    console.error(`[useSocketIO] Error executing callback for event '${event}':`, error);
                }
            } else {
                console.log(`[useSocketIO] Component unmounted, skipping callback for event '${event}'`);
            }
        };

        socketRef.current.on(event, wrappedCallback);
        console.log(`[useSocketIO] Successfully set up listener for event '${event}' on namespace /${namespace}`);

        return () => {
            if (socketRef.current) {
                console.log(`[useSocketIO] Removing listener for event '${event}' on namespace /${namespace}`);
                socketRef.current.off(event, wrappedCallback);
            }
        };
    }, [namespace, connect]);

    useEffect(() => {
        mountedRef.current = true;
        console.log(`[useSocketIO] Initializing Socket.IO hook for namespace /${namespace}`);
        connect();

        return () => {
            mountedRef.current = false;
            if (socketRef.current) {
                console.log(`[useSocketIO] Cleaning up Socket.IO connection for namespace /${namespace}`);
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [namespace, connect]);

    return { isConnected, error, emit, on };
}; 