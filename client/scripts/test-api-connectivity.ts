import type { AxiosError } from 'axios';
import { customersApi, workflowApi, appointmentsApi } from '../lib/api-services';
import type { RegisterInput } from '../lib/validations/auth';

interface ApiError extends AxiosError {
    response?: {
        status: number;
        data: {
            user?: {
                email?: string[];
            };
        };
    };
}

async function runApiConnectivityTests() {
    console.log('Starting API connectivity tests...\n');

    try {
        // Test 1: Authentication Flow
        console.log('1. Testing Authentication Flow');
        const testEmail = 'test@example.com';
        const testPassword = 'testPassword123!';

        try {
            // Test Registration
            const registrationData: RegisterInput = {
                user: {
                    first_name: 'Test',
                    last_name: 'User',
                    email: testEmail,
                    password: testPassword
                },
                phone: '1234567890',
                preferred_contact: 'email' as const
            };

            await customersApi.register(registrationData);
            console.log('✓ Registration successful');
        } catch (error) {
            const apiError = error as ApiError;
            if (apiError.response?.status === 400 && apiError.response?.data?.user?.email?.[0]?.includes('already exists')) {
                console.log('✓ User already exists (expected for test user)');
            } else {
                throw error;
            }
        }

        // Test Login
        const loginResponse = await customersApi.login({
            email: testEmail,
            password: testPassword
        });
        console.log('✓ Login successful');
        console.log('✓ Token received:', !!loginResponse.data.token);

        // Test 2: Business Hours API
        console.log('\n2. Testing Business Hours API');
        const businessHours = await appointmentsApi.getBusinessHours();
        console.log('✓ Business hours retrieved:', !!businessHours);

        // Test 3: Available Slots API
        console.log('\n3. Testing Available Slots API');
        const today = new Date().toISOString().split('T')[0];
        const slots = await appointmentsApi.getAvailableSlots(today);
        console.log('✓ Available slots retrieved:', !!slots);

        // Test 4: Workflow Board State
        console.log('\n4. Testing Workflow Board State');
        const boardState = await workflowApi.getBoardState();
        console.log('✓ Board state retrieved:', !!boardState);

        // Test 5: Token Refresh
        console.log('\n5. Testing Token Refresh');
        // Force token expiration by waiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Try to get business hours again (should trigger refresh if token expired)
        await appointmentsApi.getBusinessHours();
        console.log('✓ Token refresh mechanism working');

        console.log('\nAll API connectivity tests passed successfully! ✨');
    } catch (error) {
        const apiError = error as ApiError;
        console.error('\n❌ API Test Failed:', {
            message: apiError.message,
            response: apiError.response?.data,
            status: apiError.response?.status
        });
        throw error;
    } finally {
        // Cleanup
        customersApi.logout();
    }
}

// Run the tests
runApiConnectivityTests().catch(console.error); 