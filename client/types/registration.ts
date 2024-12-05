export interface RegistrationData {
    vehicle: {
        year: string;
        make: string;
        model: string;
    };
    services: {
        serviceType: string;
        description: string;
        urgency: string;
    }[];
    appointment?: {
        date: Date;
        timeSlot: string;
    };
} 