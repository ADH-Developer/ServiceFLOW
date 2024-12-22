import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketMessage = {
    type: string;
    payload: any;
};

export const useWebSocket = (url: string) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setError(null);
            };

            ws.onclose = () => {
                setIsConnected(false);
                // Attempt to reconnect after 3 seconds
                setTimeout(connect, 3000);
            };

            ws.onerror = (event) => {
                setError(new Error('WebSocket error occurred'));
                setIsConnected(false);
            };

        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to connect to WebSocket'));
            setIsConnected(false);
        }
    }, [url]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    const subscribe = useCallback((callback: (data: any) => void) => {
        if (wsRef.current) {
            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                callback(data);
            };
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
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