// frontend/src/types/api.ts

import { Adventure } from './adventure';
import { GenerationOptions } from '../hooks/useAdventures';

// ── Supporting interfaces ─────────────────────────────────────────────────────

export interface RecommendedService {
	name: string;
	url: string;
	description: string;
}

export type ScopeIssue =
	| 'multi_day_trip'
	| 'international_travel'
	| 'accommodation_planning'
	| 'trip_budget_detected'
	| 'unsupported_city';

export type QueryType =
	| 'general_knowledge'
	| 'person_info'
	| 'technical_help'
	| 'weather'
	| 'other';

export interface ProgressUpdate {
	step: string;
	agent: string;
	status: 'in_progress' | 'complete' | 'error' | 'clarification_needed';
	message: string;
	progress: number;
	details?: Record<string, any>;
}

// ── Request / Response ────────────────────────────────────────────────────────

export interface AdventureRequest {
	user_input: string;
	user_address?: string;
	preferences?: Record<string, any>;
	enable_progress?: boolean;
	generation_options?: GenerationOptions;   // ✅ added
}

export interface AdventureMetadata {
	target_location?: string;
	total_adventures?: number;
	workflow_success?: boolean;

	unrelated_query?: boolean;
	query_type?: QueryType;

	out_of_scope?: boolean;
	scope_issue?: ScopeIssue;
	recommended_services?: RecommendedService[];
	detected_city?: string;

	clarification_needed?: boolean;
	clarification_message?: string;
	suggestions?: string[];

	personalization_applied?: boolean;
	user_history?: {
		has_history?: boolean;
		total_adventures?: number;
		average_rating?: number;
		favorite_locations?: string[];
	};

	performance?: {
		total_time_seconds?: number;
		cache_hit_rate?: string;
		cache_hits?: number;
		cache_misses?: number;
		time_saved_estimate?: string;
		timing_breakdown?: Record<string, number>;
		optimizations_enabled?: Record<string, boolean>;
	};

	research_stats?: {
		total_venues?: number;
		successful_research?: number;
		total_insights?: number;
		avg_confidence?: number;
		elapsed_seconds?: number;
		cache_hits?: number;
		cache_hit_rate?: string;
	};

	progress_tracking_enabled?: boolean;
	progress_log?: ProgressUpdate[];

	timestamp?: string;
}

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