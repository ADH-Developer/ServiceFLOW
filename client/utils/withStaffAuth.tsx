import { useEffect } from 'react';
import { useRouter } from 'next/router';

export const withStaffAuth = (WrappedComponent: React.ComponentType) => {
    return (props: any) => {
        const router = useRouter();

        useEffect(() => {
            const checkStaffAuth = () => {
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
                    }
                } catch (error) {
                    console.error('Error checking staff auth:', error);
                    router.push('/login');
                }
            };

            checkStaffAuth();
        }, [router]);

        return <WrappedComponent {...props} />;
    };
}; 