import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './dashboardSlice';
import websocketMiddleware from './websocketMiddleware';

export const store = configureStore({
    reducer: {
        dashboard: dashboardReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(websocketMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 