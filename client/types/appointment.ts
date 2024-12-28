export interface Appointment {
    id: string;
    appointment_date: string;
    appointment_time: string;
    customer: {
        first_name: string;
        last_name: string;
    };
    vehicle: {
        year: string;
        make: string;
        model: string;
    };
    services: Array<{
        service_type: string;
        urgency: string;
    }>;
    status: string;
    created_at: string;
    workflow_column: string;
    workflow_position: number;
    workflow_history: any[];
    comments: any[];
    labels: any[];
} 