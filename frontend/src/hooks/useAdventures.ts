// frontend/src/hooks/useAdventures.ts - FIXED SSE URL + Complete Implementation
import { useState, useCallback } from 'react';
import { adventuresApi } from '../api/adventures';
import { Adventure, ResearchStats } from '../types/adventure';
import { ProgressUpdate, AdventureMetadata } from '../types/api';

// ✅ Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

console.log('🔧 useAdventures: API_BASE_URL =', API_BASE_URL);

export const useAdventures = () => {
	const [adventures, setAdventures] = useState<Adventure[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [clarificationNeeded, setClarificationNeeded] = useState(false);
	const [clarificationMessage, setClarificationMessage] = useState('');
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [outOfScope, setOutOfScope] = useState(false);
	const [scopeIssue, setScopeIssue] = useState<string | null>(null);
	const [recommendedServices, setRecommendedServices] = useState<any[]>([]);
	const [unrelatedQuery, setUnrelatedQuery] = useState(false);
	const [metadata, setMetadata] = useState<AdventureMetadata | undefined>();

	// ✅ Progress tracking
	const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
	const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);

	const [researchStats, setResearchStats] = useState<ResearchStats>({
		totalInsights: 0,
		avgConfidence: 0,
	});

	const clearAdventures = useCallback(() => {
		setAdventures([]);
		setError('');
		setClarificationNeeded(false);
		setClarificationMessage('');
		setSuggestions([]);
		setOutOfScope(false);
		setScopeIssue(null);
		setRecommendedServices([]);
		setUnrelatedQuery(false);
		setMetadata(undefined);
		setProgressUpdates([]);
		setCurrentProgress(null);
		setResearchStats({ totalInsights: 0, avgConfidence: 0 });
	}, []);

	const generateAdventuresWithStreaming = useCallback(async (query: string, location: string) => {
		if (!query.trim()) {
			setError('Please enter an adventure query');
			return;
		}

		console.log('🌊 SSE STREAMING: Starting...');
		setLoading(true);
		clearAdventures();

		try {
			// ✅ FIX: Use environment variable instead of hardcoded localhost
			const sseUrl = `${API_BASE_URL}/api/adventures/generate-stream`;
			console.log('📡 SSE URL:', sseUrl);

			const response = await fetch(sseUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
				},
				body: JSON.stringify({
					user_input: query,
					user_address: location,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error('No reader available');
			}

			// ✅ Buffer for incomplete JSON chunks
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					console.log('✅ Stream complete');
					break;
				}

				// Decode chunk
				const chunk = decoder.decode(value, { stream: true });
				buffer += chunk;

				// ✅ Process all complete messages in buffer
				const lines = buffer.split('\n');

				// Keep last incomplete line in buffer
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.trim() || line.startsWith(':')) {
						// Skip empty lines and heartbeat comments
						continue;
					}

					if (line.startsWith('data: ')) {
						const jsonStr = line.substring(6).trim();

						if (!jsonStr) continue;

						try {
							const data = JSON.parse(jsonStr);
							console.log('📦 SSE Message:', data);

							// Handle progress updates
							if (!data.done) {
								const progress: ProgressUpdate = {
									step: data.step || 'unknown',
									agent: data.agent || 'Unknown',
									status: data.status || 'in_progress',
									message: data.message || '',
									progress: data.progress || 0,
									details: data.details,
								};

								setProgressUpdates(prev => [...prev, progress]);
								setCurrentProgress(progress);
							}

							// Handle final response
							if (data.done) {
								console.log('✅ Final SSE message:', data);

								if (data.success && data.adventures?.length > 0) {
									setAdventures(data.adventures);
									const stats = calculateResearchStats(data.adventures);
									setResearchStats(stats);
									setMetadata(data.metadata);
								} else if (data.metadata?.clarification_needed) {
									handleClarificationNeeded(data.metadata);
								} else if (data.error) {
									setError(data.error);
								}

								setLoading(false);
							}
						} catch (parseError: any) {
							console.warn('⚠️ Failed to parse SSE chunk (incomplete):', parseError.message);
							// ✅ Don't throw - this is expected for split JSON
							// The next chunk will complete it
						}
					}
				}
			}
		} catch (err: any) {
			console.error('❌ SSE Error:', err);
			setError(err.message || 'An error occurred');
			setLoading(false);
		}
	}, [clearAdventures]);

	const handleClarificationNeeded = (metadata: AdventureMetadata) => {
		if (metadata.unrelated_query) {
			setUnrelatedQuery(true);
			setClarificationMessage(metadata.clarification_message || '');
			setSuggestions(metadata.suggestions || []);
		} else if (metadata.out_of_scope) {
			setOutOfScope(true);
			setScopeIssue(metadata.scope_issue || 'multi_day_trip');
			setClarificationMessage(metadata.clarification_message || '');
			setSuggestions(metadata.suggestions || []);
			setRecommendedServices(metadata.recommended_services || []);
		} else {
			setClarificationNeeded(true);
			setClarificationMessage(metadata.clarification_message || '');
			setSuggestions(metadata.suggestions || []);
		}
	};

	const generateAdventures = useCallback(async (query: string, location: string) => {
		if (!query.trim()) {
			setError('Please enter an adventure query');
			return;
		}

		console.log('🚀 Adventure generation starting...');
		console.log('API Base URL:', API_BASE_URL);
		setLoading(true);
		clearAdventures();

		try {
			const requestData = {
				user_input: query,
				user_address: location,
			};

			const response = await adventuresApi.generateAdventures(requestData);

			if (response.metadata?.unrelated_query) {
				setUnrelatedQuery(true);
				setClarificationMessage(response.metadata.clarification_message || '');
				setSuggestions(response.metadata.suggestions || []);
			} else if (response.metadata?.out_of_scope) {
				setOutOfScope(true);
				setScopeIssue(response.metadata.scope_issue || 'multi_day_trip');
				setClarificationMessage(response.metadata.clarification_message || '');
				setSuggestions(response.metadata.suggestions || []);
				setRecommendedServices(response.metadata.recommended_services || []);
			} else if (response.metadata?.clarification_needed) {
				setClarificationNeeded(true);
				setClarificationMessage(response.metadata.clarification_message || '');
				setSuggestions(response.metadata.suggestions || []);
			} else if (response.adventures && response.adventures.length > 0) {
				setAdventures(response.adventures);
				const stats = calculateResearchStats(response.adventures);
				setResearchStats(stats);
				setMetadata(response.metadata);
			} else {
				setError('No adventures could be generated');
			}
		} catch (err: any) {
			console.error('❌ Error:', err);
			setError(err.response?.data?.detail || err.message || 'An error occurred');
		} finally {
			setLoading(false);
		}
	}, [clearAdventures]);

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
		unrelatedQuery,
		metadata,
		progressUpdates,
		currentProgress,
		researchStats,
		generateAdventures,
		generateAdventuresWithStreaming,
		clearAdventures,
	};
};

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