// Re-export core types
export type {
    Customer,
    Vehicle,
    Service,
    ServiceRequest,
    AppointmentListItem,
    WorkflowState,
    WorkflowStatus,
    WorkflowHistory,
    Comment,
    Label
} from './core';

// Re-export registration types
export type { RegistrationData } from './registration';

// Re-export auth types
export type { LoginInput, RegisterInput } from './auth'; 