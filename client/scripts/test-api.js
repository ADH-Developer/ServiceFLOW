const { runApiTests } = require('../utils/apiTest');

// Run the tests
(async () => {
    try {
        const results = await runApiTests();

        // Exit with appropriate code
        const allTestsPassed =
            results.cors &&
            results.auth &&
            results.errorHandling &&
            results.tokenRefresh;

        process.exit(allTestsPassed ? 0 : 1);
    } catch (error) {
        console.error('Failed to run API tests:', error);
        process.exit(1);
    }
})(); 