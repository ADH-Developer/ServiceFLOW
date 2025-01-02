import { useEffect, useRef, useState } from 'react';

interface UseWebSocketProps {
    url: string;
    onMessage: (data: any) => void;
}

export const useWebSocket = ({ url, onMessage }: UseWebSocketProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout>();
    const isMounted = useRef(true);

    useEffect(() => {
        // Set up cleanup flag
        isMounted.current = true;

        const connect = () => {
            try {
                console.log('Connecting to WebSocket:', url);
                const token = localStorage.getItem('accessToken');
                const fullUrl = `ws://localhost:8000${url}?token=${token}`;
                console.log('Full WebSocket URL:', fullUrl);

                ws.current = new WebSocket(fullUrl);

                ws.current.onopen = () => {
                    if (isMounted.current) {
                        console.log('WebSocket connected successfully');
                        setIsConnected(true);
                    }
                };

                ws.current.onclose = () => {
                    if (isMounted.current) {
                        console.log('WebSocket disconnected');
                        setIsConnected(false);
                        // Try to reconnect after 5 seconds
                        reconnectTimeout.current = setTimeout(() => {
                            if (isMounted.current) {
                                connect();
                            }
                        }, 5000);
                    }
                };

                ws.current.onmessage = (event) => {
                    if (isMounted.current) {
                        try {
                            const data = JSON.parse(event.data);
                            onMessage(data);
                        } catch (error) {
                            console.error('Error parsing WebSocket message:', error);
                        }
                    }
                };

                ws.current.onerror = (error) => {
                    if (isMounted.current) {
                        console.error('WebSocket error:', error);
                        setIsConnected(false);
                    }
                };

            } catch (error) {
                if (isMounted.current) {
                    console.error('Error creating WebSocket connection:', error);
                    setIsConnected(false);
                }
            }
        };

        connect();

        // Cleanup function
        return () => {
            isMounted.current = false;
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [url, onMessage]);

    return { isConnected };
};