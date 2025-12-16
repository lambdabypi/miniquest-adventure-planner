// frontend/src/components/common/ThemeCard.tsx
/**
 * Theme/ranking card component
 * Used in: AnalyticsPage
 */

import React from 'react';

interface ThemeCardProps {
	theme: string;
	count: number;
	rank: number;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, count, rank }) => (
	<div className="theme-card">
		<div className="rank-badge">#{rank}</div>
		<div className="theme-card-content">
			<div className="theme-card-title">{theme}</div>
			<div className="theme-card-count">
				{count} {count === 1 ? 'adventure' : 'adventures'}
			</div>
		</div>
	</div>
);

export default ThemeCard;