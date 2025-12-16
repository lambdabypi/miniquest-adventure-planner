// frontend/src/api/client.ts
/**
 * Axios client configuration with improved error handling
 */

import axios from 'axios';

// ✅ In development, use relative URLs so proxy works
const API_BASE = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
	baseURL: API_BASE,
	timeout: 200000, // 200 second timeout for adventure generation
	headers: {
		'Content-Type': 'application/json',
	},
});

// Request interceptor (for auth tokens)
apiClient.interceptors.request.use(
	(config) => {
		// Add auth token if available
		const token = localStorage.getItem('auth_token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Response interceptor (for error handling)
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		console.error('API Error:', error.response?.data || error.message);

		// ✅ Handle 401 Unauthorized
		if (error.response?.status === 401) {
			const isLoginRequest = error.config?.url?.includes('/auth/login');

			// If it's not a login request, it means the session expired
			if (!isLoginRequest) {
				console.log('Session expired - clearing auth');
				localStorage.removeItem('auth_token');
				localStorage.removeItem('user_data');

				// Store message for login page to display
				sessionStorage.setItem('session_expired', 'Your session has expired. Please log in again.');

				// Redirect to login
				window.location.href = '/login';
			}
			// If it IS a login request, let the form handle the error
		}

		return Promise.reject(error);
	}
);

export default apiClient;