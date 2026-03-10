// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/client';

interface User { email: string; username: string; user_id: string; }
interface AuthContextType {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string, username: string) => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		(async () => {
			const t = await SecureStore.getItemAsync('token');
			const u = await SecureStore.getItemAsync('user');
			if (t && u) { setToken(t); setUser(JSON.parse(u)); }
			setIsLoading(false);
		})();
	}, []);

	const login = async (email: string, password: string) => {
		const { data } = await authApi.login(email, password);
		await SecureStore.setItemAsync('token', data.access_token);
		await SecureStore.setItemAsync('user', JSON.stringify(data.user));
		setToken(data.access_token);
		setUser(data.user);
	};

	const register = async (email: string, password: string, username: string) => {
		const { data } = await authApi.register(email, password, username);
		await SecureStore.setItemAsync('token', data.access_token);
		await SecureStore.setItemAsync('user', JSON.stringify(data.user));
		setToken(data.access_token);
		setUser(data.user);
	};

	const logout = async () => {
		await SecureStore.deleteItemAsync('token');
		await SecureStore.deleteItemAsync('user');
		setToken(null);
		setUser(null);
	};

	return (
		<AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
};