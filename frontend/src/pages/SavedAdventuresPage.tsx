// frontend/src/pages/SavedAdventuresPage.tsx
import React, { useEffect, useState } from 'react';
import { savedAdventuresApi } from '../api/savedAdventures';
import BackgroundOrbs from '../components/common/BackgroundOrbs';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

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
	current_info?: string;
	hours_info?: string;
	visitor_tips?: string[];
}

interface SavedAdventure {
	_id: string;
	adventure_data: {
		title: string;
		tagline: string;
		description?: string;
		duration: number;
		cost: number;
		theme?: string;
		steps?: Array<{
			time: string;
			activity: string;
			details: string;
		}>;
		map_url?: string;
		venues_research?: VenueWithResearch[];
	};
	rating: number | null;
	notes: string | null;
	saved_at: string;
	completed: boolean;
	tags?: string[];
}

const SavedAdventuresPage: React.FC = () => {
	const [adventures, setAdventures] = useState<SavedAdventure[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
	const [expandedAdventure, setExpandedAdventure] = useState<string | null>(null);

	useEffect(() => {
		fetchSavedAdventures();
	}, [filter]);

	const fetchSavedAdventures = async () => {
		try {
			setLoading(true);
			const response = await savedAdventuresApi.getSavedAdventures(
				50,
				filter === 'all' ? undefined : filter === 'completed'
			);
			setAdventures(response.adventures);
		} catch (error) {
			console.error('Error fetching saved adventures:', error);
		} finally {
			setLoading(false);
		}
	};

	const markAsCompleted = async (adventureId: string) => {
		try {
			await savedAdventuresApi.updateSavedAdventure(adventureId, {
				completed: true
			});
			fetchSavedAdventures();
		} catch (error) {
			console.error('Error marking adventure as completed:', error);
		}
	};

	const deleteAdventure = async (adventureId: string) => {
		if (!confirm('Are you sure you want to delete this adventure?')) return;

		try {
			await savedAdventuresApi.deleteSavedAdventure(adventureId);
			fetchSavedAdventures();
		} catch (error) {
			console.error('Error deleting adventure:', error);
		}
	};

	const toggleExpand = (adventureId: string) => {
		setExpandedAdventure(expandedAdventure === adventureId ? null : adventureId);
	};

	return (
		<div className="page-container">
			<BackgroundOrbs />

			<div className="page-content">
				<h1 className="page-header">💾 Saved Adventures</h1>

				{/* Filter Tabs */}
				<div style={filterContainerStyle}>
					<button
						onClick={() => setFilter('all')}
						style={{
							...filterButtonStyle,
							...(filter === 'all' ? filterButtonActiveStyle : {}),
						}}
					>
						All ({adventures.length})
					</button>
					<button
						onClick={() => setFilter('active')}
						style={{
							...filterButtonStyle,
							...(filter === 'active' ? filterButtonActiveStyle : {}),
						}}
					>
						Active
					</button>
					<button
						onClick={() => setFilter('completed')}
						style={{
							...filterButtonStyle,
							...(filter === 'completed' ? filterButtonActiveStyle : {}),
						}}
					>
						Completed
					</button>
				</div>

				{loading ? (
					<LoadingState message="Loading your saved adventures..." />
				) : adventures.length === 0 ? (
					<EmptyState
						title="No saved adventures yet"
						message="Start exploring and save your favorite adventures!"
					/>
				) : (
					<div style={{ display: 'grid', gap: '20px' }}>
						{adventures.map((saved) => {
							const isExpanded = expandedAdventure === saved._id;
							const adventure = saved.adventure_data;

							return (
								<div key={saved._id} style={adventureCardStyle}>
									{/* Header Section */}
									<div style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'start',
										marginBottom: '15px',
										paddingBottom: '15px',
										borderBottom: '1px solid #e2e8f0'
									}}>
										<div style={{ flex: 1 }}>
											<h3 style={{
												fontSize: '1.4rem',
												marginBottom: '8px',
												color: '#1e293b',
												display: 'flex',
												alignItems: 'center',
												gap: '10px'
											}}>
												{adventure.title}
												{saved.completed && (
													<span style={completedBadgeStyle}>✓ Completed</span>
												)}
											</h3>
											<p style={{ color: '#64748b', marginBottom: '12px', fontStyle: 'italic' }}>
												{adventure.tagline}
											</p>

											{/* Rating Display */}
											{saved.rating && (
												<div style={{ marginBottom: '8px', fontSize: '1.2rem' }}>
													{'⭐'.repeat(saved.rating)}
												</div>
											)}

											{/* Tags */}
											{saved.tags && saved.tags.length > 0 && (
												<div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
													{saved.tags.map((tag, idx) => (
														<span key={idx} style={tagStyle}>
															{tag}
														</span>
													))}
												</div>
											)}

											{/* Notes */}
											{saved.notes && (
												<div style={notesStyle}>
													<strong>📝 Notes:</strong> {saved.notes}
												</div>
											)}

											<div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '12px' }}>
												Saved {new Date(saved.saved_at).toLocaleDateString()}
											</div>
										</div>

										{/* Action Buttons */}
										<div style={{ display: 'flex', gap: '8px' }}>
											<button
												onClick={() => toggleExpand(saved._id)}
												style={{
													...actionButtonStyle,
													background: isExpanded ? '#3b82f6' : '#667eea'
												}}
												title={isExpanded ? "Hide details" : "Show details"}
											>
												{isExpanded ? '🔼' : '🔽'}
											</button>
											{!saved.completed && (
												<button
													onClick={() => markAsCompleted(saved._id)}
													style={actionButtonStyle}
													title="Mark as completed"
												>
													✓
												</button>
											)}
											<button
												onClick={() => deleteAdventure(saved._id)}
												style={{ ...actionButtonStyle, background: '#ef4444' }}
												title="Delete"
											>
												🗑️
											</button>
										</div>
									</div>

									{/* Stats Grid (Always Visible) */}
									<div style={{
										display: 'grid',
										gridTemplateColumns: 'repeat(3, 1fr)',
										gap: '15px',
										marginBottom: '15px',
									}}>
										<StatCard value={`${adventure.duration}min`} label="Duration" color="#059669" />
										<StatCard value={`$${adventure.cost}`} label="Est. Cost" color="#dc2626" />
										<StatCard value={adventure.steps?.length || 0} label="Stops" color="#2563eb" />
									</div>

									{/* Expanded Details */}
									{isExpanded && (
										<div style={{ marginTop: '20px' }}>
											{/* Research Details */}
											{adventure.venues_research && adventure.venues_research.length > 0 && (
												<div style={{
													backgroundColor: '#f0fdf4',
													border: '2px solid #bbf7d0',
													borderRadius: '12px',
													padding: '20px',
													marginBottom: '20px',
												}}>
													<h4 style={{
														color: '#15803d',
														marginBottom: '15px',
														display: 'flex',
														alignItems: 'center',
														gap: '8px'
													}}>
														✨ AI-Summarized Venue Insights
														<span style={liveBadgeStyle}>LIVE DATA</span>
													</h4>

													<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
														{adventure.venues_research.map((venue, idx) => {
															const venueName = venue.venue_name || venue.matched_to || 'Unknown Venue';
															const summary = venue.research_summary;

															if (!summary) {
																return (
																	<div key={idx} style={noSummaryStyle}>
																		<h5 style={{ color: '#dc2626', margin: '0' }}>
																			⚠️ {venueName} (No Summary)
																		</h5>
																	</div>
																);
															}

															return (
																<div key={idx} style={venueCardStyle}>
																	{/* Venue Header */}
																	<div style={venueHeaderStyle}>
																		<h5 style={{ color: '#1f2937', margin: '0', fontSize: '16px', fontWeight: '700' }}>
																			📍 {venueName}
																		</h5>
																		<div style={confidenceBadgeStyle}>
																			{Math.round((venue.research_confidence || 0) * 100)}% Confidence
																		</div>
																	</div>

																	{/* Summary */}
																	<p style={summaryTextStyle}>
																		{summary.visitor_summary}
																	</p>

																	{/* Key Highlights */}
																	{summary.key_highlights && summary.key_highlights.length > 0 && (
																		<div style={{ marginBottom: '15px' }}>
																			<div style={sectionTitleStyle}>
																				⭐ Highlights:
																			</div>
																			<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
																				{summary.key_highlights.map((highlight, hIdx) => (
																					<div key={hIdx} style={highlightBadgeStyle}>
																						✓ {highlight}
																					</div>
																				))}
																			</div>
																		</div>
																	)}

																	{/* Practical Info Grid */}
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

																	{/* Insider Tips */}
																	{summary.practical_info?.insider_tips && summary.practical_info.insider_tips.length > 0 && (
																		<div>
																			<div style={sectionTitleStyle}>
																				💡 Insider Tips:
																			</div>
																			{summary.practical_info.insider_tips.map((tip, tipIdx) => (
																				<div key={tipIdx} style={tipStyle}>
																					✓ {tip}
																				</div>
																			))}
																		</div>
																	)}

																	{/* Research Metadata */}
																	<div style={metadataStyle}>
																		📊 {summary.confidence_notes} | Based on {venue.total_insights || 0} research insights
																	</div>
																</div>
															);
														})}
													</div>
												</div>
											)}

											{/* Itinerary Steps */}
											{adventure.steps && adventure.steps.length > 0 && (
												<div style={{ marginBottom: '20px' }}>
													<h4 style={{ color: '#1e293b', marginBottom: '15px', fontSize: '1.1rem' }}>
														📍 Itinerary
													</h4>
													{adventure.steps.map((step, idx) => (
														<div key={idx} style={stepStyle}>
															<div style={timeStyle}>
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
													style={mapButtonStyle}
												>
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
		</div>
	);
};

// ========================================
// HELPER COMPONENTS
// ========================================

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

// ========================================
// STYLES
// ========================================

const filterContainerStyle: React.CSSProperties = {
	display: 'flex',
	gap: '10px',
	marginBottom: '30px',
	justifyContent: 'center',
};

const filterButtonStyle: React.CSSProperties = {
	background: 'white',
	border: '2px solid #e2e8f0',
	padding: '10px 24px',
	borderRadius: '8px',
	fontSize: '0.95rem',
	fontWeight: '600',
	cursor: 'pointer',
	color: '#64748b',
	transition: 'all 0.2s',
};

const filterButtonActiveStyle: React.CSSProperties = {
	background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	color: 'white',
	borderColor: 'transparent',
};

const adventureCardStyle: React.CSSProperties = {
	background: 'white',
	borderRadius: '16px',
	padding: '25px',
	boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
	border: '2px solid #e2e8f0',
	transition: 'all 0.3s',
};

const completedBadgeStyle: React.CSSProperties = {
	backgroundColor: '#dcfce7',
	color: '#15803d',
	padding: '4px 12px',
	borderRadius: '12px',
	fontSize: '0.75rem',
	fontWeight: '600',
};

const tagStyle: React.CSSProperties = {
	backgroundColor: '#e0e7ff',
	color: '#4338ca',
	padding: '4px 10px',
	borderRadius: '8px',
	fontSize: '0.8rem',
	fontWeight: '600',
};

const notesStyle: React.CSSProperties = {
	backgroundColor: '#fef3c7',
	border: '1px solid #fbbf24',
	padding: '12px',
	borderRadius: '8px',
	fontSize: '0.9rem',
	color: '#78350f',
	marginBottom: '12px',
};

const actionButtonStyle: React.CSSProperties = {
	background: '#48bb78',
	color: 'white',
	border: 'none',
	borderRadius: '8px',
	padding: '10px 14px',
	cursor: 'pointer',
	fontSize: '1rem',
	transition: 'all 0.2s',
	fontWeight: '600',
};

const liveBadgeStyle: React.CSSProperties = {
	backgroundColor: '#16a34a',
	color: 'white',
	fontSize: '10px',
	padding: '2px 6px',
	borderRadius: '10px',
	fontWeight: '600',
};

const venueCardStyle: React.CSSProperties = {
	backgroundColor: 'white',
	border: '1px solid #d1d5db',
	borderRadius: '12px',
	padding: '20px',
	boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
};

const venueHeaderStyle: React.CSSProperties = {
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	marginBottom: '15px',
	paddingBottom: '12px',
	borderBottom: '1px solid #e5e7eb',
};

const confidenceBadgeStyle: React.CSSProperties = {
	backgroundColor: '#dcfce7',
	color: '#15803d',
	padding: '4px 8px',
	borderRadius: '8px',
	fontSize: '11px',
	fontWeight: '600',
};

const summaryTextStyle: React.CSSProperties = {
	color: '#374151',
	fontSize: '14px',
	lineHeight: '1.6',
	marginBottom: '15px',
	fontStyle: 'italic',
};

const sectionTitleStyle: React.CSSProperties = {
	fontSize: '13px',
	fontWeight: '600',
	color: '#15803d',
	marginBottom: '8px',
};

const highlightBadgeStyle: React.CSSProperties = {
	fontSize: '12px',
	color: '#374151',
	backgroundColor: '#dbeafe',
	border: '1px solid #3b82f6',
	padding: '6px 10px',
	borderRadius: '6px',
};

const tipStyle: React.CSSProperties = {
	fontSize: '13px',
	color: '#374151',
	backgroundColor: '#fef3c7',
	border: '1px solid #fbbf24',
	padding: '10px',
	borderRadius: '6px',
	marginBottom: '6px',
	lineHeight: '1.5',
};

const metadataStyle: React.CSSProperties = {
	fontSize: '11px',
	color: '#9ca3af',
	borderTop: '1px solid #e5e7eb',
	paddingTop: '10px',
	marginTop: '12px',
	fontStyle: 'italic',
};

const stepStyle: React.CSSProperties = {
	display: 'flex',
	gap: '12px',
	marginBottom: '12px',
	padding: '15px',
	backgroundColor: '#f8fafc',
	borderRadius: '10px',
	border: '1px solid #e2e8f0',
};

const timeStyle: React.CSSProperties = {
	backgroundColor: '#2563eb',
	color: 'white',
	padding: '6px 10px',
	borderRadius: '6px',
	fontSize: '12px',
	fontWeight: '600',
	minWidth: '70px',
	textAlign: 'center',
	height: 'fit-content',
};

const mapButtonStyle: React.CSSProperties = {
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
	transition: 'all 0.2s',
};

const noSummaryStyle: React.CSSProperties = {
	backgroundColor: '#fef2f2',
	border: '1px solid #fecaca',
	borderRadius: '12px',
	padding: '15px',
};

export default SavedAdventuresPage