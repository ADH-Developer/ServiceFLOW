export interface ServiceRequest {
    vehicle: {
        year: string;
        make: string;
        model: string;
    };
    services: {
        serviceType: string;
        description: string;
        urgency: 'low' | 'medium' | 'high';
    }[];
    appointment_date?: string;
    appointment_time?: string;
}

export type { ServiceRequest }; 