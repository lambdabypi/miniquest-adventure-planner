// frontend/src/components/common/StatCard.tsx
/**
 * Statistics card component for analytics
 * Used in: AnalyticsPage
 */

import React from 'react';

interface StatCardProps {
	icon: string;
	label: string;
	value: number | string;
	color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
	<div className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
		<div className="stat-card-icon">{icon}</div>
		<div className="stat-card-value" style={{ color }}>
			{value}
		</div>
		<div className="stat-card-label">{label}</div>
	</div>
);

export default StatCard;