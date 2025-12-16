// frontend/src/api/auth.ts
/**
 * Authentication API calls
 */

import apiClient from './client';

export interface RegisterRequest {
	email: string;
	username: string;
	full_name: string;
	password: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface AuthResponse {
	access_token: string;
	token_type: string;
	user: {
		id: string;
		email: string;
		username: string;
		full_name: string;
		adventure_count: number;
		preferences: Record<string, any>;
	};
}

export const authApi = {
	/**
	 * Register a new user
	 */
	async register(data: RegisterRequest): Promise<AuthResponse> {
		const response = await apiClient.post<AuthResponse>('/api/auth/register', data);
		return response.data;
	},

	/**
	 * Login user
	 */
	async login(data: LoginRequest): Promise<AuthResponse> {
		console.trace('🔍 authApi.login called from:');
		const response = await apiClient.post<AuthResponse>('/api/auth/login', data);
		return response.data;
	},

	/**
	 * Logout user
	 */
	async logout(): Promise<void> {
		await apiClient.post('/api/auth/logout');
	},

	/**
	 * Get current user
	 */
	async getCurrentUser(): Promise<any> {
		const response = await apiClient.get('/api/auth/me');
		return response.data;
	},
};

export default authApi;