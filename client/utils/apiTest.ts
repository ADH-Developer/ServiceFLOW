const { api } = require('./api');

/**
 * Test utility for verifying API connectivity and configuration
 */
const testApiConnectivity = async () => {
    const results = {
        cors: false,
        auth: false,
        errorHandling: false,
        tokenRefresh: false,
        errors: [] as string[]
    };

    try {
        // Test 1: CORS Configuration
        console.log('Testing CORS configuration...');
        await api.get('/health-check/');
        results.cors = true;
        console.log('✅ CORS test passed');

        // Test 2: Authentication Flow
        console.log('Testing authentication flow...');
        const authResponse = await api.get('/auth/user/');
        if (authResponse.status === 200) {
            results.auth = true;
            console.log('✅ Authentication test passed');
        }

        // Test 3: Error Handling
        console.log('Testing error handling...');
        try {
            await api.get('/non-existent-endpoint/');
        } catch (error: any) {
            if (error.response?.status === 404) {
                results.errorHandling = true;
                console.log('✅ Error handling test passed');
            }
        }

        // Test 4: Token Refresh
        console.log('Testing token refresh...');
        const refreshResponse = await api.post('/auth/token/refresh/');
        if (refreshResponse.status === 200) {
            results.tokenRefresh = true;
            console.log('✅ Token refresh test passed');
        }

    } catch (error: any) {
        console.error('API Test Error:', error);
        results.errors.push(error.message);
    }

    return results;
};

// Helper function to run tests
const runApiTests = async () => {
    console.log('Starting API connectivity tests...');
    const results = await testApiConnectivity();

    console.log('\nTest Results:');
    console.log('-------------');
    console.log('CORS Configuration:', results.cors ? '✅ Passed' : '❌ Failed');
    console.log('Authentication Flow:', results.auth ? '✅ Passed' : '❌ Failed');
    console.log('Error Handling:', results.errorHandling ? '✅ Passed' : '❌ Failed');
    console.log('Token Refresh:', results.tokenRefresh ? '✅ Passed' : '❌ Failed');

    if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach(error => console.log(`- ${error}`));
    }

    return results;
};

module.exports = { runApiTests }; 