import { useEffect } from 'react';
import { useRouter } from 'next/router';
import type { NextPage } from 'next';

export const withAuth = (WrappedComponent: NextPage) => {
    const AuthComponent: NextPage = (props) => {
        const router = useRouter();

        useEffect(() => {
            // Check if we're on the client side
            if (typeof window !== 'undefined') {
                const token = localStorage.getItem('accessToken');
                const userData = localStorage.getItem('userData');

                if (!token || !userData) {
                    router.push('/login');
                    return;
                }

                try {
                    const user = JSON.parse(userData);
                    if (!user.is_staff) {
                        router.push('/dashboard');
                        return;
                    }
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    router.push('/login');
                }
            }
        }, [router]);

        return <WrappedComponent {...props} />;
    };

    // Copy getInitialProps from wrapped component if it exists
    if (WrappedComponent.getInitialProps) {
        AuthComponent.getInitialProps = WrappedComponent.getInitialProps;
    }

    return AuthComponent;
};

export default withAuth; 