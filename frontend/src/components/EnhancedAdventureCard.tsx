// frontend/src/components/EnhancedAdventureCard.tsx
import React, { useState } from 'react';
import { savedAdventuresApi } from '../api/savedAdventures';
import { Adventure, VenueWithResearch } from '../types/adventure';
import { useTheme, t } from '../contexts/ThemeContext';
import ShareCard from './ShareCard';
import CompletionModal from './CompletionModal';
import apiClient from '../api/client';

interface Props {
	adventure: Adventure;
	index: number;
	onSave?: (adventureId: string) => void;
	isShared?: boolean;   // hides remix + save when viewing a shared link
}

const getVenueUrl = (venue: VenueWithResearch): string | null =>
	venue.website || venue.source_url || venue.tavily_url || venue.yelp_url || null;

// ── Remix modal ────────────────────────────────────────────────
interface RemixAlternative {
	name: string;
	url: string;
	description: string;
	research_confidence: number;
	total_insights: number;
}

interface RemixModalProps {
	stepIndex: number;
	originalActivity: string;
	alternatives: RemixAlternative[];
	onSelect: (alt: RemixAlternative) => void;
	onClose: () => void;
	isDark: boolean;
}

const RemixModal: React.FC<RemixModalProps> = ({
	stepIndex, originalActivity, alternatives, onSelect, onClose, isDark,
}) => {
	const tk = t(isDark);
	const border = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';

	return (
		<div style={{
			position: 'fixed', inset: 0, zIndex: 3000,
			background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
			display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
		}} onClick={onClose}>
			<div onClick={e => e.stopPropagation()} style={{
				background: isDark ? '#1a1040' : 'white',
				borderRadius: 18, padding: 28, width: '100%', maxWidth: 500,
				maxHeight: '85vh', overflowY: 'auto',
				boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
				border: `1px solid ${border}`,
				animation: 'slideUp 0.25s ease both',
			}}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
					<h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: tk.textPrimary }}>
						🔀 Swap Stop {stepIndex + 1}
					</h3>
					<button onClick={onClose} style={{
						background: 'none', border: 'none', fontSize: '1.2rem',
						cursor: 'pointer', color: tk.textMuted,
					}}>✕</button>
				</div>
				<p style={{ fontSize: '0.8rem', color: tk.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
					Replacing: <em>{originalActivity}</em><br />
					Pick a fresh alternative researched just now:
				</p>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					{alternatives.map((alt, i) => (
						<button key={i} onClick={() => onSelect(alt)} style={{
							textAlign: 'left', padding: '14px 16px', borderRadius: 12,
							background: isDark ? 'rgba(102,126,234,0.08)' : '#f8fafc',
							border: `1.5px solid ${isDark ? 'rgba(102,126,234,0.2)' : '#e2e8f0'}`,
							cursor: 'pointer', transition: 'all 0.15s',
						}}
							onMouseEnter={e => {
								(e.currentTarget as HTMLButtonElement).style.borderColor = '#667eea';
								(e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(102,126,234,0.18)' : '#eef2ff';
							}}
							onMouseLeave={e => {
								(e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? 'rgba(102,126,234,0.2)' : '#e2e8f0';
								(e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(102,126,234,0.08)' : '#f8fafc';
							}}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
								<div style={{ fontWeight: 700, fontSize: '0.92rem', color: tk.textPrimary, flex: 1 }}>
									📍 {alt.name}
								</div>
								<div style={{
									fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
									color: isDark ? '#6ee7b7' : '#15803d',
									background: isDark ? 'rgba(16,185,129,0.12)' : '#dcfce7',
									border: `1px solid ${isDark ? 'rgba(16,185,129,0.25)' : '#86efac'}`,
									padding: '2px 7px', borderRadius: 6,
								}}>
									{Math.round(alt.research_confidence * 100)}% match
								</div>
							</div>
							<p style={{ fontSize: '0.8rem', color: tk.textMuted, margin: 0, lineHeight: 1.55 }}>
								{alt.description.slice(0, 180)}{alt.description.length > 180 ? '…' : ''}
							</p>
							{alt.url && (
								<a href={alt.url} target="_blank" rel="noopener noreferrer"
									onClick={e => e.stopPropagation()}
									style={{
										display: 'inline-block', marginTop: 6,
										fontSize: '0.72rem', color: isDark ? '#93c5fd' : '#2563eb',
										textDecoration: 'none', opacity: 0.85,
									}}
								>🔗 View source →</a>
							)}
						</button>
					))}
				</div>
			</div>
			<style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
		</div>
	);
};

// ── Main card ──────────────────────────────────────────────────
const EnhancedAdventureCard: React.FC<Props> = ({ adventure, index, onSave, isShared = false }) => {
	const { isDark } = useTheme();
	const tk = t(isDark);

	const [showResearchDetails, setShowResearchDetails] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isSaved, setIsSaved] = useState(false);
	const [savedAdventureId, setSavedAdventureId] = useState<string | null>(null);
	const [showRatingModal, setShowRatingModal] = useState(false);
	const [showCompletionModal, setShowCompletionModal] = useState(false);
	const [rating, setRating] = useState<number | null>(null);
	const [notes, setNotes] = useState('');

	// Remix state
	const [remixingStep, setRemixingStep] = useState<number | null>(null);
	const [remixLoading, setRemixLoading] = useState(false);
	const [remixAlternatives, setRemixAlternatives] = useState<RemixAlternative[]>([]);
	const [localSteps, setLocalSteps] = useState(adventure.steps || []);
	const [remixError, setRemixError] = useState<string | null>(null);

	const borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
	const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
	const sectionBg = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
	const researchBg = isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4';
	const researchBorder = isDark ? 'rgba(16,185,129,0.25)' : '#bbf7d0';

	const researchStats = {
		quality: adventure.venues_research
			? adventure.venues_research.reduce((a: number, v: any) => a + (v.research_confidence || 0), 0) /
			adventure.venues_research.length
			: 0,
		insights: adventure.venues_research
			? adventure.venues_research.reduce((a: number, v: any) => a + (v.total_insights || 0), 0)
			: 0,
	};

	// ── Save ────────────────────────────────────────────────────
	const handleConfirmSave = async () => {
		try {
			setIsSaving(true);
			const response = await savedAdventuresApi.saveAdventure({
				adventure_data: { ...adventure, steps: localSteps },
				rating: rating || undefined,
				notes: notes || undefined,
				tags: [],
			});
			if (response.success) {
				setIsSaved(true);
				setSavedAdventureId(response.adventure_id);
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

	// ── Remix ───────────────────────────────────────────────────
	const handleRemixClick = async (stepIdx: number) => {
		setRemixError(null);
		setRemixLoading(true);
		setRemixingStep(stepIdx);
		try {
			const excludeVenues = localSteps.map((s: any) => s.activity || '');
			const res = await apiClient.post('/api/adventures/remix-stop', {
				adventure,
				step_index: stepIdx,
				location: adventure.location || 'Boston, MA',
				exclude_venues: excludeVenues,
			});
			setRemixAlternatives(res.data.alternatives || []);
		} catch (e) {
			setRemixError('Could not find alternatives. Try again.');
			setRemixingStep(null);
		} finally {
			setRemixLoading(false);
		}
	};

	const handleRemixSelect = (alt: RemixAlternative) => {
		if (remixingStep === null) return;
		const updated = localSteps.map((s: any, i: number) =>
			i === remixingStep
				? { ...s, activity: alt.name, details: alt.description.slice(0, 200), venue_url: alt.url }
				: s
		);
		setLocalSteps(updated);
		setRemixingStep(null);
		setRemixAlternatives([]);
	};

	const calculateDiversity = (adv: Adventure) => {
		const types = new Set(adv.venues_research?.map((v: any) => v.venue_name?.split(' ')[0]) || []);
		return Math.min(100, types.size * 25);
	};

	return (
		<>
			<div style={{
				backgroundColor: cardBg,
				border: `2px solid ${borderColor}`,
				borderRadius: 16, padding: 25,
				boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.07)',
				position: 'relative', backdropFilter: 'blur(12px)',
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
						{!isShared && (
							<div style={{ display: 'flex', gap: 8, marginLeft: 15, flexShrink: 0 }}>
								{/* Mark complete (only after saving) */}
								{isSaved && savedAdventureId && (
									<button
										onClick={() => setShowCompletionModal(true)}
										style={{
											background: 'linear-gradient(135deg,#10b981,#059669)',
											color: 'white', border: 'none', padding: '10px 16px',
											borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
											cursor: 'pointer', whiteSpace: 'nowrap', transition: 'transform 0.2s',
										}}
										onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
										onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
									>
										✅ Done
									</button>
								)}
								<button
									onClick={() => setShowRatingModal(true)}
									disabled={isSaved}
									style={{
										background: isSaved ? '#10b981' : 'linear-gradient(135deg,#667eea,#764ba2)',
										color: 'white', border: 'none', padding: '10px 20px',
										borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
										cursor: isSaved ? 'default' : 'pointer', whiteSpace: 'nowrap', transition: 'transform 0.2s',
									}}
									onMouseEnter={e => { if (!isSaved) e.currentTarget.style.transform = 'scale(1.04)'; }}
									onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
								>
									{isSaved ? '✓ Saved' : '💾 Save'}
								</button>
							</div>
						)}
					</div>

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
								<div style={{ color: tk.textMuted, fontSize: 10 }}>{researchStats.insights} insights</div>
							</div>
						</div>
					)}
				</div>

				{/* ── Stats ── */}
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 15, marginBottom: 20 }}>
					<StatCard value={`${calculateDiversity(adventure)}%`} label="Diversity" color="#8b5cf6" isDark={isDark} />
					<StatCard value={localSteps.length || 0} label="Stops" color="#2563eb" isDark={isDark} />
				</div>

				{/* ── Live Venue Info ── */}
				{adventure.venues_research && adventure.venues_research.length > 0 && (
					<div style={{ backgroundColor: researchBg, border: `2px solid ${researchBorder}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showResearchDetails ? 16 : 0 }}>
							<h4 style={{ color: isDark ? '#6ee7b7' : '#15803d', margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
								✨ Live Venue Info
								<span style={{ backgroundColor: isDark ? '#059669' : '#16a34a', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>LIVE DATA</span>
							</h4>
							<button onClick={() => setShowResearchDetails(!showResearchDetails)} style={{
								backgroundColor: isDark ? '#059669' : '#16a34a', color: 'white', border: 'none',
								padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600,
							}}>
								{showResearchDetails ? '🔼 Hide' : '🔽 Details'}
							</button>
						</div>

						{showResearchDetails && (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
								{adventure.venues_research.map((venue: any, idx: number) => {
									const venueName = venue?.name || venue?.venue_name || venue?.matched_to || 'Unknown Venue';
									const venueUrl = getVenueUrl(venue);
									return (
										<div key={idx} style={{
											backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'white',
											border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16,
										}}>
											<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}` }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
													<span style={{ fontWeight: 700, fontSize: 14, color: tk.textPrimary }}>📍 {venueName}</span>
													{venue.price_tier && (
														<span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#fcd34d' : '#92400e', background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7', border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#fbbf24'}`, padding: '2px 7px', borderRadius: 5 }}>
															{venue.price_tier}
														</span>
													)}
												</div>
												<div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
													{venueUrl && (
														<a href={venueUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb', background: isDark ? 'rgba(59,130,246,0.12)' : '#dbeafe', border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#93c5fd'}`, padding: '3px 8px', borderRadius: 5, textDecoration: 'none', whiteSpace: 'nowrap' }}>🌐 Website</a>
													)}
													{venue.top_source && venue.top_source !== venueUrl && (
														<a href={venue.top_source} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#6ee7b7' : '#15803d', background: isDark ? 'rgba(16,185,129,0.12)' : '#dcfce7', border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : '#86efac'}`, padding: '3px 8px', borderRadius: 5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
															{venue.top_source.includes('yelp') ? '⭐ Yelp' : venue.top_source.includes('tripadvisor') ? '🦉 TripAdvisor' : '🔗 Reviews'}
														</a>
													)}
												</div>
											</div>
											{venue.description_clean && <p style={{ fontSize: 13, color: tk.textSecondary, lineHeight: 1.6, margin: '0 0 12px 0' }}>{venue.description_clean}</p>}
											<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
												{venue.hours_clean && <Chip icon="🕐" text={venue.hours_clean} color="blue" isDark={isDark} />}
												{venue.best_time && <Chip icon="📅" text={venue.best_time} color="yellow" isDark={isDark} />}
												{venue.crowd_level && <Chip icon="👥" text={venue.crowd_level} color="purple" isDark={isDark} />}
												<Chip icon="📊" text={`${venue.total_insights || 0} insights · ${Math.round((venue.research_confidence || 0) * 100)}% confidence`} color="green" isDark={isDark} />
											</div>
											{venue.insider_tip_clean && (
												<div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: isDark ? 'rgba(251,191,36,0.08)' : '#fffbeb', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#fde68a'}`, fontSize: 12, color: isDark ? '#fcd34d' : '#92400e', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
													<span style={{ flexShrink: 0 }}>💡</span>
													<span>{venue.insider_tip_clean}</span>
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* ── Itinerary ── */}
				{localSteps.length > 0 && (
					<div style={{ marginBottom: 20 }}>
						<h4 style={{ color: tk.textPrimary, marginBottom: 15, fontSize: '1.1rem' }}>📍 Itinerary</h4>
						{localSteps.map((step: any, idx: number) => (
							<div key={idx} style={{
								display: 'flex', gap: 12, marginBottom: 10, padding: 15,
								backgroundColor: sectionBg, borderRadius: 10,
								border: `1px solid ${borderColor}`,
							}}>
								<div style={{ backgroundColor: '#2563eb', color: 'white', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 70, textAlign: 'center', height: 'fit-content' }}>
									{step.time}
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontWeight: 600, marginBottom: 4, color: tk.textPrimary }}>{step.activity}</div>
									<div style={{ fontSize: 14, color: tk.textMuted, marginBottom: step.venue_url ? 6 : 0 }}>{step.details}</div>
									{step.venue_url && (
										<a href={step.venue_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: isDark ? '#93c5fd' : '#2563eb', textDecoration: 'none', opacity: 0.85 }}
											onMouseEnter={e => e.currentTarget.style.opacity = '1'}
											onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
										>🔗 View venue →</a>
									)}
								</div>
							</div>
						))}
					</div>
				)}

				{/* ── Map button ── */}
				{adventure.map_url && (
					<a href={adventure.map_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#059669', color: 'white', textDecoration: 'none', padding: '12px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
						🗺️ Open Route in Google Maps
					</a>
				)}

				<ShareCard adventure={{ ...adventure, steps: localSteps }} />

				{/* ── Save modal ── */}
				{showRatingModal && (
					<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
						<div style={{ background: isDark ? '#1e1b4b' : 'white', borderRadius: 16, padding: 30, maxWidth: 500, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${borderColor}` }}>
							<h3 style={{ marginBottom: 20, color: tk.textPrimary, fontSize: '1.5rem' }}>💾 Save Adventure</h3>
							<div style={{ marginBottom: 20 }}>
								<label style={{ display: 'block', marginBottom: 10, fontWeight: 600, color: tk.textSecondary }}>Rate this adventure (optional):</label>
								<div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
									{[1, 2, 3, 4, 5].map(star => (
										<button key={star} onClick={() => setRating(star)}
											style={{ background: rating && rating >= star ? '#fbbf24' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'), border: 'none', borderRadius: 8, padding: 12, fontSize: '1.8rem', cursor: 'pointer', transform: rating && rating >= star ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.2s' }}
										>⭐</button>
									))}
								</div>
								{rating && <div style={{ textAlign: 'center', marginTop: 8, color: tk.textMuted, fontSize: '0.9rem' }}>
									{rating === 5 ? '🌟 Amazing!' : rating === 4 ? '😊 Great!' : rating === 3 ? '👍 Good' : rating === 2 ? '😐 Okay' : '👎 Not great'}
								</div>}
							</div>
							<div style={{ marginBottom: 20 }}>
								<label style={{ display: 'block', marginBottom: 10, fontWeight: 600, color: tk.textSecondary }}>Notes (optional):</label>
								<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this adventure..." rows={3}
									style={{ width: '100%', padding: 12, borderRadius: 8, border: `2px solid ${borderColor}`, fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', background: isDark ? 'rgba(255,255,255,0.06)' : 'white', color: tk.textPrimary, outline: 'none', boxSizing: 'border-box' }}
								/>
							</div>
							<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
								<button onClick={() => { setShowRatingModal(false); setRating(null); setNotes(''); }} disabled={isSaving}
									style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', color: tk.textSecondary, border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
								>Cancel</button>
								<button onClick={handleConfirmSave} disabled={isSaving}
									style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
								>{isSaving ? 'Saving...' : '💾 Save Adventure'}</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* ── Remix modal ── */}
			{remixingStep !== null && remixAlternatives.length > 0 && (
				<RemixModal
					stepIndex={remixingStep}
					originalActivity={localSteps[remixingStep]?.activity || ''}
					alternatives={remixAlternatives}
					onSelect={handleRemixSelect}
					onClose={() => { setRemixingStep(null); setRemixAlternatives([]); }}
					isDark={isDark}
				/>
			)}

			{/* ── Completion modal ── */}
			{showCompletionModal && savedAdventureId && (
				<CompletionModal
					adventure={{ ...adventure, steps: localSteps }}
					savedAdventureId={savedAdventureId}
					onClose={() => setShowCompletionModal(false)}
					onUpdate={(r, n) => { setRating(r); setNotes(n); }}
				/>
			)}
		</>
	);
};

// ── Helpers ────────────────────────────────────────────────────
const StatCard: React.FC<{ value: string | number; label: string; color: string; isDark: boolean }> = ({ value, label, color, isDark }) => {
	const tk = t(isDark);
	return (
		<div style={{ textAlign: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', padding: 12, borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}` }}>
			<div style={{ fontWeight: 700, color, fontSize: 16 }}>{value}</div>
			<div style={{ fontSize: 12, color: tk.textMuted }}>{label}</div>
		</div>
	);
};

type ChipColor = 'blue' | 'yellow' | 'purple' | 'green';
const CHIP_STYLES: Record<ChipColor, { light: { color: string; bg: string; border: string }; dark: { color: string; bg: string; border: string } }> = {
	blue: { light: { color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' }, dark: { color: '#93c5fd', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' } },
	yellow: { light: { color: '#92400e', bg: '#fef3c7', border: '#fde68a' }, dark: { color: '#fcd34d', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' } },
	purple: { light: { color: '#5b21b6', bg: '#ede9fe', border: '#ddd6fe' }, dark: { color: '#c4b5fd', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' } },
	green: { light: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' }, dark: { color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' } },
};

const Chip: React.FC<{ icon: string; text: string; color: ChipColor; isDark: boolean }> = ({ icon, text, color, isDark }) => {
	const s = isDark ? CHIP_STYLES[color].dark : CHIP_STYLES[color].light;
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: '5px 10px', borderRadius: 6 }}>
			{icon} {text}
		</div>
	);
};

export default EnhancedAdventureCard;