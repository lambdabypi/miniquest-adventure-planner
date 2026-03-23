// frontend/src/types/adventure.ts

/**
 * Adventure-related TypeScript types
 */

/**
 * Adventure-related TypeScript types
 */

export interface TavilyResearchData {
	current_info?: string;
	hours_info?: string;
	visitor_tips?: string[];
	venue_summary?: string;
	research_confidence?: number;
	successful_queries?: number;
	total_insights?: number;
	top_source?: string;
}

export interface ResearchSummary {
	visitor_summary: string;
	key_highlights: string[];
	practical_info: {
		best_time_to_visit?: string;
		typical_duration?: string;
		admission?: string;
		insider_tips?: string[];
	};
	confidence_notes: string;
}

export interface VenueWithResearch {
	name?: string;
	venue_name?: string;
	matched_to?: string;
	description?: string;
	address?: string;
	rating?: number;
	current_info?: string;
	hours_info?: string;
	visitor_tips?: string[];
	venue_summary?: string;
	research_confidence?: number;
	successful_queries?: number;
	total_insights?: number;
	research_status?: string;
	top_source?: string;
	research_summary?: ResearchSummary;
	// ✅ structured display fields from discovery_agent
	hours_clean?: string | null;
	price_tier?: string | null;
	description_clean?: string | null;
	verified_address?: string | null;
	// ✅ LLM-extracted enrichment fields
	insider_tip_clean?: string | null;
	best_time?: string | null;
	crowd_level?: string | null;
	// ✅ venue website / source URLs
	source_url?: string | null;
	tavily_url?: string | null;
	website?: string | null;
	yelp_url?: string | null;
}

export interface TravelOption {
	mode: string;
	url: string;
	description: string;
	recommended: boolean;
}

export interface TransitOption {
	provider: string;
	route: string;
	duration: string;
	cost: string;
}

export interface RoutingInfo {
	routing_available?: boolean;
	matched_venues?: number;
	recommended_mode?: string;
	cross_city_travel?: boolean;
	distance_category?: string;
	travel_options?: TravelOption[];
	travel_guidance?: string;
	primary_route_url?: string;
	transit_options?: TransitOption[];
	transit_recommendation?: string;
}

export interface AdventureStep {
	time: string;
	activity: string;
	details: string;
	insider_tip?: string;
	venue_url?: string | null;
	venue_research?: TavilyResearchData;
}

export interface Adventure {
	title: string;
	tagline: string;
	description: string;
	duration: number;
	cost: number;
	theme?: string;
	location?: string;
	steps: AdventureStep[];
	map_url?: string;
	routing_info?: RoutingInfo;
	data_sources?: string[];
	venues_used?: string[];
	venues_research?: VenueWithResearch[];
}

export interface ResearchStats {
	totalInsights: number;
	avgConfidence: number;
}