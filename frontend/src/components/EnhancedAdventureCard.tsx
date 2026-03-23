// frontend/src/components/EnhancedAdventureCard.tsx
import React, { useState } from 'react';
import { savedAdventuresApi } from '../api/savedAdventures';
import { Adventure, VenueWithResearch } from '../types/adventure';
import { useTheme, t } from '../contexts/ThemeContext';
import ShareCard from './ShareCard';

interface Props {
	adventure: Adventure;
	index: number;
	onSave?: (adventureId: string) => void;
}

const getVenueUrl = (venue: VenueWithResearch): string | null =>
	venue.website || venue.source_url || venue.tavily_url || venue.yelp_url || null;

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
			? adventure.venues_research.reduce((a, v) => a + (v.research_confidence || 0), 0) /
			adventure.venues_research.length
			: 0,
		insights: adventure.venues_research
			? adventure.venues_research.reduce((a, v) => a + (v.total_insights || 0), 0)
			: 0,
	};

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
					<button
						onClick={() => setShowRatingModal(true)}
						disabled={isSaved}
						style={{
							background: isSaved
								? '#10b981'
								: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							color: 'white', border: 'none',
							padding: '10px 20px', borderRadius: 8,
							fontSize: '0.9rem', fontWeight: 600,
							cursor: isSaved ? 'default' : 'pointer',
							marginLeft: 15, whiteSpace: 'nowrap', transition: 'transform 0.2s',
						}}
						onMouseEnter={e => { if (!isSaved) e.currentTarget.style.transform = 'scale(1.04)'; }}
						onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
					>
						{isSaved ? '✓ Saved' : '💾 Save'}
					</button>
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
							<div style={{
								color: researchStats.quality > 0.6
									? (isDark ? '#6ee7b7' : '#15803d')
									: (isDark ? '#fcd34d' : '#d97706'),
							}}>
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

			{/* ── Live Venue Info ── */}
			{adventure.venues_research && adventure.venues_research.length > 0 && (
				<div style={{
					backgroundColor: researchBg,
					border: `2px solid ${researchBorder}`,
					borderRadius: 12, padding: 20, marginBottom: 20,
				}}>
					<div style={{
						display: 'flex', justifyContent: 'space-between',
						alignItems: 'center', marginBottom: showResearchDetails ? 16 : 0,
					}}>
						<h4 style={{
							color: isDark ? '#6ee7b7' : '#15803d',
							margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem',
						}}>
							✨ Live Venue Info
							<span style={{
								backgroundColor: isDark ? '#059669' : '#16a34a',
								color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10,
							}}>LIVE DATA</span>
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
						<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
							{adventure.venues_research.map((venue, idx) => {
								const raw = venue as any;
								const venueName = venue?.name || venue?.venue_name || venue?.matched_to || 'Unknown Venue';
								const venueUrl = getVenueUrl(venue);
								const topSource = raw.top_source as string | null;
								const hoursClean = raw.hours_clean as string | null;
								const priceTier = raw.price_tier as string | null;
								const descClean = raw.description_clean as string | null;
								const insiderTip = raw.insider_tip_clean as string | null;
								const bestTime = raw.best_time as string | null;
								const crowdLevel = raw.crowd_level as string | null;

								return (
									<div key={idx} style={{
										backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'white',
										border: `1px solid ${borderColor}`,
										borderRadius: 12, padding: 16,
										boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
									}}>
										{/* ── Venue name + price + links ── */}
										<div style={{
											display: 'flex', justifyContent: 'space-between',
											alignItems: 'flex-start', flexWrap: 'wrap', gap: 8,
											marginBottom: 10, paddingBottom: 10,
											borderBottom: `1px solid ${borderColor}`,
										}}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
												<span style={{ fontWeight: 700, fontSize: 14, color: tk.textPrimary }}>
													📍 {venueName}
												</span>
												{priceTier && (
													<span style={{
														fontSize: 11, fontWeight: 700,
														color: isDark ? '#fcd34d' : '#92400e',
														background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
														border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#fbbf24'}`,
														padding: '2px 7px', borderRadius: 5,
													}}>
														{priceTier}
													</span>
												)}
											</div>
											<div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
												{venueUrl && (
													<a href={venueUrl} target="_blank" rel="noopener noreferrer"
														style={{
															fontSize: 11, fontWeight: 600,
															color: isDark ? '#93c5fd' : '#2563eb',
															background: isDark ? 'rgba(59,130,246,0.12)' : '#dbeafe',
															border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#93c5fd'}`,
															padding: '3px 8px', borderRadius: 5,
															textDecoration: 'none', whiteSpace: 'nowrap',
														}}
														onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
														onMouseLeave={e => e.currentTarget.style.opacity = '1'}
													>🌐 Website</a>
												)}
												{topSource && topSource !== venueUrl && (
													<a href={topSource} target="_blank" rel="noopener noreferrer"
														style={{
															fontSize: 11, fontWeight: 600,
															color: isDark ? '#6ee7b7' : '#15803d',
															background: isDark ? 'rgba(16,185,129,0.12)' : '#dcfce7',
															border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : '#86efac'}`,
															padding: '3px 8px', borderRadius: 5,
															textDecoration: 'none', whiteSpace: 'nowrap',
														}}
														onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
														onMouseLeave={e => e.currentTarget.style.opacity = '1'}
													>
														{topSource.includes('yelp') ? '⭐ Yelp'
															: topSource.includes('tripadvisor') ? '🦉 TripAdvisor'
																: '🔗 Reviews'}
													</a>
												)}
											</div>
										</div>

										{/* ── Description ── */}
										{descClean && (
											<p style={{
												fontSize: 13, color: tk.textSecondary,
												lineHeight: 1.6, margin: '0 0 12px 0',
											}}>
												{descClean}
											</p>
										)}

										{/* ── Info chips ── */}
										<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
											{hoursClean && (
												<div style={{
													display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
													color: isDark ? '#93c5fd' : '#1e40af',
													background: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff',
													border: `1px solid ${isDark ? 'rgba(59,130,246,0.25)' : '#bfdbfe'}`,
													padding: '5px 10px', borderRadius: 6,
												}}>
													🕐 {hoursClean}
												</div>
											)}
											{bestTime && (
												<div style={{
													display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
													color: isDark ? '#fcd34d' : '#92400e',
													background: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7',
													border: `1px solid ${isDark ? 'rgba(245,158,11,0.25)' : '#fde68a'}`,
													padding: '5px 10px', borderRadius: 6,
												}}>
													📅 {bestTime}
												</div>
											)}
											{crowdLevel && (
												<div style={{
													display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
													color: isDark ? '#c4b5fd' : '#5b21b6',
													background: isDark ? 'rgba(139,92,246,0.1)' : '#ede9fe',
													border: `1px solid ${isDark ? 'rgba(139,92,246,0.25)' : '#ddd6fe'}`,
													padding: '5px 10px', borderRadius: 6,
												}}>
													👥 {crowdLevel}
												</div>
											)}
											<div style={{
												display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
												color: isDark ? '#6ee7b7' : '#15803d',
												background: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4',
												border: `1px solid ${isDark ? 'rgba(16,185,129,0.25)' : '#bbf7d0'}`,
												padding: '5px 10px', borderRadius: 6,
											}}>
												📊 {venue.total_insights || 0} insights · {Math.round((venue.research_confidence || 0) * 100)}% confidence
											</div>
										</div>

										{/* ── Insider tip ── */}
										{insiderTip && (
											<div style={{
												marginTop: 10, padding: '8px 12px', borderRadius: 6,
												background: isDark ? 'rgba(251,191,36,0.08)' : '#fffbeb',
												border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#fde68a'}`,
												fontSize: 12, color: isDark ? '#fcd34d' : '#92400e',
												display: 'flex', alignItems: 'flex-start', gap: 6,
											}}>
												<span style={{ flexShrink: 0 }}>💡</span>
												<span>{insiderTip}</span>
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
								<div style={{ fontSize: 14, color: tk.textMuted, marginBottom: step.venue_url ? 6 : 0 }}>
									{step.details}
								</div>
								{step.venue_url && (
									<a href={step.venue_url} target="_blank" rel="noopener noreferrer"
										style={{
											display: 'inline-flex', alignItems: 'center', gap: 4,
											fontSize: 12, fontWeight: 500,
											color: isDark ? '#93c5fd' : '#2563eb',
											textDecoration: 'none', opacity: 0.85, transition: 'opacity 0.15s',
										}}
										onMouseEnter={e => e.currentTarget.style.opacity = '1'}
										onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
									>
										🔗 View venue →
									</a>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* ── Map button ── */}
			{adventure.map_url && (
				<a href={adventure.map_url} target="_blank" rel="noopener noreferrer"
					style={{
						display: 'inline-flex', alignItems: 'center', gap: 8,
						backgroundColor: '#059669', color: 'white',
						textDecoration: 'none', padding: '12px 20px',
						borderRadius: 8, fontWeight: 600, fontSize: 14, marginBottom: 12,
					}}
				>
					🗺️ Open Route in Google Maps
				</a>
			)}

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
						borderRadius: 16, padding: 30, maxWidth: 500, width: '90%',
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
									color: tk.textPrimary, outline: 'none', boxSizing: 'border-box',
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