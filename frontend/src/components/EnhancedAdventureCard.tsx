// frontend/src/components/EnhancedAdventureCard.tsx
import React, { useState } from 'react';
import { savedAdventuresApi } from '../api/savedAdventures';
import { Adventure } from '../types/adventure';
import { useTheme, t } from '../contexts/ThemeContext';
import ShareCard from './ShareCard';

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
	name?: string;
	venue_name?: string;
	matched_to?: string;
	research_confidence?: number;
	total_insights?: number;
	research_summary?: ResearchSummary;
	current_info?: string;
	hours_info?: string;
	visitor_tips?: string[];
}

interface Props {
	adventure: Adventure;
	index: number;
	onSave?: (adventureId: string) => void;
}

const EnhancedAdventureCard: React.FC<Props> = ({ adventure, index, onSave }) => {
	const { isDark } = useTheme();
	const tk = t(isDark);

	const [showResearchDetails, setShowResearchDetails] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isSaved, setIsSaved] = useState(false);
	const [showRatingModal, setShowRatingModal] = useState(false);
	const [rating, setRating] = useState<number | null>(null);
	const [notes, setNotes] = useState('');

	const borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
	const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
	const sectionBg = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
	const researchBg = isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4';
	const researchBorder = isDark ? 'rgba(16,185,129,0.25)' : '#bbf7d0';

	const researchStats = {
		quality: adventure.venues_research
			? adventure.venues_research.reduce((acc, v) => acc + (v.research_confidence || 0), 0) / adventure.venues_research.length
			: 0,
		insights: adventure.venues_research
			? adventure.venues_research.reduce((acc, v) => acc + (v.total_insights || 0), 0)
			: 0,
	};

	const handleSaveClick = () => setShowRatingModal(true);

	const handleConfirmSave = async () => {
		try {
			setIsSaving(true);
			const response = await savedAdventuresApi.saveAdventure({
				adventure_data: adventure,
				rating: rating || undefined,
				notes: notes || undefined,
				tags: [],
			});
			if (response.success) {
				setIsSaved(true);
				setShowRatingModal(false);
				if (onSave) onSave(response.adventure_id);
			}
		} catch (error) {
			console.error('Error saving adventure:', error);
			alert('Failed to save adventure. Please try logging in again.');
		} finally {
			setIsSaving(false);
		}
	};

	const calculateDiversity = (adv: Adventure) => {
		const types = new Set(adv.venues_research?.map(v => v.venue_name?.split(' ')[0]) || []);
		return Math.min(100, types.size * 25);
	};

	return (
		<div style={{
			backgroundColor: cardBg,
			border: `2px solid ${borderColor}`,
			borderRadius: 16,
			padding: 25,
			boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.07)',
			position: 'relative',
			backdropFilter: 'blur(12px)',
		}}>
			{/* ── Header ── */}
			<div style={{ borderBottom: `1px solid ${borderColor}`, paddingBottom: 15, marginBottom: 20 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
					<div style={{ flex: 1 }}>
						<h3 style={{ color: tk.textPrimary, margin: '0 0 8px 0', fontSize: '1.4rem' }}>
							{adventure.title}
						</h3>
						<p style={{ color: tk.textMuted, margin: 0, fontStyle: 'italic', fontSize: '0.9rem' }}>
							{adventure.tagline}
						</p>
					</div>
					<button
						onClick={handleSaveClick}
						disabled={isSaved}
						style={{
							background: isSaved
								? '#10b981'
								: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							color: 'white', border: 'none',
							padding: '10px 20px', borderRadius: 8,
							fontSize: '0.9rem', fontWeight: 600,
							cursor: isSaved ? 'default' : 'pointer',
							marginLeft: 15, whiteSpace: 'nowrap',
							transition: 'transform 0.2s',
						}}
						onMouseEnter={e => { if (!isSaved) e.currentTarget.style.transform = 'scale(1.04)'; }}
						onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
					>
						{isSaved ? '✓ Saved' : '💾 Save'}
					</button>
				</div>

				{/* Research quality badge */}
				{researchStats.insights > 0 && (
					<div style={{
						backgroundColor: researchStats.quality > 0.6
							? (isDark ? 'rgba(16,185,129,0.15)' : '#dcfce7')
							: (isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7'),
						border: `1px solid ${researchStats.quality > 0.6
							? (isDark ? 'rgba(16,185,129,0.35)' : '#16a34a')
							: (isDark ? 'rgba(245,158,11,0.35)' : '#f59e0b')}`,
						borderRadius: 12, padding: '8px 12px',
						display: 'inline-flex', alignItems: 'center', gap: 6,
					}}>
						<span style={{ fontSize: 14 }}>📊</span>
						<div style={{ fontSize: 12, fontWeight: 600 }}>
							<div style={{ color: researchStats.quality > 0.6 ? (isDark ? '#6ee7b7' : '#15803d') : (isDark ? '#fcd34d' : '#d97706') }}>
								{Math.round(researchStats.quality * 100)}% Research Quality
							</div>
							<div style={{ color: tk.textMuted, fontSize: 10 }}>
								{researchStats.insights} insights
							</div>
						</div>
					</div>
				)}
			</div>

			{/* ── Stats grid ── */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15, marginBottom: 20 }}>
				<StatCard value={`${calculateDiversity(adventure)}%`} label="Diversity" color="#8b5cf6" isDark={isDark} />
				<StatCard value={adventure.steps?.length || 0} label="Stops" color="#2563eb" isDark={isDark} />
			</div>

			{/* ── AI Research section ── */}
			{adventure.venues_research && adventure.venues_research.length > 0 && (
				<div style={{
					backgroundColor: researchBg,
					border: `2px solid ${researchBorder}`,
					borderRadius: 12, padding: 20, marginBottom: 20,
				}}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
						<h4 style={{ color: isDark ? '#6ee7b7' : '#15803d', margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
							✨ AI-Summarized Venue Insights
							<span style={{ backgroundColor: isDark ? '#059669' : '#16a34a', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
								LIVE DATA
							</span>
						</h4>
						<button
							onClick={() => setShowResearchDetails(!showResearchDetails)}
							style={{
								backgroundColor: isDark ? '#059669' : '#16a34a',
								color: 'white', border: 'none',
								padding: '6px 12px', borderRadius: 6,
								fontSize: 12, cursor: 'pointer', fontWeight: 600,
							}}
						>
							{showResearchDetails ? '🔼 Hide' : '🔽 Details'}
						</button>
					</div>

					{showResearchDetails && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
							{adventure.venues_research.map((venue, idx) => {
								const venueName = venue?.name || venue?.venue_name || venue?.matched_to || 'Unknown Venue';
								const summary = (venue as any)?.research_summary;

								if (!summary) return (
									<div key={idx} style={{
										backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
										border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#fecaca'}`,
										borderRadius: 12, padding: 15,
									}}>
										<h5 style={{ color: isDark ? '#fca5a5' : '#dc2626', margin: '0 0 10px 0' }}>
											⚠️ {venueName} (No Summary)
										</h5>
									</div>
								);

								return (
									<div key={idx} style={{
										backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'white',
										border: `1px solid ${borderColor}`,
										borderRadius: 12, padding: 20,
										boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
									}}>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 12, borderBottom: `1px solid ${borderColor}` }}>
											<h5 style={{ color: tk.textPrimary, margin: 0, fontSize: 16, fontWeight: 700 }}>
												📍 {venueName}
											</h5>
											<div style={{
												backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#dcfce7',
												color: isDark ? '#6ee7b7' : '#15803d',
												padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
											}}>
												{Math.round((venue.research_confidence || 0) * 100)}% Confidence
											</div>
										</div>

										<p style={{ color: tk.textSecondary, fontSize: 14, lineHeight: 1.6, marginBottom: 15, fontStyle: 'italic' }}>
											{summary.visitor_summary}
										</p>

										{summary.key_highlights?.length > 0 && (
											<div style={{ marginBottom: 15 }}>
												<div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#6ee7b7' : '#15803d', marginBottom: 8 }}>
													⭐ Highlights:
												</div>
												<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
													{summary.key_highlights.map((h: string, hIdx: number) => (
														<div key={hIdx} style={{
															fontSize: 12, color: isDark ? '#93c5fd' : '#1e40af',
															backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#dbeafe',
															border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#3b82f6'}`,
															padding: '6px 10px', borderRadius: 6,
														}}>✓ {h}</div>
													))}
												</div>
											</div>
										)}

										{summary.practical_info && (
											<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 15 }}>
												{summary.practical_info.best_time_to_visit && (
													<InfoCard icon="📅" label="Best Time" value={summary.practical_info.best_time_to_visit} isDark={isDark} />
												)}
												{summary.practical_info.typical_duration && (
													<InfoCard icon="⏱️" label="Duration" value={summary.practical_info.typical_duration} isDark={isDark} />
												)}
												{summary.practical_info.admission && (
													<InfoCard icon="🎫" label="Admission" value={summary.practical_info.admission} isDark={isDark} />
												)}
											</div>
										)}

										{summary.practical_info?.insider_tips?.length > 0 && (
											<div>
												<div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#6ee7b7' : '#15803d', marginBottom: 8 }}>
													💡 Insider Tips:
												</div>
												{summary.practical_info.insider_tips.map((tip: string, tipIdx: number) => (
													<div key={tipIdx} style={{
														fontSize: 13, color: tk.textPrimary,
														backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7',
														border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#fbbf24'}`,
														padding: 10, borderRadius: 6, marginBottom: 6, lineHeight: 1.5,
													}}>
														✓ {tip}
													</div>
												))}
											</div>
										)}

										<div style={{ fontSize: 11, color: tk.textMuted, borderTop: `1px solid ${borderColor}`, paddingTop: 10, marginTop: 12, fontStyle: 'italic' }}>
											📊 {summary.confidence_notes} | {venue.total_insights || 0} insights
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* ── Itinerary steps ── */}
			{adventure.steps && adventure.steps.length > 0 && (
				<div style={{ marginBottom: 20 }}>
					<h4 style={{ color: tk.textPrimary, marginBottom: 15, fontSize: '1.1rem' }}>
						📍 Itinerary
					</h4>
					{adventure.steps.map((step, idx) => (
						<div key={idx} style={{
							display: 'flex', gap: 12, marginBottom: 12,
							padding: 15, backgroundColor: sectionBg,
							borderRadius: 10, border: `1px solid ${borderColor}`,
						}}>
							<div style={{
								backgroundColor: '#2563eb', color: 'white',
								padding: '6px 10px', borderRadius: 6,
								fontSize: 12, fontWeight: 600,
								minWidth: 70, textAlign: 'center', height: 'fit-content',
							}}>
								{step.time}
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ fontWeight: 600, marginBottom: 4, color: tk.textPrimary }}>
									{step.activity}
								</div>
								<div style={{ fontSize: 14, color: tk.textMuted }}>
									{step.details}
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* ── Map button ── */}
			{adventure.map_url && (
				<a
					href={adventure.map_url}
					target="_blank"
					rel="noopener noreferrer"
					style={{
						display: 'inline-flex', alignItems: 'center', gap: 8,
						backgroundColor: '#059669', color: 'white',
						textDecoration: 'none', padding: '12px 20px',
						borderRadius: 8, fontWeight: 600, fontSize: 14,
						marginBottom: 12,
					}}
				>
					🗺️ Open Route in Google Maps
				</a>
			)}

			{/* ── Share card ── */}
			<ShareCard adventure={adventure} />

			{/* ── Rating modal ── */}
			{showRatingModal && (
				<div style={{
					position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
					background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
					display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
				}}>
					<div style={{
						background: isDark ? '#1e1b4b' : 'white',
						borderRadius: 16, padding: 30,
						maxWidth: 500, width: '90%',
						boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
						border: `1px solid ${borderColor}`,
					}}>
						<h3 style={{ marginBottom: 20, color: tk.textPrimary, fontSize: '1.5rem' }}>
							💾 Save Adventure
						</h3>

						<div style={{ marginBottom: 20 }}>
							<label style={{ display: 'block', marginBottom: 10, fontWeight: 600, color: tk.textSecondary }}>
								Rate this adventure (optional):
							</label>
							<div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
								{[1, 2, 3, 4, 5].map(star => (
									<button key={star} onClick={() => setRating(star)}
										style={{
											background: rating && rating >= star ? '#fbbf24' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
											border: 'none', borderRadius: 8, padding: 12,
											fontSize: '1.8rem', cursor: 'pointer',
											transform: rating && rating >= star ? 'scale(1.15)' : 'scale(1)',
											transition: 'all 0.2s',
										}}
									>⭐</button>
								))}
							</div>
							{rating && (
								<div style={{ textAlign: 'center', marginTop: 8, color: tk.textMuted, fontSize: '0.9rem' }}>
									{rating === 5 ? '🌟 Amazing!' : rating === 4 ? '😊 Great!' : rating === 3 ? '👍 Good' : rating === 2 ? '😐 Okay' : '👎 Not great'}
								</div>
							)}
						</div>

						<div style={{ marginBottom: 20 }}>
							<label style={{ display: 'block', marginBottom: 10, fontWeight: 600, color: tk.textSecondary }}>
								Notes (optional):
							</label>
							<textarea
								value={notes}
								onChange={e => setNotes(e.target.value)}
								placeholder="Add notes about this adventure..."
								rows={3}
								style={{
									width: '100%', padding: 12, borderRadius: 8,
									border: `2px solid ${borderColor}`, fontSize: '0.95rem',
									fontFamily: 'inherit', resize: 'vertical',
									background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
									color: tk.textPrimary, outline: 'none',
									boxSizing: 'border-box',
								}}
							/>
						</div>

						<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
							<button
								onClick={() => { setShowRatingModal(false); setRating(null); setNotes(''); }}
								disabled={isSaving}
								style={{
									background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
									color: tk.textSecondary, border: 'none',
									padding: '12px 24px', borderRadius: 8,
									fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
								}}
							>Cancel</button>
							<button
								onClick={handleConfirmSave}
								disabled={isSaving}
								style={{
									background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
									color: 'white', border: 'none',
									padding: '12px 24px', borderRadius: 8,
									fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
								}}
							>{isSaving ? 'Saving...' : '💾 Save Adventure'}</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

// ── Helper components ─────────────────────────────────────────

const InfoCard: React.FC<{ icon: string; label: string; value: string; isDark: boolean }> = ({ icon, label, value, isDark }) => {
	const tk = t(isDark);
	return (
		<div style={{
			backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
			padding: 12, borderRadius: 8,
			border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
		}}>
			<div style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 4, fontWeight: 600 }}>
				{icon} {label}
			</div>
			<div style={{ fontSize: 13, color: tk.textPrimary, lineHeight: 1.4 }}>
				{value}
			</div>
		</div>
	);
};

const StatCard: React.FC<{ value: string | number; label: string; color: string; isDark: boolean }> = ({ value, label, color, isDark }) => {
	const tk = t(isDark);
	return (
		<div style={{
			textAlign: 'center',
			backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
			padding: 12, borderRadius: 8,
			border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
		}}>
			<div style={{ fontWeight: 700, color, fontSize: 16 }}>{value}</div>
			<div style={{ fontSize: 12, color: tk.textMuted }}>{label}</div>
		</div>
	);
};

export default EnhancedAdventureCard;