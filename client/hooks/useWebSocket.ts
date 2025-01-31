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
        let reconnectTimer: NodeJS.Timeout;

        const connect = () => {
            try {
                if (!isMounted.current) return;

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

                // Clear any existing connection
                if (ws.current) {
                    ws.current.close();
                    ws.current = null;
                }

                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsHost = process.env.NODE_ENV === 'development' ? 'localhost:8000' : window.location.host;
                const fullUrl = `${wsProtocol}//${wsHost}${url}?token=${encodeURIComponent(token)}`;

                console.log(`[WebSocket] Connecting to ${fullUrl} (Attempt ${connectionAttempts + 1})`);
                ws.current = new WebSocket(fullUrl);

                ws.current.onopen = () => {
                    if (!isMounted.current) return;
                    console.log('[WebSocket] Connected successfully');
                    setIsConnected(true);
                    setConnectionAttempts(0);

                    // Start heartbeat only after successful connection
                    heartbeatInterval = setInterval(() => {
                        if (ws.current?.readyState === WebSocket.OPEN) {
                            ws.current.send(JSON.stringify({ type: 'ping' }));
                        }
                    }, 30000);
                };

                ws.current.onclose = (event) => {
                    if (!isMounted.current) return;
                    console.log(`[WebSocket] Disconnected (code: ${event.code}, reason: ${event.reason})`);
                    setIsConnected(false);
                    clearInterval(heartbeatInterval);

                    // Only attempt reconnect if not unmounted and not a normal closure
                    if (isMounted.current && event.code !== 1000) {
                        const backoffDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 10000);
                        console.log(`[WebSocket] Reconnecting in ${backoffDelay}ms...`);
                        reconnectTimer = setTimeout(() => {
                            if (isMounted.current) {
                                setConnectionAttempts(prev => prev + 1);
                                connect();
                            }
                        }, backoffDelay);
                    }
                };

                ws.current.onerror = (error) => {
                    if (!isMounted.current) return;
                    console.error('[WebSocket] Error:', error);
                    // Let onclose handle reconnection
                };

                ws.current.onmessage = (event) => {
                    if (!isMounted.current) return;
                    try {
                        const data = JSON.parse(event.data);
                        console.log('[WebSocket] Received message:', data);
                        lastMessageTime.current = Date.now();
                        onMessage(data);
                    } catch (error) {
                        console.error('[WebSocket] Error parsing message:', error);
                    }
                };
            } catch (error) {
                console.error('[WebSocket] Connection error:', error);
                if (isMounted.current) {
                    setConnectionAttempts(prev => prev + 1);
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
            clearTimeout(reconnectTimer);
            if (ws.current) {
                ws.current.close(1000, 'Component unmounting');
                ws.current = null;
            }
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = undefined;
            }
        };
    }, [url, onMessage, fallbackPollInterval]);

    return {
        isConnected,
        connectionAttempts,
        lastMessageTime: lastMessageTime.current
    };
};