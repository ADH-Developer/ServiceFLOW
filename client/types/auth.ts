export interface LoginInput {
    email: string;
    password: string;
}

export interface RegisterInput {
    user: {
        first_name: string;
        last_name: string;
        email: string;
        password: string;
    };
    phone: string;
    preferred_contact: 'email' | 'phone';
} 