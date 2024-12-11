import { useEffect } from 'react';
import { useRouter } from 'next/router';

export const withStaffAuth = (WrappedComponent: React.ComponentType) => {
    return (props: any) => {
        const router = useRouter();

        useEffect(() => {
            const checkStaffAuth = () => {
                const userData = localStorage.getItem('userData');
                if (!userData) {
                    router.push('/login');
                    return;
                }

                const user = JSON.parse(userData);
                if (!user.is_staff) {
                    router.push('/dashboard');
                }
            };

            checkStaffAuth();
        }, [router]);

        return <WrappedComponent {...props} />;
    };
}; 