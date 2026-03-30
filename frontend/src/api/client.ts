// frontend/src/api/client.ts
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
	(error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		console.error('API Error:', error.response?.data || error.message);

		const url = error.config?.url || '';
		const isLoginRequest = url.includes('/auth/login');
		const isRegisterRequest = url.includes('/auth/register');

		// 401 — token expired or invalid; never on login/register (those surface their own errors)
		if (error.response?.status === 401 && !isLoginRequest && !isRegisterRequest) {
			console.log('🔒 Session expired - logging out...');
			localStorage.removeItem('auth_token');
			localStorage.removeItem('user_data');
			sessionStorage.setItem('session_expired', 'true');
			sessionStorage.setItem('session_expired_message', 'Your session has expired. Please log in again.');
			window.location.href = '/login';
			return Promise.reject(new Error('Session expired'));
		}

		// 403 — access denied, but NOT a lost session.
		// Only treat as session expiry if it comes from an auth endpoint
		// (e.g. token accepted but account deactivated). A 403 on /api/feedback
		// just means the user isn't an admin — let the page handle it.
		if (error.response?.status === 403 && url.includes('/auth/')) {
			console.log('🚫 Auth 403 - logging out...');
			localStorage.removeItem('auth_token');
			localStorage.removeItem('user_data');
			sessionStorage.setItem('session_expired', 'true');
			sessionStorage.setItem('session_expired_message', 'Access denied. Please log in again.');
			window.location.href = '/login';
			return Promise.reject(new Error('Access denied'));
		}

		return Promise.reject(error);
	}
);

export default apiClient;