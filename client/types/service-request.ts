export interface ServiceRequest {
    id: number;
    vehicle: {
        year: string;
        make: string;
        model: string;
    };
    customer?: {
        first_name: string;
        last_name: string;
    };
    services: Array<{
        serviceType: string;
        description: string;
        urgency: string;
    }>;
    appointment_date: string;
    appointment_time: string;
    workflow_column: string;
    workflow_position: number;
    workflow_history: Array<{
        timestamp: string;
        from_column: string;
        to_column: string;
        user: string;
    }>;
    comments?: Array<{
        id: number;
        text: string;
        user: string;
        timestamp: string;
    }>;
    labels?: string[];
}

export type { ServiceRequest }; 