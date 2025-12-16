// frontend/src/types/adventure.ts
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
	venue_research?: TavilyResearchData;
}

export interface Adventure {
	title: string;
	tagline: string;
	description: string;
	duration: number;
	cost: number;
	steps: AdventureStep[];
	map_url?: string;
	routing_info?: RoutingInfo;
	data_sources?: string[];
	venues_research?: VenueWithResearch[];
}

export interface ResearchStats {
	totalInsights: number;
	avgConfidence: number;
}