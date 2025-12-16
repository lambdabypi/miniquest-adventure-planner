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
		setResearchStats({ totalInsights: 0, avgConfidence: 0 });

		try {
			const requestData = {
				user_input: query,
				user_address: location,
			};

			console.log('📤 Sending to backend:', requestData);

			const response = await adventuresApi.generateAdventures(requestData);

			console.log('📥 Response received:', response);
			console.log('📊 Metadata:', response.metadata);

			// ✅ CRITICAL FIX: Check for clarification in metadata
			if (response.metadata?.clarification_needed) {
				console.log('🤔 Clarification needed detected');
				console.log('Message:', response.metadata.clarification_message);
				console.log('Suggestions:', response.metadata.suggestions);

				setClarificationNeeded(true);
				setClarificationMessage(response.metadata.clarification_message || 'Please provide more details');
				setSuggestions(response.metadata.suggestions || []);
				setLoading(false);
				return;
			}

			// ✅ Handle successful response
			if (response.success && response.adventures && response.adventures.length > 0) {
				console.log('✅ Adventures generated:', response.adventures.length);
				setAdventures(response.adventures);

				const stats = calculateResearchStats(response.adventures);
				setResearchStats(stats);
				console.log('📊 Research stats:', stats);
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