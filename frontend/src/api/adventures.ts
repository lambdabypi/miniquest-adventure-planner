// frontend/src/api/adventures.ts
/**
 * Adventure-related API calls
 */

import apiClient from './client';
import { AdventureRequest, AdventureResponse, SystemStatus } from '../types/api';

export const adventuresApi = {
	/**
	 * Generate adventures based on user input
	 */
	async generateAdventures(request: AdventureRequest): Promise<AdventureResponse> {
		const response = await apiClient.post<AdventureResponse>('/api/adventures', request);
		return response.data;
	},

	/**
	 * Get system status
	 */
	async getSystemStatus(): Promise<SystemStatus> {
		const response = await apiClient.get<SystemStatus>('/api/status');
		return response.data;
	},

	/**
	 * Test system (full system check)
	 */
	async testSystem(): Promise<any> {
		const response = await apiClient.get('/api/test/workflow');
		return response.data;
	},

	/**
	 * Health check
	 */
	async healthCheck(): Promise<any> {
		const response = await apiClient.get('/health');
		return response.data;
	},
};

export default adventuresApi;