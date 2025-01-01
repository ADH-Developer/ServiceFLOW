export interface Customer {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
}

export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: string;
    vin: string;
}

export interface Service {
    id: string;
    service_type: string;
    urgency: 'low' | 'medium' | 'high';
    description: string;
}

export interface Comment {
    id: string;
    text: string;
    created_at: string;
    user: {
        id: string;
        username: string;
    };
}

export interface Label {
    id: string;
    name: string;
    color: string;
}

export interface ServiceRequest {
    id: string;
    customer: Customer;
    vehicle: Vehicle;
    services: Service[];
    comments: Comment[];
    labels: Label[];
    status: 'estimates' | 'in_progress' | 'waiting_parts' | 'completed';
    appointment_date: string;
    appointment_time: string;
    created_at: string;
    updated_at: string;
    workflow_column: 'estimates' | 'in_progress' | 'waiting_parts' | 'completed';
    workflow_position: number;
    workflow_history: {
        from_column: string;
        to_column: string;
        timestamp: string;
    }[];
} 