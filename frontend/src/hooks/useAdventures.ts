// frontend/src/hooks/useAdventures.ts
import { useState, useCallback } from 'react';
import { adventuresApi } from '../api/adventures';
import { Adventure, ResearchStats } from '../types/adventure';

export const useAdventures = () => {
	const [adventures, setAdventures] = useState<Adventure[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [clarificationNeeded, setClarificationNeeded] = useState(false);
	const [clarificationMessage, setClarificationMessage] = useState('');
	const [suggestions, setSuggestions] = useState<string[]>([]);

	// Out-of-scope states
	const [outOfScope, setOutOfScope] = useState(false);
	const [scopeIssue, setScopeIssue] = useState<string | null>(null);
	const [recommendedServices, setRecommendedServices] = useState<any[]>([]);

	// ✅ NEW: Unrelated query state
	const [unrelatedQuery, setUnrelatedQuery] = useState(false);

	const [researchStats, setResearchStats] = useState<ResearchStats>({
		totalInsights: 0,
		avgConfidence: 0,
	});

	const generateAdventures = useCallback(async (query: string, location: string) => {
		if (!query.trim()) {
			setError('Please enter an adventure query');
			return;
		}

		console.log('🚀 Adventure generation starting...');
		console.log('Query:', query);
		console.log('Location:', location);

		// Reset all state
		setLoading(true);
		setError('');
		setAdventures([]);
		setClarificationNeeded(false);
		setClarificationMessage('');
		setSuggestions([]);
		setOutOfScope(false);
		setScopeIssue(null);
		setRecommendedServices([]);
		setUnrelatedQuery(false);  // ✅ NEW
		setResearchStats({ totalInsights: 0, avgConfidence: 0 });

		try {
			const requestData = {
				user_input: query,
				user_address: location,
			};

			console.log('📤 Sending to backend:', requestData);

			const response = await adventuresApi.generateAdventures(requestData);

			console.log('📥 Response received:', response);
			console.log('📊 Full metadata:', JSON.stringify(response.metadata, null, 2));

			// ✅ PRIORITY 1: Check for unrelated queries FIRST
			if (response.metadata?.unrelated_query === true) {
				console.log('🤷 UNRELATED QUERY DETECTED');
				console.log('Message:', response.metadata.clarification_message);

				setUnrelatedQuery(true);
				setClarificationMessage(
					response.metadata.clarification_message ||
					"I'm MiniQuest, your local adventure planning assistant! I help you discover places to explore. Ask me about museums, restaurants, parks, or other activities!"
				);
				setSuggestions(response.metadata.suggestions || [
					"Museums and coffee shops in Boston",
					"Parks and restaurants near me",
					"Art galleries and wine bars"
				]);

				setOutOfScope(false);
				setClarificationNeeded(false);

				setLoading(false);
				return;  // ✅ RETURN EARLY
			}

			// ✅ PRIORITY 2: Check out-of-scope
			if (response.metadata?.out_of_scope === true) {
				console.log('🚫 OUT OF SCOPE DETECTED');
				console.log('Scope issue:', response.metadata.scope_issue);
				console.log('Message:', response.metadata.clarification_message);
				console.log('Recommended services:', response.metadata.recommended_services);

				setOutOfScope(true);
				setScopeIssue(response.metadata.scope_issue || 'multi_day_trip');
				setClarificationMessage(response.metadata.clarification_message || 'This request is outside MiniQuest\'s scope');
				setSuggestions(response.metadata.suggestions || []);
				setRecommendedServices(response.metadata.recommended_services || []);

				setClarificationNeeded(false);
				setUnrelatedQuery(false);

				setLoading(false);
				return;  // ✅ RETURN EARLY
			}

			// ✅ PRIORITY 3: Check for regular clarification (too vague)
			if (response.metadata?.clarification_needed === true) {
				console.log('🤔 Clarification needed detected');
				console.log('Message:', response.metadata.clarification_message);
				console.log('Suggestions:', response.metadata.suggestions);

				setClarificationNeeded(true);
				setClarificationMessage(response.metadata.clarification_message || 'Please provide more details');
				setSuggestions(response.metadata.suggestions || []);

				setOutOfScope(false);
				setUnrelatedQuery(false);

				setLoading(false);
				return;  // ✅ RETURN EARLY
			}

			// ✅ PRIORITY 4: Handle successful response
			if (response.success && response.adventures && response.adventures.length > 0) {
				console.log('✅ Adventures generated:', response.adventures.length);
				setAdventures(response.adventures);

				const stats = calculateResearchStats(response.adventures);
				setResearchStats(stats);
				console.log('📊 Research stats:', stats);

				// Clear all error states
				setOutOfScope(false);
				setClarificationNeeded(false);
				setUnrelatedQuery(false);
			} else {
				console.warn('⚠️ No adventures in response');
				setError('No adventures could be generated');
			}
		} catch (err: any) {
			console.error('❌ Error:', err);
			console.error('Error details:', {
				message: err.message,
				response: err.response?.data,
				status: err.response?.status
			});

			setError(err.response?.data?.detail || err.message || 'An error occurred');
		} finally {
			setLoading(false);
		}
	}, []);

	return {
		adventures,
		loading,
		error,
		clarificationNeeded,
		clarificationMessage,
		suggestions,
		outOfScope,
		scopeIssue,
		recommendedServices,
		unrelatedQuery,  // ✅ NEW - Export this!
		researchStats,
		generateAdventures,
	};
};

// Helper function
function calculateResearchStats(adventures: Adventure[]): ResearchStats {
	let totalInsights = 0;
	let totalConfidence = 0;
	let venueCount = 0;

	adventures.forEach((adventure) => {
		if (adventure.venues_research) {
			adventure.venues_research.forEach((venue) => {
				totalInsights += venue.total_insights || 0;
				totalConfidence += venue.research_confidence || 0;
				venueCount++;
			});
		}
	});

	return {
		totalInsights,
		avgConfidence: venueCount > 0 ? totalConfidence / venueCount : 0,
	};
}