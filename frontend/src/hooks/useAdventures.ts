// frontend/src/hooks/useAdventures.ts
import { useState, useCallback } from 'react';
import { adventuresApi } from '../api/adventures';
import { Adventure, ResearchStats } from '../types/adventure';
import { ProgressUpdate, AdventureMetadata } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

console.log('🔧 useAdventures: API_BASE_URL =', API_BASE_URL);

export const useAdventures = () => {
	const [adventures, setAdventures] = useState<Adventure[]>(() => {
		try {
			const cached = localStorage.getItem('miniquest_last_adventures');
			return cached ? JSON.parse(cached) : [];
		} catch { return []; }
	});

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

	const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
	const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);

	const [researchStats, setResearchStats] = useState<ResearchStats>(() => {
		try {
			const cached = localStorage.getItem('miniquest_last_research_stats');
			return cached ? JSON.parse(cached) : { totalInsights: 0, avgConfidence: 0 };
		} catch { return { totalInsights: 0, avgConfidence: 0 }; }
	});

	// ── Persist adventures + stats to localStorage ───────────────────────────
	const persistAdventures = useCallback((newAdventures: Adventure[], stats: ResearchStats) => {
		setAdventures(newAdventures);
		setResearchStats(stats);
		try {
			localStorage.setItem('miniquest_last_adventures', JSON.stringify(newAdventures));
			localStorage.setItem('miniquest_last_research_stats', JSON.stringify(stats));
		} catch { /* quota exceeded — silently ignore */ }
	}, []);

	// ── Clear everything including cache ─────────────────────────────────────
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
		localStorage.removeItem('miniquest_last_adventures');
		localStorage.removeItem('miniquest_last_research_stats');
	}, []);

	// ── SSE streaming generation ──────────────────────────────────────────────
	const generateAdventuresWithStreaming = useCallback(async (query: string, location: string) => {
		if (!query.trim()) {
			setError('Please enter an adventure query');
			return;
		}

		console.log('🌊 SSE STREAMING: Starting...');
		setLoading(true);
		clearAdventures();

		try {
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

			if (!reader) throw new Error('No reader available');

			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					console.log('✅ Stream complete');
					break;
				}

				const chunk = decoder.decode(value, { stream: true });
				buffer += chunk;

				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.trim() || line.startsWith(':')) continue;

					if (line.startsWith('data: ')) {
						const jsonStr = line.substring(6).trim();
						if (!jsonStr) continue;

						try {
							const data = JSON.parse(jsonStr);
							console.log('📦 SSE Message:', data);

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

							if (data.done) {
								console.log('✅ Final SSE message:', data);

								if (data.success && data.adventures?.length > 0) {
									const stats = calculateResearchStats(data.adventures);
									persistAdventures(data.adventures, stats);
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
						}
					}
				}
			}
		} catch (err: any) {
			console.error('❌ SSE Error:', err);
			setError(err.message || 'An error occurred');
			setLoading(false);
		}
	}, [clearAdventures, persistAdventures]);

	// ── Non-streaming generation ──────────────────────────────────────────────
	const generateAdventures = useCallback(async (query: string, location: string) => {
		if (!query.trim()) {
			setError('Please enter an adventure query');
			return;
		}

		console.log('🚀 Adventure generation starting...');
		setLoading(true);
		clearAdventures();

		try {
			const response = await adventuresApi.generateAdventures({
				user_input: query,
				user_address: location,
			});

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
				const stats = calculateResearchStats(response.adventures);
				persistAdventures(response.adventures, stats);
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
	}, [clearAdventures, persistAdventures]);

	const handleClarificationNeeded = (meta: AdventureMetadata) => {
		if (meta.unrelated_query) {
			setUnrelatedQuery(true);
			setClarificationMessage(meta.clarification_message || '');
			setSuggestions(meta.suggestions || []);
		} else if (meta.out_of_scope) {
			setOutOfScope(true);
			setScopeIssue(meta.scope_issue || 'multi_day_trip');
			setClarificationMessage(meta.clarification_message || '');
			setSuggestions(meta.suggestions || []);
			setRecommendedServices(meta.recommended_services || []);
		} else {
			setClarificationNeeded(true);
			setClarificationMessage(meta.clarification_message || '');
			setSuggestions(meta.suggestions || []);
		}
	};

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

	adventures.forEach(adventure => {
		if (adventure.venues_research) {
			adventure.venues_research.forEach(venue => {
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