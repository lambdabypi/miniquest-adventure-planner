// frontend/src/components/OutOfScopeMessage.tsx

import React from 'react';

interface RecommendedService {
	name: string;
	url: string;
	description: string;
}

interface OutOfScopeMessageProps {
	scopeIssue: string;
	message: string;
	suggestions: string[];
	recommendedServices: RecommendedService[];
	onSuggestionClick: (suggestion: string) => void;
}

const OutOfScopeMessage: React.FC<OutOfScopeMessageProps> = ({
	scopeIssue,
	message,
	suggestions,
	recommendedServices,
	onSuggestionClick,
}) => {
	const getIcon = () => {
		switch (scopeIssue) {
			case 'multi_day_trip': return '🗓️';
			case 'international_travel': return '🌍';
			case 'accommodation_planning': return '🏨';
			case 'trip_budget_detected': return '💰';
			default: return '🗺️';
		}
	};

	const getTitle = () => {
		switch (scopeIssue) {
			case 'multi_day_trip': return 'Multi-Day Trip Planning';
			case 'international_travel': return 'International Travel';
			case 'accommodation_planning': return 'Accommodation Search';
			case 'trip_budget_detected': return 'Large Trip Budget';
			default: return 'Out of Scope';
		}
	};

	return (
		<div style={{
			maxWidth: '700px',
			margin: '40px auto',
			padding: '30px',
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			borderRadius: '16px',
			boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
			color: 'white'
		}}>
			<div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '20px' }}>
				{getIcon()}
			</div>

			<h2 style={{
				textAlign: 'center',
				marginBottom: '15px',
				fontSize: '28px',
				fontWeight: 'bold'
			}}>
				{getTitle()}
			</h2>

			<p style={{
				textAlign: 'center',
				fontSize: '16px',
				lineHeight: '1.6',
				marginBottom: '30px',
				opacity: 0.95
			}}>
				{message}
			</p>

			{/* Recommended Services */}
			{recommendedServices && recommendedServices.length > 0 && (
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
					gap: '15px',
					marginBottom: '30px'
				}}>
					{recommendedServices.map((service, idx) => (
						<a
							key={idx}
							href={service.url}
							target="_blank"
							rel="noopener noreferrer"
							style={{
								background: 'rgba(255,255,255,0.2)',
								backdropFilter: 'blur(10px)',
								padding: '20px',
								borderRadius: '12px',
								textAlign: 'center',
								textDecoration: 'none',
								color: 'white',
								transition: 'all 0.3s ease',
								border: '1px solid rgba(255,255,255,0.3)',
								cursor: 'pointer'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
								e.currentTarget.style.transform = 'translateY(-3px)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
								e.currentTarget.style.transform = 'translateY(0)';
							}}
						>
							<div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '6px' }}>
								{service.name}
							</div>
							<div style={{ fontSize: '12px', opacity: 0.9 }}>
								{service.description}
							</div>
						</a>
					))}
				</div>
			)}

			{/* MiniQuest Suggestions */}
			{suggestions && suggestions.length > 0 && (
				<div style={{
					background: 'rgba(255,255,255,0.15)',
					backdropFilter: 'blur(10px)',
					padding: '20px',
					borderRadius: '12px',
					border: '1px solid rgba(255,255,255,0.3)'
				}}>
					<h3 style={{
						fontSize: '18px',
						marginBottom: '15px',
						fontWeight: '600'
					}}>
						✨ Try MiniQuest for these instead:
					</h3>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
						{suggestions.map((suggestion, idx) => (
							<div
								key={idx}
								style={{
									background: 'rgba(255,255,255,0.1)',
									padding: '12px 16px',
									borderRadius: '8px',
									fontSize: '14px',
									cursor: 'pointer',
									transition: 'background 0.2s ease'
								}}
								onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
								onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
								onClick={() => onSuggestionClick(suggestion)}
							>
								💡 {suggestion}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default OutOfScopeMessage;