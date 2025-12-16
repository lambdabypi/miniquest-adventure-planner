// frontend/src/api/analytics.ts
/**
 * Analytics API with performance metrics support
 */

import apiClient from './client';

// ========================================
// TYPES
// ========================================

export interface AnalyticsData {
	total_queries: number;
	total_users: number;
	recent_queries_24h: number;
	avg_adventures_per_query: number;
	top_adventure_themes: Array<{
		theme: string;
		count: number;
	}>;
	generated_at: string;
}

export interface PerformanceMetrics {
	total_queries_tracked: number;
	avg_response_time: number;
	median_response_time: number;
	fastest_query: number;
	slowest_query: number;
	cache_hit_rate: string;
	cache_hits_total?: number;
	cache_attempts_total?: number;
	time_saved_by_cache?: string;
	avg_adventures_generated: number;
	performance_trend: 'improving' | 'stable' | 'degrading' | 'insufficient_data';
	performance_baseline: number;
	improvement_vs_baseline: string;
}

export interface CacheStats {
	enabled: boolean;
	current_size?: number;
	max_size?: number;
	capacity_used?: string;
	lifetime_hits?: number;
	lifetime_misses?: number;
	lifetime_hit_rate?: string;
	estimated_time_saved?: string;
	ttl_minutes?: number;
	message?: string;
	error?: string;
}

export interface EnhancedAnalyticsData extends AnalyticsData {
	performance?: PerformanceMetrics;
	cache?: CacheStats;
	insights?: string[];
	processed_at?: string;
}

export interface PerformanceResponse {
	success: boolean;
	time_period_days: number;
	performance: PerformanceMetrics;
}

export interface CacheStatsResponse {
	success: boolean;
	cache: CacheStats;
}

export interface InsightsResponse {
	success: boolean;
	insights: string[];
	generated_at: string;
}

export interface TrendData {
	date: string;
	query_count: number;
	avg_response_time: number;
	cache_hit_rate: number;
}

export interface TrendsResponse {
	success: boolean;
	trends: {
		daily_trends: TrendData[];
		total_days: number;
	};
}

// ========================================
// API FUNCTIONS
// ========================================

export const analyticsApi = {
	/**
	 * Get comprehensive analytics summary with performance metrics
	 */
	async getSummary(): Promise<EnhancedAnalyticsData> {
		const response = await apiClient.get<EnhancedAnalyticsData>('/api/analytics/summary');
		return response.data;
	},

	/**
	 * Get detailed performance metrics
	 */
	async getPerformance(days: number = 7): Promise<PerformanceResponse> {
		const response = await apiClient.get<PerformanceResponse>(
			`/api/analytics/performance?days=${days}`
		);
		return response.data;
	},

	/**
	 * Get cache statistics
	 */
	async getCacheStats(): Promise<CacheStatsResponse> {
		const response = await apiClient.get<CacheStatsResponse>('/api/analytics/cache/stats');
		return response.data;
	},

	/**
	 * Get AI-generated insights
	 */
	async getInsights(): Promise<InsightsResponse> {
		const response = await apiClient.get<InsightsResponse>('/api/analytics/insights');
		return response.data;
	},

	/**
	 * Get performance trends over time
	 */
	async getTrends(): Promise<TrendsResponse> {
		const response = await apiClient.get<TrendsResponse>('/api/analytics/trends');
		return response.data;
	},
};

export default analyticsApi;