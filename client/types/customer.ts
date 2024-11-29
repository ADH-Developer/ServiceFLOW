interface Vehicle {
    make: string;
    model: string;
    year: number;
    vin: string;
}

interface CustomerProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    preferredContact: 'email' | 'phone';
    vehicles: Vehicle[];
}

export type { Vehicle, CustomerProfile }; 