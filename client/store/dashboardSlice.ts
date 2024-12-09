import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DashboardState {
    activeRole: string | null;
    availableRoles: string[];
    isConnected: boolean;
    tabStates: {
        [key: string]: any; // Store state for each role tab
    };
}

const initialState: DashboardState = {
    activeRole: null,
    availableRoles: [],
    isConnected: false,
    tabStates: {},
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setActiveRole: (state, action: PayloadAction<string>) => {
            state.activeRole = action.payload;
        },
        setAvailableRoles: (state, action: PayloadAction<string[]>) => {
            state.availableRoles = action.payload;
        },
        setConnectionStatus: (state, action: PayloadAction<boolean>) => {
            state.isConnected = action.payload;
        },
        updateTabState: (state, action: PayloadAction<{ role: string, data: any }>) => {
            state.tabStates[action.payload.role] = action.payload.data;
        },
    },
});

export const {
    setActiveRole,
    setAvailableRoles,
    setConnectionStatus,
    updateTabState,
} = dashboardSlice.actions;

export default dashboardSlice.reducer; 