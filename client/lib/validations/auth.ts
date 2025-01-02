import * as yup from 'yup';

export const loginSchema = yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
});

export const registerSchema = yup.object({
    user: yup.object({
        first_name: yup.string().required('First name is required'),
        last_name: yup.string().required('Last name is required'),
        email: yup.string().email('Invalid email').required('Email is required'),
        password: yup.string()
            .min(8, 'Password must be at least 8 characters')
            .required('Password is required'),
    }),
    phone: yup.string()
        .matches(/^\d{10}$/, 'Phone number must be 10 digits')
        .required('Phone number is required'),
    preferred_contact: yup.string()
        .oneOf(['email', 'phone'], 'Invalid contact preference')
        .required('Contact preference is required'),
});

export type LoginInput = {
    email: string;
    password: string;
};

export type RegisterInput = {
    user: {
        first_name: string;
        last_name: string;
        email: string;
        password: string;
    };
    phone: string;
    preferred_contact: 'email' | 'phone';
}; 