import axios from 'axios';

// Set default base URL for tests
process.env.NEXT_PUBLIC_API_URL = 'http://server:8000';

// Configure axios for testing
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL;
axios.defaults.withCredentials = true;

// Add global test timeout
jest.setTimeout(30000); // 30 seconds 