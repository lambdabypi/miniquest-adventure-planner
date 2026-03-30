// frontend/src/pages/SavedAdventuresPage.tsx
import React, { useEffect, useState } from 'react';
import { savedAdventuresApi } from '../api/savedAdventures';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import { useTheme, t } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface ResearchSummary {
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

interface VenueWithResearch {
	venue_name?: string;
	matched_to?: string;
	research_confidence?: number;
	total_insights?: number;
	research_summary?: ResearchSummary;
}

interface SavedAdventure {
	_id: string;
	adventure_data: {
		title: string;
		tagline: string;
		duration: number;
		cost: number;
		steps?: Array<{ time: string; activity: string; details: string }>;
		map_url?: string;
		venues_research?: VenueWithResearch[];
	};
	rating: number | null;
	notes: string | null;
	saved_at: string;
	completed: boolean;
	tags?: string[];
}

const getStyles = (isDark: boolean) => {
	const tk = t(isDark);
	return {
		filterBtn: {
			background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
			border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
			padding: '9px 18px', borderRadius: '8px',
			fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
			color: tk.textSecondary, transition: 'all 0.2s',
		} as React.CSSProperties,
		filterBtnActive: {
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			color: 'white', borderColor: 'transparent',
		} as React.CSSProperties,
		adventureCard: {
			background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
			borderRadius: '16px', padding: '20px',
			boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
			border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
			transition: 'all 0.3s',
		} as React.CSSProperties,
		cardDivider: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
		titleColor: tk.textPrimary,
		taglineColor: tk.textSecondary,
		dateColor: tk.textMuted,
		statCard: {
			textAlign: 'center' as const,
			backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
			padding: '10px 8px', borderRadius: '8px',
			border: isDark ? '1px solid rgba(255,255,255,0.06)' : 'none',
		} as React.CSSProperties,
		statLabel: { fontSize: '11px', color: tk.textMuted },
		researchBox: {
			backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4',
			border: `2px solid ${isDark ? 'rgba(16,185,129,0.25)' : '#bbf7d0'}`,
			borderRadius: '12px', padding: '16px', marginBottom: '16px',
		} as React.CSSProperties,
		researchTitle: isDark ? '#6ee7b7' : '#15803d',
		venueCard: {
			backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'white',
			border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#d1d5db'}`,
			borderRadius: '12px', padding: '16px',
		} as React.CSSProperties,
		venueDivider: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
		venueNameColor: tk.textPrimary,
		summaryText: {
			color: tk.textSecondary, fontSize: '13px', lineHeight: '1.6',
			marginBottom: '12px', fontStyle: 'italic' as const,
		} as React.CSSProperties,
		highlightBadge: {
			fontSize: '11px', color: isDark ? '#93c5fd' : '#374151',
			backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe',
			border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#3b82f6'}`,
			padding: '5px 8px', borderRadius: '6px',
		} as React.CSSProperties,
		tipStyle: {
			fontSize: '12px', color: isDark ? '#fcd34d' : '#374151',
			backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7',
			border: `1px solid ${isDark ? 'rgba(245,158,11,0.25)' : '#fbbf24'}`,
			padding: '9px', borderRadius: '6px', marginBottom: '6px', lineHeight: '1.5',
		} as React.CSSProperties,
		infoCard: {
			backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
			padding: '10px', borderRadius: '8px',
			border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
		} as React.CSSProperties,
		infoLabel: { fontSize: '11px', color: tk.textMuted, marginBottom: '3px', fontWeight: 600 },
		infoValue: { fontSize: '12px', color: tk.textPrimary, lineHeight: '1.4' },
		sectionLabel: { fontSize: '12px', fontWeight: 600, color: isDark ? '#6ee7b7' : '#15803d', marginBottom: '7px' },
		metaStyle: {
			fontSize: '11px', color: tk.textMuted,
			borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb'}`,
			paddingTop: '8px', marginTop: '10px', fontStyle: 'italic' as const,
		} as React.CSSProperties,
		stepRow: {
			display: 'flex', gap: '10px', marginBottom: '10px', padding: '12px',
			backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
			borderRadius: '10px',
			border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
		} as React.CSSProperties,
		stepActivity: { fontWeight: 600, marginBottom: '3px', color: tk.textPrimary, fontSize: '0.88rem' },
		stepDetails: { fontSize: '13px', color: tk.textSecondary },
		notesBox: {
			backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7',
			border: `1px solid ${isDark ? 'rgba(245,158,11,0.25)' : '#fbbf24'}`,
			padding: '10px', borderRadius: '8px',
			fontSize: '0.88rem', color: isDark ? '#fcd34d' : '#78350f', marginBottom: '10px',
		} as React.CSSProperties,
		itineraryTitle: { color: tk.textPrimary, marginBottom: '12px', fontSize: '1rem' },
	};
};

const SavedAdventuresPage: React.FC = () => {
	const [adventures, setAdventures] = useState<SavedAdventure[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
	const [expandedAdventure, setExpandedAdventure] = useState<string | null>(null);
	const { isDark } = useTheme();
	const isMobile = useIsMobile();
	const tk = t(isDark);
	const s = getStyles(isDark);

	useEffect(() => { fetchSavedAdventures(); }, [filter]);

	const fetchSavedAdventures = async () => {
		try {
			setLoading(true);
			const response = await savedAdventuresApi.getSavedAdventures(
				50, filter === 'all' ? undefined : filter === 'completed'
			);
			setAdventures(response.adventures);
		} catch (error) {
			console.error('Error fetching saved adventures:', error);
		} finally {
			setLoading(false);
		}
	};

	const markAsCompleted = async (id: string) => {
		try {
			await savedAdventuresApi.updateSavedAdventure(id, { completed: true });
			fetchSavedAdventures();
		} catch (error) { console.error(error); }
	};

	const deleteAdventure = async (id: string) => {
		if (!confirm('Are you sure you want to delete this adventure?')) return;
		try {
			await savedAdventuresApi.deleteSavedAdventure(id);
			fetchSavedAdventures();
		} catch (error) { console.error(error); }
	};

	const toggleExpand = (id: string) => setExpandedAdventure(expandedAdventure === id ? null : id);

	return (
		<div className="page-content" style={{ background: 'transparent', color: tk.textPrimary }}>
			<h1 className="page-header" style={{ color: tk.textPrimary, fontSize: isMobile ? '1.6rem' : '2.5rem' }}>
				💾 Saved Adventures
			</h1>

			{/* Filter tabs */}
			<div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
				{(['all', 'active', 'completed'] as const).map(f => (
					<button key={f} onClick={() => setFilter(f)} style={{
						...s.filterBtn,
						...(filter === f ? s.filterBtnActive : {}),
					}}>
						{f === 'all' ? `All (${adventures.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
					</button>
				))}
			</div>

			{loading ? (
				<LoadingState message="Loading your saved adventures..." />
			) : adventures.length === 0 ? (
				<EmptyState title="No saved adventures yet" message="Start exploring and save your favorite adventures!" />
			) : (
				<div style={{ display: 'grid', gap: '16px' }}>
					{adventures.map((saved) => {
						const isExpanded = expandedAdventure === saved._id;
						const adv = saved.adventure_data;
						return (
							<div key={saved._id} style={s.adventureCard}>
								{/* Header */}
								<div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: s.cardDivider }}>
									{/* Title row */}
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: '8px' }}>
										<h3 style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', color: s.titleColor, flex: 1, lineHeight: 1.3 }}>
											{adv.title}
											{saved.completed && (
												<span style={{ display: 'inline-block', marginLeft: 8, backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, verticalAlign: 'middle' }}>✓ Done</span>
											)}
										</h3>
										{/* Action buttons - icon-only on mobile */}
										<div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
											<button onClick={() => toggleExpand(saved._id)}
												style={{ background: isExpanded ? '#3b82f6' : '#667eea', color: 'white', border: 'none', borderRadius: '8px', padding: isMobile ? '8px 10px' : '9px 13px', cursor: 'pointer', fontSize: '0.9rem' }}>
												{isExpanded ? '🔼' : '🔽'}
											</button>
											{!saved.completed && (
												<button onClick={() => markAsCompleted(saved._id)}
													style={{ background: '#48bb78', color: 'white', border: 'none', borderRadius: '8px', padding: isMobile ? '8px 10px' : '9px 13px', cursor: 'pointer', fontSize: '0.9rem' }}>✓</button>
											)}
											<button onClick={() => deleteAdventure(saved._id)}
												style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: isMobile ? '8px 10px' : '9px 13px', cursor: 'pointer', fontSize: '0.9rem' }}>🗑️</button>
										</div>
									</div>

									<p style={{ color: s.taglineColor, fontStyle: 'italic', fontSize: '0.88rem', marginBottom: 8 }}>{adv.tagline}</p>
									{saved.rating && <div style={{ marginBottom: '6px', fontSize: '1rem' }}>{'⭐'.repeat(saved.rating)}</div>}
									{(saved.tags?.length ?? 0) > 0 && (
										<div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
											{saved.tags!.map((tag, i) => (
												<span key={i} style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff', color: isDark ? '#a5b4fc' : '#4338ca', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{tag}</span>
											))}
										</div>
									)}
									{saved.notes && <div style={s.notesBox}><strong>📝 Notes:</strong> {saved.notes}</div>}
									<div style={{ fontSize: '0.78rem', color: s.dateColor }}>
										Saved {new Date(saved.saved_at).toLocaleDateString()}
									</div>
								</div>

								{/* Stats - 3 col on all sizes, compact on mobile */}
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
									{[
										{ val: `${adv.duration}min`, label: 'Duration', color: '#059669' },
										{ val: `$${adv.cost}`, label: 'Est. Cost', color: '#dc2626' },
										{ val: adv.steps?.length ?? 0, label: 'Stops', color: '#2563eb' },
									].map(({ val, label, color }) => (
										<div key={label} style={s.statCard}>
											<div style={{ fontWeight: 'bold', color, fontSize: isMobile ? '14px' : '16px' }}>{val}</div>
											<div style={s.statLabel}>{label}</div>
										</div>
									))}
								</div>

								{/* Expanded */}
								{isExpanded && (
									<div style={{ marginTop: '16px' }}>
										{/* Venue research */}
										{(adv.venues_research?.length ?? 0) > 0 && (
											<div style={s.researchBox}>
												<h4 style={{ color: s.researchTitle, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: isMobile ? '0.9rem' : '1rem' }}>
													✨ AI-Summarized Venue Insights
													<span style={{ backgroundColor: '#16a34a', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>LIVE</span>
												</h4>
												<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
													{adv.venues_research!.map((venue, idx) => {
														const name = venue.venue_name ?? venue.matched_to ?? 'Unknown Venue';
														const summary = venue.research_summary;
														if (!summary) return (
															<div key={idx} style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px' }}>
																<h5 style={{ color: '#dc2626', margin: 0, fontSize: '0.88rem' }}>⚠️ {name} (No Summary)</h5>
															</div>
														);
														return (
															<div key={idx} style={s.venueCard}>
																<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: s.venueDivider, flexWrap: 'wrap', gap: 8 }}>
																	<h5 style={{ color: s.venueNameColor, margin: 0, fontSize: isMobile ? '0.88rem' : '15px', fontWeight: 700 }}>📍 {name}</h5>
																	<div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
																		{Math.round((venue.research_confidence ?? 0) * 100)}% Confidence
																	</div>
																</div>
																<p style={s.summaryText}>{summary.visitor_summary}</p>
																{(summary.key_highlights?.length ?? 0) > 0 && (
																	<div style={{ marginBottom: '12px' }}>
																		<div style={s.sectionLabel}>⭐ Highlights:</div>
																		<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
																			{summary.key_highlights.map((h, i) => <div key={i} style={s.highlightBadge}>✓ {h}</div>)}
																		</div>
																	</div>
																)}
																{summary.practical_info && (
																	<div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '12px' }}>
																		{summary.practical_info.best_time_to_visit && <InfoCard icon="📅" label="Best Time" value={summary.practical_info.best_time_to_visit} s={s} />}
																		{summary.practical_info.typical_duration && <InfoCard icon="⏱️" label="Duration" value={summary.practical_info.typical_duration} s={s} />}
																		{summary.practical_info.admission && <InfoCard icon="🎫" label="Admission" value={summary.practical_info.admission} s={s} />}
																	</div>
																)}
																{(summary.practical_info?.insider_tips?.length ?? 0) > 0 && (
																	<div>
																		<div style={s.sectionLabel}>💡 Insider Tips:</div>
																		{summary.practical_info!.insider_tips!.map((tip, i) => <div key={i} style={s.tipStyle}>✓ {tip}</div>)}
																	</div>
																)}
																<div style={s.metaStyle}>📊 {summary.confidence_notes} | {venue.total_insights ?? 0} insights</div>
															</div>
														);
													})}
												</div>
											</div>
										)}

										{/* Itinerary */}
										{(adv.steps?.length ?? 0) > 0 && (
											<div style={{ marginBottom: '16px' }}>
												<h4 style={s.itineraryTitle}>📍 Itinerary</h4>
												{adv.steps!.map((step, idx) => (
													<div key={idx} style={s.stepRow}>
														<div style={{ backgroundColor: '#2563eb', color: 'white', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, minWidth: '60px', textAlign: 'center', height: 'fit-content', whiteSpace: 'nowrap' }}>
															{step.time}
														</div>
														<div style={{ flex: 1, minWidth: 0 }}>
															<div style={s.stepActivity}>{step.activity}</div>
															<div style={s.stepDetails}>{step.details}</div>
														</div>
													</div>
												))}
											</div>
										)}

										{/* Map */}
										{adv.map_url && (
											<a href={adv.map_url} target="_blank" rel="noopener noreferrer"
												style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#059669', color: 'white', textDecoration: 'none', padding: '11px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}>
												🗺️ Open Route in Google Maps
											</a>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

const InfoCard: React.FC<{ icon: string; label: string; value: string; s: ReturnType<typeof getStyles> }> = ({ icon, label, value, s }) => (
	<div style={s.infoCard}>
		<div style={s.infoLabel}>{icon} {label}</div>
		<div style={s.infoValue}>{value}</div>
	</div>
);

export default SavedAdventuresPage;