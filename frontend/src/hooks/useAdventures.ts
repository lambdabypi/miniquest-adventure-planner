// frontend/src/hooks/useAdventures.ts - WITH SSE STREAMING + FIXED TOKEN KEY
import { useState, useCallback } from 'react';
import { adventuresApi } from '../api/adventures';
import { Adventure, ResearchStats } from '../types/adventure';

// Progress tracking interface
interface ProgressUpdate {
	step: string;
	agent: string;
	status: 'in_progress' | 'complete' | 'error' | 'clarification_needed';
	message: string;
	progress: number;
	details?: any;
}

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

	// Unrelated query state
	const [unrelatedQuery, setUnrelatedQuery] = useState(false);

	// Metadata state
	const [metadata, setMetadata] = useState<any>(null);

	// Progress tracking states
	const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
	const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);

	const [researchStats, setResearchStats] = useState<ResearchStats>({
		totalInsights: 0,
		avgConfidence: 0,
	});

	// Clear adventures function
	const clearAdventures = useCallback(() => {
		console.log('🧹 Clearing adventures and all states');
		setAdventures([]);
		setError('');
		setClarificationNeeded(false);
		setClarificationMessage('');
		setSuggestions([]);
		setOutOfScope(false);
		setScopeIssue(null);
		setRecommendedServices([]);
		setUnrelatedQuery(false);
		setMetadata(null);
		setProgressUpdates([]);
		setCurrentProgress(null);
		setResearchStats({ totalInsights: 0, avgConfidence: 0 });
	}, []);

	// ✅ FIXED: SSE Streaming with correct token key
	const generateAdventuresWithStreaming = useCallback(async (
		query: string,
		location: string
	) => {
		if (!query.trim()) {
			setError('Please enter an adventure query');
			return;
		}

		console.log('🌊 SSE Streaming: Adventure generation starting...');
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
		setUnrelatedQuery(false);
		setMetadata(null);
		setProgressUpdates([]);
		setCurrentProgress(null);
		setResearchStats({ totalInsights: 0, avgConfidence: 0 });

		try {
			// ✅ CRITICAL FIX: Use 'auth_token' to match AuthContext
			const token = localStorage.getItem('auth_token');  // ✅ Correct key!
			if (!token) {
				console.error('❌ No token found. Available keys:', Object.keys(localStorage));
				throw new Error('No authentication token found. Please log in.');
			}

			const apiUrl = (import.meta.env.VITE_API_URL as string) || '';
			const endpoint = apiUrl ? `${apiUrl}/api/adventures/generate-stream` : '/api/adventures/generate-stream';

			console.log('📤 Connecting to SSE endpoint:', endpoint);
			console.log('🔐 Token found:', token.substring(0, 20) + '...');

			// ✅ Proper headers with authentication
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
					'Accept': 'text/event-stream'
				},
				credentials: 'include',
				body: JSON.stringify({
					user_input: query,
					user_address: location,
					enable_progress: true
				})
			});

			// ✅ Better error handling
			if (!response.ok) {
				const errorText = await response.text();
				console.error('❌ SSE connection failed:', {
					status: response.status,
					statusText: response.statusText,
					body: errorText
				});
				throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
			}

			if (!response.body) {
				throw new Error('Response body is null');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			console.log('✅ SSE connection established, reading stream...');

			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					console.log('✅ Stream complete');
					break;
				}

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n');

				for (const line of lines) {
					// Skip empty lines and comments (heartbeats)
					if (!line.trim() || line.startsWith(':')) {
						continue;
					}

					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(6));

							// ✅ Check if this is the final result
							if (data.done) {
								console.log('🏁 Final result received:', data);

								if (!data.success) {
									// Handle errors
									const errorMetadata = data.metadata || {};

									if (errorMetadata.unrelated_query === true) {
										console.log('🤷 Unrelated query');
										setUnrelatedQuery(true);
										setClarificationMessage(errorMetadata.clarification_message || "I'm MiniQuest - I help plan local adventures!");
										setSuggestions(errorMetadata.suggestions || []);
									} else if (errorMetadata.out_of_scope === true) {
										console.log('🚫 Out of scope:', errorMetadata.scope_issue);
										setOutOfScope(true);
										setScopeIssue(errorMetadata.scope_issue || 'multi_day_trip');
										setClarificationMessage(errorMetadata.clarification_message || 'Outside MiniQuest scope');
										setSuggestions(errorMetadata.suggestions || []);
										setRecommendedServices(errorMetadata.recommended_services || []);
										setMetadata({ detected_city: errorMetadata.detected_city });
									} else if (errorMetadata.clarification_needed === true) {
										console.log('🤔 Clarification needed');
										setClarificationNeeded(true);
										setClarificationMessage(errorMetadata.clarification_message || 'Please be more specific');
										setSuggestions(errorMetadata.suggestions || []);
									} else {
										setError(data.error || data.message || 'An error occurred');
									}

									setMetadata(data.metadata);
								} else {
									// ✅ Success - set adventures
									console.log('✅ Adventures received:', data.adventures.length);
									setAdventures(data.adventures);
									setMetadata(data.metadata);

									const stats = calculateResearchStats(data.adventures);
									setResearchStats(stats);

									// Clear error states
									setOutOfScope(false);
									setClarificationNeeded(false);
									setUnrelatedQuery(false);
								}

								setLoading(false);
								return;
							} else {
								// ✅ Progress update
								console.log('📊 Progress:', data.agent, '-', data.message, `(${Math.round(data.progress * 100)}%)`);

								setProgressUpdates(prev => [...prev, data]);
								setCurrentProgress(data);
							}
						} catch (parseError) {
							console.error('Failed to parse SSE data:', parseError, 'Line:', line);
						}
					}
				}
			}
		} catch (err: any) {
			console.error('❌ SSE Error:', err);
			setError(err.message || 'Failed to generate adventures');
			setLoading(false);
		}
	}, []);

	// ✅ Standard generation (non-streaming) - keep for backward compatibility
	const generateAdventures = useCallback(async (
		query: string,
		location: string,
		enableProgress: boolean = false
	) => {
		if (!query.trim()) {
			setError('Please enter an adventure query');
			return;
		}

		console.log('🚀 Adventure generation starting...');
		console.log('Query:', query);
		console.log('Location:', location);
		console.log('Progress tracking:', enableProgress ? 'ENABLED' : 'DISABLED');

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
		setUnrelatedQuery(false);
		setMetadata(null);
		setProgressUpdates([]);
		setCurrentProgress(null);
		setResearchStats({ totalInsights: 0, avgConfidence: 0 });

		try {
			const requestData = {
				user_input: query,
				user_address: location,
				enable_progress: enableProgress
			};

			console.log('📤 Sending to backend:', requestData);

			const response = await adventuresApi.generateAdventures(requestData);

			console.log('📥 Response received:', response);

			// Store metadata
			setMetadata(response.metadata);

			// Extract progress log if present
			const progressLog = response.metadata?.progress_log || [];
			if (progressLog.length > 0) {
				console.log('📊 Progress log entries:', progressLog.length);
				setProgressUpdates(progressLog);
				setCurrentProgress(progressLog[progressLog.length - 1]);
			}

			// Handle errors (same as before)
			if (response.metadata?.unrelated_query === true) {
				console.log('🤷 UNRELATED QUERY DETECTED');
				setUnrelatedQuery(true);
				setClarificationMessage(
					response.metadata.clarification_message ||
					"I'm MiniQuest, your local adventure planning assistant!"
				);
				setSuggestions(response.metadata.suggestions || []);
				setOutOfScope(false);
				setClarificationNeeded(false);
				setLoading(false);
				return;
			}

			if (response.metadata?.out_of_scope === true) {
				console.log('🚫 OUT OF SCOPE DETECTED');
				setOutOfScope(true);
				setScopeIssue(response.metadata.scope_issue || 'multi_day_trip');
				setClarificationMessage(response.metadata.clarification_message || 'Outside scope');
				setSuggestions(response.metadata.suggestions || []);
				setRecommendedServices(response.metadata.recommended_services || []);
				setClarificationNeeded(false);
				setUnrelatedQuery(false);
				setLoading(false);
				return;
			}

			if (response.metadata?.clarification_needed === true) {
				console.log('🤔 Clarification needed');
				setClarificationNeeded(true);
				setClarificationMessage(response.metadata.clarification_message || 'Please provide more details');
				setSuggestions(response.metadata.suggestions || []);
				setOutOfScope(false);
				setUnrelatedQuery(false);
				setLoading(false);
				return;
			}

			if (response.success && response.adventures && response.adventures.length > 0) {
				console.log('✅ Adventures generated:', response.adventures.length);
				setAdventures(response.adventures);

				const stats = calculateResearchStats(response.adventures);
				setResearchStats(stats);

				// Clear error states
				setOutOfScope(false);
				setClarificationNeeded(false);
				setUnrelatedQuery(false);
			} else {
				console.warn('⚠️ No adventures in response');
				setError('No adventures could be generated');
			}
		} catch (err: any) {
			console.error('❌ Error:', err);
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
		unrelatedQuery,
		metadata,
		progressUpdates,
		currentProgress,
		researchStats,
		generateAdventures,  // Standard (backward compatible)
		generateAdventuresWithStreaming,  // ✅ FIXED: Real-time streaming with correct token
		clearAdventures,
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