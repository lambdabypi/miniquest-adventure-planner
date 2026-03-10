// api/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/theme';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 180000 });

api.interceptors.request.use(async (config) => {
	const token = await SecureStore.getItemAsync('token');
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

export const authApi = {
	login: (email: string, password: string) =>
		api.post('/api/auth/login', { email, password }),
	register: (email: string, password: string, username: string) =>
		api.post('/api/auth/register', { email, password, username }),
};

export const adventureApi = {
	generate: (userInput: string, location: string) =>
		api.post('/api/adventures', { user_input: userInput, location }),
	getSaved: () => api.get('/api/saved-adventures'),
	save: (adventure: any) => api.post('/api/saved-adventures', adventure),
	delete: (id: string) => api.delete(`/api/saved-adventures/${id}`),
};

export default api;