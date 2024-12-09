import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Provider } from 'react-redux';
import { store } from '../../store';
import AdminDashboardLayout from '../../components/AdminDashboard/AdminDashboardLayout';

const AdminDashboard = () => {
    const router = useRouter();

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    return (
        <Provider store={store}>
            <AdminDashboardLayout />
        </Provider>
    );
};

export default AdminDashboard; 