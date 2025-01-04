/**
 * API Types
 * These types exactly match the shape of our Django API responses
 */

export interface ApiUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
}

export interface ApiCustomer {
    id: string;
    user: ApiUser;
    phone_number: string;
    preferred_contact: 'email' | 'phone';
}

export interface ApiVehicle {
    id: string;
    make: string;
    model: string;
    year: string;
    vin: string;
}

export interface ApiService {
    id: string;
    service_type: string;
    description: string;
    urgency: 'low' | 'medium' | 'high';
    price?: number;
}

export interface ApiWorkflowHistory {
    user: string;
    timestamp: string;
    from_column: string;
    to_column: string;
}

export interface ApiComment {
    id: string;
    user: ApiUser;
    text: string;
    created_at: string;
}

export interface ApiLabel {
    id: string;
    name: string;
    color?: string;
}

export interface ApiServiceRequest {
    id: string;
    customer: ApiCustomer;
    vehicle: ApiVehicle;
    services: ApiService[];
    status: string;
    created_at: string;
    updated_at: string;
    workflow_column: string;
    workflow_position: string;
    workflow_history: ApiWorkflowHistory[];
    comments: ApiComment[];
    labels: ApiLabel[];
    appointment_date: string;
    appointment_time: string;
    after_hours_dropoff: boolean;
}

// API Response Types
export interface ApiBoardState {
    columns: {
        [key: string]: ApiServiceRequest[];
    };
    column_order: string[];
} 