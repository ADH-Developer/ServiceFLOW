import { z } from 'zod';

export const registerSchema = z.object({
    user: z.object({
        first_name: z.string().min(1, 'First name is required'),
        last_name: z.string().min(1, 'Last name is required'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters')
    }),
    phone: z.string().min(1, 'Phone number is required'),
    preferred_contact: z.enum(['email', 'phone', 'both'])
});

export type RegisterInput = z.infer<typeof registerSchema>; 