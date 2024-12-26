import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '../lib/api-client';

type WebSocketMessage = {
    type: string;
    payload: any;
};

export const useWebSocket = (path: string) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const mountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;

        try {
            const cleanPath = path.replace(/^\/?(ws\/)?/, '').replace(/\/$/, '');
            const wsPath = `ws/${cleanPath}`;
            const cleanBaseUrl = WS_BASE_URL.replace(/\/$/, '');
            const wsUrl = `${cleanBaseUrl}/${wsPath}/`;

            console.log('Connecting to WebSocket:', wsUrl);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!mountedRef.current) return;
                console.log('WebSocket connected successfully');
                setIsConnected(true);
                setError(null);
            };

            ws.onclose = () => {
                if (!mountedRef.current) return;
                console.log('WebSocket disconnected, attempting reconnect...');
                setIsConnected(false);
                if (mountedRef.current) {
                    setTimeout(connect, 3000);
                }
            };

            ws.onerror = (event) => {
                if (!mountedRef.current) return;
                console.error('WebSocket error:', event);
                setError(new Error('WebSocket error occurred'));
                setIsConnected(false);
            };

        } catch (err) {
            if (!mountedRef.current) return;
            console.error('WebSocket connection error:', err);
            setError(err instanceof Error ? err : new Error('Failed to connect to WebSocket'));
            setIsConnected(false);
        }
    }, [path]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected, message not sent');
        }
    }, []);

    const subscribe = useCallback((callback: (data: any) => void) => {
        if (wsRef.current) {
            wsRef.current.onmessage = (event) => {
                if (!mountedRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    callback(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        connect();

        return () => {
            mountedRef.current = false;
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    return {
        isConnected,
        error,
        sendMessage,
        subscribe
    };
}; 