export class WebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    static shouldFail = false;

    url: string;
    readyState: number;
    onopen: ((event: any) => void) | null;
    onclose: ((event: any) => void) | null;
    onmessage: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    headers: { [key: string]: string };
    reconnectAttempts: number;

    constructor(url: string, protocols?: string | string[]) {
        this.url = url;
        this.readyState = WebSocket.CONNECTING;
        this.onopen = null;
        this.onclose = null;
        this.onmessage = null;
        this.onerror = null;
        this.headers = {};
        this.reconnectAttempts = 0;

        // Parse headers from URL query parameters
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        if (token) {
            this.headers.Authorization = `Bearer ${token}`;
        }

        // Simulate connection
        setTimeout(() => {
            if (WebSocket.shouldFail) {
                this.readyState = WebSocket.CLOSED;
                if (this.onerror) {
                    this.onerror({ error: new Error('WebSocket connection failed') });
                }
                if (this.onclose) {
                    this.onclose({ code: 1006, reason: 'Connection failed' });
                }
            } else {
                this.readyState = WebSocket.OPEN;
                if (this.onopen) {
                    this.onopen({ target: this });
                }
            }
        }, 100);
    }

    send(data: string): void {
        if (this.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not open');
        }

        try {
            const parsedData = JSON.parse(data);
            // Echo back the message
            if (this.onmessage) {
                this.onmessage({ data: JSON.stringify(parsedData) });
            }
        } catch (error) {
            if (this.onerror) {
                this.onerror({ error: new Error('Invalid JSON') });
            }
        }
    }

    close(code?: number, reason?: string): void {
        if (this.readyState === WebSocket.CLOSED) {
            return;
        }

        this.readyState = WebSocket.CLOSING;
        setTimeout(() => {
            this.readyState = WebSocket.CLOSED;
            if (this.onclose) {
                this.onclose({ code: code || 1000, reason: reason || 'Normal closure' });
            }
        }, 50);
    }
}

// Add WebSocket to global scope for tests
(global as any).WebSocket = WebSocket; 