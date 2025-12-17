// frontend/src/components/OutOfScopeMessage.tsx - City-Aware
import React from 'react';

interface RecommendedService {
	name: string;
	url: string;
	description: string;
}

interface Props {
	scopeIssue: string;
	message: string;
	suggestions: string[];
	recommendedServices: RecommendedService[];
	onSuggestionClick: (suggestion: string) => void;
	detectedCity?: string;  // ✅ NEW: Show which city was detected
}

const OutOfScopeMessage: React.FC<Props> = ({
	scopeIssue,
	message,
	suggestions,
	recommendedServices,
	onSuggestionClick,
	detectedCity,
}) => {
	// ✅ Determine icon and color based on scope issue
	const getIssueConfig = () => {
		if (scopeIssue === 'unsupported_city') {
			return {
				icon: '🌍',
				color: '#dc2626',
				gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
				title: 'Location Not Supported',
			};
		}

		switch (scopeIssue) {
			case 'multi_day_trip':
				return {
					icon: '📅',
					color: '#2563eb',
					gradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
					title: 'Multi-Day Planning',
				};
			case 'international_travel':
				return {
					icon: '✈️',
					color: '#059669',
					gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
					title: 'International Travel',
				};
			case 'accommodation_planning':
				return {
					icon: '🏨',
					color: '#7c3aed',
					gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
					title: 'Accommodation Booking',
				};
			case 'trip_budget_detected':
				return {
					icon: '💰',
					color: '#d97706',
					gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
					title: 'Trip Budget Planning',
				};
			default:
				return {
					icon: '🚫',
					color: '#dc2626',
					gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
					title: 'Out of Scope',
				};
		}
	};

	const config = getIssueConfig();

	return (
		<div
			style={{
				background: config.gradient,
				color: 'white',
				borderRadius: '16px',
				padding: '35px',
				marginBottom: '20px',
				boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
			}}
		>
			{/* Header */}
			<div style={{ textAlign: 'center', marginBottom: '25px' }}>
				<div style={{ fontSize: '4rem', marginBottom: '15px' }}>{config.icon}</div>
				<h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '15px' }}>
					{config.title}
				</h2>

				{/* ✅ Show detected city if unsupported_city */}
				{scopeIssue === 'unsupported_city' && detectedCity && (
					<div
						style={{
							backgroundColor: 'rgba(255, 255, 255, 0.2)',
							padding: '8px 16px',
							borderRadius: '20px',
							display: 'inline-block',
							marginBottom: '15px',
							fontSize: '0.9rem',
							fontWeight: '600',
						}}
					>
						📍 {detectedCity}
					</div>
				)}

				<p style={{ fontSize: '1.1rem', lineHeight: '1.7', opacity: 0.95 }}>
					{message}
				</p>
			</div>

			{/* Suggestions */}
			{suggestions && suggestions.length > 0 && (
				<div
					style={{
						backgroundColor: 'rgba(255, 255, 255, 0.15)',
						backdropFilter: 'blur(10px)',
						padding: '25px',
						borderRadius: '12px',
						marginBottom: recommendedServices.length > 0 ? '20px' : '0',
						border: '1px solid rgba(255, 255, 255, 0.3)',
					}}
				>
					<h3 style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: '600' }}>
						💡 Try these instead:
					</h3>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
						{suggestions.map((suggestion, idx) => (
							<button
								key={idx}
								onClick={() => onSuggestionClick(suggestion)}
								style={{
									background: 'rgba(255, 255, 255, 0.95)',
									color: '#1e293b',
									border: 'none',
									padding: '14px 18px',
									borderRadius: '10px',
									fontSize: '0.95rem',
									cursor: 'pointer',
									transition: 'all 0.2s',
									textAlign: 'left',
									fontWeight: '500',
									boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'white';
									e.currentTarget.style.transform = 'translateX(8px)';
									e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
									e.currentTarget.style.transform = 'translateX(0)';
									e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
								}}
							>
								→ {suggestion}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Recommended Services */}
			{recommendedServices && recommendedServices.length > 0 && (
				<div
					style={{
						backgroundColor: 'rgba(255, 255, 255, 0.15)',
						backdropFilter: 'blur(10px)',
						padding: '25px',
						borderRadius: '12px',
						border: '1px solid rgba(255, 255, 255, 0.3)',
					}}
				>
					<h3 style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: '600' }}>
						🔗 Recommended Services:
					</h3>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
						{recommendedServices.map((service, idx) => (
							<a
								key={idx}
								href={service.url}
								target="_blank"
								rel="noopener noreferrer"
								style={{
									background: 'rgba(255, 255, 255, 0.95)',
									color: '#1e293b',
									padding: '16px 20px',
									borderRadius: '10px',
									textDecoration: 'none',
									transition: 'all 0.2s',
									display: 'flex',
									flexDirection: 'column',
									gap: '6px',
									boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'white';
									e.currentTarget.style.transform = 'scale(1.02)';
									e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
									e.currentTarget.style.transform = 'scale(1)';
									e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
								}}
							>
								<div style={{ fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
									{service.name}
									<span style={{ fontSize: '0.8rem', opacity: 0.6 }}>↗</span>
								</div>
								<div style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: '1.5' }}>
									{service.description}
								</div>
							</a>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default OutOfScopeMessage;