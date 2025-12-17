// frontend/src/api/client.ts - FIXED TOKEN EXPIRATION HANDLING
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
	baseURL: API_BASE,
	timeout: 200000,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Request interceptor
apiClient.interceptors.request.use(
	(config) => {
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

// ✅ FIXED: Better token expiration handling
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		console.error('API Error:', error.response?.data || error.message);

		// ✅ Handle 401 Unauthorized (token expired/invalid)
		if (error.response?.status === 401) {
			const isAuthRequest = error.config?.url?.includes('/auth/');
			const isLoginRequest = error.config?.url?.includes('/auth/login');
			const isRegisterRequest = error.config?.url?.includes('/auth/register');

			// ✅ Only auto-logout if NOT a login/register attempt
			if (!isLoginRequest && !isRegisterRequest) {
				console.log('🔒 Session expired - logging out...');

				// Clear auth state
				localStorage.removeItem('auth_token');
				localStorage.removeItem('user_data');

				// Set session expired flag for login page
				sessionStorage.setItem('session_expired', 'true');
				sessionStorage.setItem('session_expired_message',
					'Your session has expired. Please log in again.');

				// ✅ Redirect to login (not home)
				window.location.href = '/login';

				// Return rejected promise to stop further processing
				return Promise.reject(new Error('Session expired'));
			}
			// If it's a login/register request, let the form handle the error
		}

		// ✅ Handle 403 Forbidden (access denied)
		if (error.response?.status === 403) {
			console.log('🚫 Access denied');

			// Clear auth state
			localStorage.removeItem('auth_token');
			localStorage.removeItem('user_data');

			// Set access denied flag
			sessionStorage.setItem('session_expired', 'true');
			sessionStorage.setItem('session_expired_message',
				'Access denied. Please log in again.');

			// Redirect to login
			window.location.href = '/login';

			return Promise.reject(new Error('Access denied'));
		}

		return Promise.reject(error);
	}
);

export default apiClient;