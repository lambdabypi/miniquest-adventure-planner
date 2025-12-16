// frontend/src/types/api.ts
/**
 * API request/response types with full scope handling
 */

import { Adventure } from './adventure';

// ✅ Recommended services interface
export interface RecommendedService {
	name: string;
	url: string;
	description: string;
}

// ✅ Scope issue types
export type ScopeIssue =
	| 'multi_day_trip'
	| 'international_travel'
	| 'accommodation_planning'
	| 'trip_budget_detected';

// ✅ Query type for unrelated queries
export type QueryType =
	| 'general_knowledge'
	| 'person_info'
	| 'technical_help'
	| 'weather'
	| 'other';

export interface AdventureRequest {
	user_input: string;
	user_address?: string;
	preferences?: Record<string, any>;
}

// ✅ Extended metadata interface with all states
export interface AdventureMetadata {
	// Location and success
	target_location?: string;
	total_adventures?: number;
	workflow_success?: boolean;

	// ✅ Unrelated query (NEW)
	unrelated_query?: boolean;
	query_type?: QueryType;

	// ✅ Out-of-scope handling
	out_of_scope?: boolean;
	scope_issue?: ScopeIssue;
	recommended_services?: RecommendedService[];

	// Clarification (too vague queries)
	clarification_needed?: boolean;
	clarification_message?: string;
	suggestions?: string[];

	// Personalization
	personalization_applied?: boolean;
	user_history?: {
		has_history?: boolean;
		total_adventures?: number;
		average_rating?: number;
		favorite_locations?: string[];
	};

	// Performance metrics
	performance?: {
		total_time_seconds?: number;
		cache_hit_rate?: string;
		cache_hits?: number;
		cache_misses?: number;
		time_saved_estimate?: string;
		timing_breakdown?: Record<string, number>;
		optimizations_enabled?: Record<string, boolean>;
	};

	// Research stats
	research_stats?: {
		total_venues?: number;
		successful_research?: number;
		total_insights?: number;
		avg_confidence?: number;
		elapsed_seconds?: number;
		cache_hits?: number;
		cache_hit_rate?: string;
	};

	timestamp?: string;
}

// ✅ AdventureResponse with proper metadata type
export interface AdventureResponse {
	success: boolean;
	adventures: Adventure[];
	metadata?: AdventureMetadata;
	message?: string;
}

export interface SystemStatus {
	status: string;
	features: Record<string, boolean>;
	api_keys: Record<string, string>;
	coordinator_ready: boolean;
	timestamp: string;
}

export type LocationStatus =
	| 'default'
	| 'detecting'
	| 'detected'
	| 'denied'
	| 'timeout'
	| 'unavailable'
	| 'failed'
	| 'unsupported'
	| 'manual';

export interface LocationData {
	city: string;
	state: string;
}