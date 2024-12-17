import * as yup from 'yup';

export const registerSchema = yup.object().shape({
    user: yup.object().shape({
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

export const loginSchema = yup.object().shape({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
});

export type RegisterInput = yup.InferType<typeof registerSchema>;
export type LoginInput = yup.InferType<typeof loginSchema>; 