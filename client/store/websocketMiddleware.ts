import { Middleware } from '@reduxjs/toolkit';
import { setAvailableRoles, setConnectionStatus } from './dashboardSlice';

const websocketMiddleware: Middleware = store => {
    let socket: WebSocket | null = null;

    return next => action => {
        if (action.type === 'dashboard/connect') {
            // Close existing socket if it exists
            if (socket !== null) {
                socket.close();
            }

            // Create new WebSocket connection
            socket = new WebSocket(`ws://${window.location.host}/ws/admin_dashboard/`);

            socket.onopen = () => {
                store.dispatch(setConnectionStatus(true));
            };

            socket.onclose = () => {
                store.dispatch(setConnectionStatus(false));
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'roles_update':
                        store.dispatch(setAvailableRoles(data.roles));
                        break;
                    // Add more cases for different message types
                }
            };
        }

        return next(action);
    };
};

export default websocketMiddleware; 