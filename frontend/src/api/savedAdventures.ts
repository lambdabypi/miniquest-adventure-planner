// frontend/src/api/savedAdventures.ts
/**
 * Saved adventures API calls
 */

import apiClient from './client';

export interface SaveAdventureRequest {
	adventure_data: any;
	rating?: number;
	notes?: string;
	tags?: string[];
}

export interface UpdateAdventureRequest {
	rating?: number;
	notes?: string;
	tags?: string[];
	completed?: boolean;
}

export interface SavedAdventure {
	_id: string;
	user_id: string;
	adventure_data: any;
	rating: number | null;
	notes: string | null;
	tags: string[];
	saved_at: string;
	completed: boolean;
	completed_at: string | null;
	updated_at: string | null;
}

export interface SavedAdventuresListResponse {
	success: boolean;
	adventures: SavedAdventure[];
	total: number;
	filter_applied: string | null;
}

export interface SaveAdventureResponse {
	success: boolean;
	adventure_id: string;
	message: string;
}

export interface PersonalizationInsights {
	has_history: boolean;
	total_adventures: number;
	average_rating: number;
	favorite_locations: string[];
	favorite_themes: string[];
	preferred_duration_range?: { min: number; max: number };
	preferred_budget_range?: { min: number; max: number };
	recommendations: string[];
}

export interface PersonalizationResponse {
	success: boolean;
	insights: PersonalizationInsights;
}

export interface AdventureStats {
	total_saved: number;
	total_completed: number;
	completion_rate: number;
	average_rating: number;
	most_visited_location: string | null;
	favorite_adventure_type: string | null;
	total_distance_traveled: number | null;
	last_adventure_date: string | null;
}

export interface AdventureStatsResponse {
	success: boolean;
	stats: AdventureStats;
}

export const savedAdventuresApi = {
	/**
	 * Save an adventure
	 */
	async saveAdventure(request: SaveAdventureRequest): Promise<SaveAdventureResponse> {
		const response = await apiClient.post<SaveAdventureResponse>(
			'/api/saved-adventures',
			request
		);
		return response.data;
	},

	/**
	 * Get all saved adventures
	 */
	async getSavedAdventures(
		limit: number = 20,
		completed?: boolean
	): Promise<SavedAdventuresListResponse> {
		const params: any = { limit };
		if (completed !== undefined) {
			params.completed = completed;
		}

		const response = await apiClient.get<SavedAdventuresListResponse>(
			'/api/saved-adventures',
			{ params }
		);
		return response.data;
	},

	/**
	 * Get a specific saved adventure
	 */
	async getSavedAdventure(adventureId: string): Promise<{ success: boolean; adventure: SavedAdventure }> {
		const response = await apiClient.get(`/api/saved-adventures/${adventureId}`);
		return response.data;
	},

	/**
	 * Update a saved adventure
	 */
	async updateSavedAdventure(
		adventureId: string,
		updates: UpdateAdventureRequest
	): Promise<{ success: boolean; message: string }> {
		const response = await apiClient.patch(`/api/saved-adventures/${adventureId}`, updates);
		return response.data;
	},

	/**
	 * Delete a saved adventure
	 */
	async deleteSavedAdventure(adventureId: string): Promise<{ success: boolean; message: string }> {
		const response = await apiClient.delete(`/api/saved-adventures/${adventureId}`);
		return response.data;
	},

	/**
	 * Get personalization insights
	 */
	async getPersonalizationInsights(location?: string): Promise<PersonalizationResponse> {
		const params = location ? { location } : {};
		const response = await apiClient.get<PersonalizationResponse>(
			'/api/saved-adventures/personalization/insights',
			{ params }
		);
		return response.data;
	},

	/**
	 * Get adventure statistics
	 */
	async getAdventureStats(): Promise<AdventureStatsResponse> {
		const response = await apiClient.get<AdventureStatsResponse>(
			'/api/saved-adventures/stats/summary'
		);
		return response.data;
	},
};

export default savedAdventuresApi;