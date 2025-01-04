import { useEffect, useRef, useState } from 'react';

interface UseWebSocketProps {
    url: string;
    onMessage: (data: any) => void;
    fallbackPollInterval?: number;
}

export const useWebSocket = ({ url, onMessage, fallbackPollInterval }: UseWebSocketProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout>();
    const isMounted = useRef(true);
    const lastMessageTime = useRef<number>(Date.now());
    const pollInterval = useRef<NodeJS.Timeout>();

    useEffect(() => {
        isMounted.current = true;
        let heartbeatInterval: NodeJS.Timeout;

        const connect = () => {
            try {
                if (connectionAttempts > 5) {
                    console.error('[WebSocket] Maximum reconnection attempts reached');
                    if (fallbackPollInterval) {
                        console.log('[WebSocket] Falling back to polling');
                        startPolling();
                    }
                    return;
                }

                const token = localStorage.getItem('accessToken');
                if (!token) {
                    console.error('[WebSocket] No access token found');
                    return;
                }

                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsHost = process.env.NODE_ENV === 'development' ? 'localhost:8000' : window.location.host;
                const fullUrl = `${wsProtocol}//${wsHost}${url}?token=${encodeURIComponent(token)}`;

                console.log(`[WebSocket] Connecting to ${fullUrl} (Attempt ${connectionAttempts + 1})`);
                ws.current = new WebSocket(fullUrl);

                ws.current.onopen = () => {
                    if (isMounted.current) {
                        console.log('[WebSocket] Connected successfully');
                        setIsConnected(true);
                        setConnectionAttempts(0);
                        stopPolling(); // Stop polling if it was active

                        // Start heartbeat
                        heartbeatInterval = setInterval(() => {
                            if (ws.current?.readyState === WebSocket.OPEN) {
                                ws.current.send(JSON.stringify({ type: 'ping' }));
                            }
                        }, 30000); // Send heartbeat every 30 seconds
                    }
                };

                ws.current.onclose = (event) => {
                    if (isMounted.current) {
                        console.log(`[WebSocket] Disconnected (code: ${event.code}, reason: ${event.reason})`);
                        setIsConnected(false);
                        clearInterval(heartbeatInterval);

                        // Try to reconnect after delay (increasing with each attempt)
                        const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
                        reconnectTimeout.current = setTimeout(() => {
                            if (isMounted.current) {
                                setConnectionAttempts(prev => prev + 1);
                                connect();
                            }
                        }, delay);
                    }
                };

                ws.current.onmessage = (event) => {
                    if (isMounted.current) {
                        try {
                            const data = JSON.parse(event.data);
                            if (data.type !== 'pong') {  // Don't log heartbeat responses
                                console.log('[WebSocket] Received message:', {
                                    type: data.type,
                                    timestamp: new Date().toISOString(),
                                    timeSinceLastMessage: Date.now() - lastMessageTime.current
                                });
                            }
                            lastMessageTime.current = Date.now();
                            onMessage(data);
                        } catch (error) {
                            console.error('[WebSocket] Error parsing message:', error);
                            console.error('Raw message:', event.data);
                        }
                    }
                };

                ws.current.onerror = (error) => {
                    if (isMounted.current) {
                        console.error('[WebSocket] Error:', error);
                        setIsConnected(false);
                    }
                };

            } catch (error) {
                if (isMounted.current) {
                    console.error('[WebSocket] Error creating connection:', error);
                    setIsConnected(false);
                }
            }
        };

        const startPolling = () => {
            if (fallbackPollInterval && !pollInterval.current) {
                pollInterval.current = setInterval(() => {
                    // Implement polling logic here if needed
                    console.log('[WebSocket] Polling for updates...');
                }, fallbackPollInterval);
            }
        };

        const stopPolling = () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = undefined;
            }
        };

        connect();

        return () => {
            console.log('[WebSocket] Cleaning up connection');
            isMounted.current = false;
            clearInterval(heartbeatInterval);
            stopPolling();
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [url, onMessage, connectionAttempts, fallbackPollInterval]);

    return {
        isConnected,
        connectionAttempts,
        lastMessageTime: lastMessageTime.current
    };
};