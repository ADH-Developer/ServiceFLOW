import { WorkflowHistory, Comment, Label } from './workflow';

export interface Customer {
    id: number;
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
    phone_number: string;
}

export interface Vehicle {
    id: number;
    make: string;
    model: string;
    year: number;
    vin: string;
}

export interface Service {
    id: number;
    name: string;
    description: string;
    price: number;
}

export interface ServiceRequest {
    id: number;
    customer: Customer;
    vehicle: Vehicle;
    services: Service[];
    status: string;
    created_at: string;
    updated_at: string;
    appointment_date: string | null;
    appointment_time: string | null;
    notes: string;
    workflow_column: string;
    workflow_position: number;
    workflow_history: WorkflowHistory[];
    comments: Comment[];
    labels: Label[];
} 