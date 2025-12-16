// frontend/src/contexts/AuthContext.tsx
/**
 * Authentication context with API integration and proper error propagation
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth';

interface User {
	id: string;
	email: string;
	username: string;
	full_name: string;
	adventure_count: number;
	preferences: Record<string, any>;
}

interface AuthContextType {
	user: User | null;
	token: string | null;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, username: string, fullName: string, password: string) => Promise<void>;
	logout: () => void;
	isAuthenticated: boolean;
	loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	// Load user from localStorage on mount
	useEffect(() => {
		const storedToken = localStorage.getItem('auth_token');
		const storedUser = localStorage.getItem('user_data');

		if (storedToken && storedUser) {
			setToken(storedToken);
			setUser(JSON.parse(storedUser));
		}

		setLoading(false);
	}, []);

	const login = async (email: string, password: string) => {
		// ✅ Let the original error propagate - don't re-wrap it
		// This allows LoginPage to access err.response?.data?.detail
		const data = await authApi.login({ email, password });

		setToken(data.access_token);
		setUser(data.user);

		localStorage.setItem('auth_token', data.access_token);
		localStorage.setItem('user_data', JSON.stringify(data.user));
	};

	const register = async (
		email: string,
		username: string,
		fullName: string,
		password: string
	) => {
		// ✅ Let the original error propagate - don't re-wrap it
		const data = await authApi.register({
			email,
			username,
			full_name: fullName,
			password,
		});

		setToken(data.access_token);
		setUser(data.user);

		localStorage.setItem('auth_token', data.access_token);
		localStorage.setItem('user_data', JSON.stringify(data.user));
	};

	const logout = async () => {
		try {
			await authApi.logout();
		} catch (error) {
			console.error('Logout error:', error);
			// Don't throw on logout errors - still clear local state
		} finally {
			setUser(null);
			setToken(null);
			localStorage.removeItem('auth_token');
			localStorage.removeItem('user_data');
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				token,
				login,
				register,
				logout,
				isAuthenticated: !!user,
				loading,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};