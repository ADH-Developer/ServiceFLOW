import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketHookOptions {
    url: string;
    onMessage: (data: any) => void;
    fallbackPollInterval?: number;
}

export const useWebSocket = ({
    url,
    onMessage,
    fallbackPollInterval = 300000,
}: WebSocketHookOptions) => {
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout>();

    const connect = useCallback(() => {
        try {
            // Get the authentication token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                console.error('No authentication token found');
                return;
            }

            // In development, use port 8000 for WebSocket connections
            const wsUrl = process.env.NODE_ENV === 'development'
                ? `ws://localhost:8000${url}`
                : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${url}`;

            console.log('Connecting to WebSocket:', wsUrl);
            // Include the token in the connection URL
            const fullUrl = `${wsUrl}?token=${encodeURIComponent(token)}`;
            console.log('Full WebSocket URL:', fullUrl);
            ws.current = new WebSocket(fullUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected successfully');
                setIsConnected(true);
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
                ws.current = null;

                // Simple reconnect after 5 seconds
                reconnectTimeout.current = setTimeout(connect, 5000);
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
        }
    }, [url, onMessage]);

    useEffect(() => {
        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
        };
    }, [connect]);

    return { isConnected };
};