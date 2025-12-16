import React, { useState } from 'react';
import axios from 'axios';
import { savedAdventuresApi } from '../api/savedAdventures';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ✅ FIXED: Match backend structure
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

interface Adventure {
	title: string;
	tagline: string;
	duration: number;
	cost: number;
	steps: Array<{
		time: string;
		activity: string;
		details: string;
	}>;
	map_url?: string;
	venues_research?: VenueWithResearch[];
}

interface Props {
	adventure: Adventure;
	index: number;
	onSave?: (adventureId: string) => void;
}

const EnhancedAdventureCard: React.FC<Props> = ({ adventure, index, onSave }) => {
	const [showResearchDetails, setShowResearchDetails] = useState(false);

	// Save functionality state
	const [isSaving, setIsSaving] = useState(false);
	const [isSaved, setIsSaved] = useState(false);
	const [showRatingModal, setShowRatingModal] = useState(false);
	const [rating, setRating] = useState<number | null>(null);
	const [notes, setNotes] = useState('');

	// Debug: Log the adventure data
	React.useEffect(() => {
		console.log('🔍 Adventure Data:', {
			title: adventure.title,
			hasVenuesResearch: !!adventure.venues_research,
			venuesCount: adventure.venues_research?.length,
			venues: adventure.venues_research?.map(v => ({
				name: v.name,
				hasSummary: !!v.research_summary,
				summary: v.research_summary
			}))
		});
	}, [adventure]);

	// Calculate research stats
	const researchStats = {
		quality: adventure.venues_research
			? adventure.venues_research.reduce((acc, v) => acc + (v.research_confidence || 0), 0) / adventure.venues_research.length
			: 0,
		insights: adventure.venues_research
			? adventure.venues_research.reduce((acc, v) => acc + (v.total_insights || 0), 0)
			: 0,
	};

	// Check if any venue has summaries
	const hasSummaries = adventure.venues_research?.some(v => v.research_summary) || false;

	// ========================================
	// SAVE FUNCTIONALITY
	// ========================================

	const handleSaveClick = () => {
		setShowRatingModal(true);
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
				if (onSave) {
					onSave(response.adventure_id);
				}
			}
		} catch (error) {
			console.error('Error saving adventure:', error);
			alert('Failed to save adventure. Please try logging in again.');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div style={{
			backgroundColor: 'white',
			border: '2px solid #e2e8f0',
			borderRadius: '16px',
			padding: '25px',
			boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
			position: 'relative',
		}}>
			{/* Header with Save Button */}
			<div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
					<div style={{ flex: 1 }}>
						<h3 style={{ color: '#1e293b', margin: '0 0 8px 0', fontSize: '1.4rem' }}>
							{adventure.title}
						</h3>
						<p style={{ color: '#64748b', margin: '0', fontStyle: 'italic' }}>
							{adventure.tagline}
						</p>
					</div>

					{/* Save Button */}
					<button
						onClick={handleSaveClick}
						disabled={isSaved}
						style={{
							background: isSaved
								? '#48bb78'
								: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							color: 'white',
							border: 'none',
							padding: '10px 20px',
							borderRadius: '8px',
							fontSize: '0.9rem',
							fontWeight: '600',
							cursor: isSaved ? 'default' : 'pointer',
							transition: 'transform 0.2s',
							marginLeft: '15px',
							whiteSpace: 'nowrap',
						}}
					>
						{isSaved ? '✓ Saved' : '💾 Save'}
					</button>
				</div>

				{/* Research Quality Badge */}
				{researchStats.insights > 0 && (
					<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
						<div style={{
							backgroundColor: researchStats.quality > 0.6 ? '#dcfce7' : '#fef3c7',
							border: `1px solid ${researchStats.quality > 0.6 ? '#16a34a' : '#f59e0b'}`,
							borderRadius: '12px',
							padding: '8px 12px',
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
						}}>
							<span style={{ fontSize: '14px' }}>📊</span>
							<div style={{ fontSize: '12px', fontWeight: '600' }}>
								<div style={{ color: researchStats.quality > 0.6 ? '#15803d' : '#d97706' }}>
									{Math.round(researchStats.quality * 100)}% Research Quality
								</div>
								<div style={{ color: '#6b7280', fontSize: '10px' }}>
									{researchStats.insights} insights
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Stats Grid */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(3, 1fr)',
				gap: '15px',
				marginBottom: '20px',
			}}>
				<StatCard value={`${adventure.duration}min`} label="Duration" color="#059669" />
				<StatCard value={`$${adventure.cost}`} label="Est. Cost" color="#dc2626" />
				<StatCard value={adventure.steps?.length || 0} label="Stops" color="#2563eb" />
			</div>

			{/* ✅ FIXED: Summarized Research Display */}
			{adventure.venues_research && adventure.venues_research.length > 0 && (
				<div style={{
					backgroundColor: '#f0fdf4',
					border: '2px solid #bbf7d0',
					borderRadius: '12px',
					padding: '20px',
					marginBottom: '20px',
				}}>
					<div style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '15px',
					}}>
						<h4 style={{ color: '#15803d', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
							✨ AI-Summarized Venue Insights
							<span style={{
								backgroundColor: '#16a34a',
								color: 'white',
								fontSize: '10px',
								padding: '2px 6px',
								borderRadius: '10px',
							}}>
								LIVE DATA
							</span>
						</h4>

						<button
							onClick={() => setShowResearchDetails(!showResearchDetails)}
							style={{
								backgroundColor: '#16a34a',
								color: 'white',
								border: 'none',
								padding: '6px 12px',
								borderRadius: '6px',
								fontSize: '12px',
								cursor: 'pointer',
								fontWeight: '600',
							}}
						>
							{showResearchDetails ? '🔼 Hide Details' : '🔽 Show Details'}
						</button>
					</div>

					{/* Venue Summaries */}
					{showResearchDetails && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
							{adventure.venues_research.map((venue, idx) => {
								const venueName = venue?.name || venue?.venue_name || venue?.matched_to || 'Unknown Venue';
								const summary = venue?.research_summary;

								// Show raw data if no summary
								if (!summary) {
									return (
										<div key={idx} style={{
											backgroundColor: '#fef2f2',
											border: '1px solid #fecaca',
											borderRadius: '12px',
											padding: '15px',
										}}>
											<h5 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>
												⚠️ {venueName} (No Summary Generated)
											</h5>
										</div>
									);
								}

								return (
									<div key={idx} style={{
										backgroundColor: 'white',
										border: '1px solid #d1d5db',
										borderRadius: '12px',
										padding: '20px',
										boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
									}}>
										{/* Venue Header */}
										<div style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											marginBottom: '15px',
											paddingBottom: '12px',
											borderBottom: '1px solid #e5e7eb',
										}}>
											<h5 style={{ color: '#1f2937', margin: '0', fontSize: '16px', fontWeight: '700' }}>
												📍 {venueName}
											</h5>
											<div style={{
												backgroundColor: '#dcfce7',
												color: '#15803d',
												padding: '4px 8px',
												borderRadius: '8px',
												fontSize: '11px',
												fontWeight: '600',
											}}>
												{Math.round((venue.research_confidence || 0) * 100)}% Confidence
											</div>
										</div>

										{/* ✅ FIXED: visitor_summary instead of summary */}
										<p style={{
											color: '#374151',
											fontSize: '14px',
											lineHeight: '1.6',
											marginBottom: '15px',
											fontStyle: 'italic',
										}}>
											{summary.visitor_summary}
										</p>

										{/* ✅ FIXED: Key Highlights */}
										{summary.key_highlights && summary.key_highlights.length > 0 && (
											<div style={{ marginBottom: '15px' }}>
												<div style={{
													fontSize: '13px',
													fontWeight: '600',
													color: '#15803d',
													marginBottom: '8px',
												}}>
													⭐ Highlights:
												</div>
												<div style={{
													display: 'flex',
													flexWrap: 'wrap',
													gap: '8px',
												}}>
													{summary.key_highlights.map((highlight, hIdx) => (
														<div key={hIdx} style={{
															fontSize: '12px',
															color: '#374151',
															backgroundColor: '#dbeafe',
															border: '1px solid #3b82f6',
															padding: '6px 10px',
															borderRadius: '6px',
														}}>
															✓ {highlight}
														</div>
													))}
												</div>
											</div>
										)}

										{/* ✅ FIXED: Practical Info Grid */}
										{summary.practical_info && (
											<div style={{
												display: 'grid',
												gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
												gap: '12px',
												marginBottom: '15px',
											}}>
												{summary.practical_info.best_time_to_visit && (
													<InfoCard
														icon="📅"
														label="Best Time"
														value={summary.practical_info.best_time_to_visit}
													/>
												)}
												{summary.practical_info.typical_duration && (
													<InfoCard
														icon="⏱️"
														label="Duration"
														value={summary.practical_info.typical_duration}
													/>
												)}
												{summary.practical_info.admission && (
													<InfoCard
														icon="🎫"
														label="Admission"
														value={summary.practical_info.admission}
													/>
												)}
											</div>
										)}

										{/* ✅ FIXED: Insider Tips */}
										{summary.practical_info?.insider_tips && summary.practical_info.insider_tips.length > 0 && (
											<div>
												<div style={{
													fontSize: '13px',
													fontWeight: '600',
													color: '#15803d',
													marginBottom: '8px',
												}}>
													💡 Insider Tips:
												</div>
												{summary.practical_info.insider_tips.map((tip, tipIdx) => (
													<div key={tipIdx} style={{
														fontSize: '13px',
														color: '#374151',
														backgroundColor: '#fef3c7',
														border: '1px solid #fbbf24',
														padding: '10px',
														borderRadius: '6px',
														marginBottom: '6px',
														lineHeight: '1.5',
													}}>
														✓ {tip}
													</div>
												))}
											</div>
										)}

										{/* Research Metadata */}
										<div style={{
											fontSize: '11px',
											color: '#9ca3af',
											borderTop: '1px solid #e5e7eb',
											paddingTop: '10px',
											marginTop: '12px',
											fontStyle: 'italic',
										}}>
											📊 {summary.confidence_notes} | Based on {venue.total_insights || 0} research insights
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* Adventure Steps */}
			{adventure.steps && adventure.steps.length > 0 && (
				<div style={{ marginBottom: '20px' }}>
					<h4 style={{ color: '#1e293b', marginBottom: '15px', fontSize: '1.1rem' }}>
						📍 Itinerary
					</h4>
					{adventure.steps.map((step, idx) => (
						<div key={idx} style={{
							display: 'flex',
							gap: '12px',
							marginBottom: '12px',
							padding: '15px',
							backgroundColor: '#f8fafc',
							borderRadius: '10px',
							border: '1px solid #e2e8f0',
						}}>
							<div style={{
								backgroundColor: '#2563eb',
								color: 'white',
								padding: '6px 10px',
								borderRadius: '6px',
								fontSize: '12px',
								fontWeight: '600',
								minWidth: '70px',
								textAlign: 'center',
								height: 'fit-content',
							}}>
								{step.time}
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>
									{step.activity}
								</div>
								<div style={{ fontSize: '14px', color: '#64748b' }}>
									{step.details}
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Map Button */}
			{adventure.map_url && (
				<a
					href={adventure.map_url}
					target="_blank"
					rel="noopener noreferrer"
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: '8px',
						backgroundColor: '#059669',
						color: 'white',
						textDecoration: 'none',
						padding: '12px 20px',
						borderRadius: '8px',
						fontWeight: '600',
						fontSize: '14px',
					}}
				>
					🗺️ Open Route in Google Maps
				</a>
			)}

			{/* Rating Modal */}
			{showRatingModal && (
				<div style={modalOverlayStyle}>
					<div style={modalStyle}>
						<h3 style={{ marginBottom: '20px', color: '#1e293b', fontSize: '1.5rem' }}>
							💾 Save Adventure
						</h3>

						<div style={{ marginBottom: '20px' }}>
							<label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#475569' }}>
								Rate this adventure (optional):
							</label>
							<div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
								{[1, 2, 3, 4, 5].map((star) => (
									<button
										key={star}
										onClick={() => setRating(star)}
										style={{
											...starButtonStyle,
											...(rating && rating >= star ? starSelectedStyle : {}),
										}}
									>
										⭐
									</button>
								))}
							</div>
							{rating && (
								<div style={{ textAlign: 'center', marginTop: '8px', color: '#64748b', fontSize: '0.9rem' }}>
									{rating === 5 ? '🌟 Amazing!' : rating === 4 ? '😊 Great!' : rating === 3 ? '👍 Good' : rating === 2 ? '😐 Okay' : '👎 Not great'}
								</div>
							)}
						</div>

						<div style={{ marginBottom: '20px' }}>
							<label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#475569' }}>
								Notes (optional):
							</label>
							<textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Add notes about this adventure..."
								style={textareaStyle}
								rows={3}
							/>
						</div>

						<div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
							<button
								onClick={() => {
									setShowRatingModal(false);
									setRating(null);
									setNotes('');
								}}
								style={cancelButtonStyle}
								disabled={isSaving}
							>
								Cancel
							</button>
							<button
								onClick={handleConfirmSave}
								style={confirmButtonStyle}
								disabled={isSaving}
							>
								{isSaving ? 'Saving...' : '💾 Save Adventure'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

// Helper Components
const InfoCard: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
	<div style={{
		backgroundColor: '#f9fafb',
		padding: '12px',
		borderRadius: '8px',
		border: '1px solid #e5e7eb',
	}}>
		<div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
			{icon} {label}
		</div>
		<div style={{ fontSize: '13px', color: '#1f2937', lineHeight: '1.4' }}>
			{value}
		</div>
	</div>
);

const StatCard: React.FC<{ value: string | number; label: string; color: string }> = ({ value, label, color }) => (
	<div style={{
		textAlign: 'center',
		backgroundColor: '#f8fafc',
		padding: '12px',
		borderRadius: '8px',
	}}>
		<div style={{ fontWeight: 'bold', color, fontSize: '16px' }}>
			{value}
		</div>
		<div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
	</div>
);

// Modal Styles
const modalOverlayStyle: React.CSSProperties = {
	position: 'fixed',
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	background: 'rgba(0, 0, 0, 0.5)',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
	background: 'white',
	borderRadius: '16px',
	padding: '30px',
	maxWidth: '500px',
	width: '90%',
	boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
};

const starButtonStyle: React.CSSProperties = {
	background: '#e2e8f0',
	border: 'none',
	borderRadius: '8px',
	padding: '12px',
	fontSize: '1.8rem',
	cursor: 'pointer',
	transition: 'all 0.2s',
};

const starSelectedStyle: React.CSSProperties = {
	background: '#fbbf24',
	transform: 'scale(1.15)',
};

const textareaStyle: React.CSSProperties = {
	width: '100%',
	padding: '12px',
	borderRadius: '8px',
	border: '2px solid #e2e8f0',
	fontSize: '0.95rem',
	fontFamily: 'inherit',
	resize: 'vertical',
};

const cancelButtonStyle: React.CSSProperties = {
	background: '#e2e8f0',
	color: '#475569',
	border: 'none',
	padding: '12px 24px',
	borderRadius: '8px',
	fontSize: '0.95rem',
	fontWeight: '600',
	cursor: 'pointer',
	transition: 'all 0.2s',
};

const confirmButtonStyle: React.CSSProperties = {
	background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	color: 'white',
	border: 'none',
	padding: '12px 24px',
	borderRadius: '8px',
	fontSize: '0.95rem',
	fontWeight: '600',
	cursor: 'pointer',
	transition: 'all 0.2s',
};

export default EnhancedAdventureCard;