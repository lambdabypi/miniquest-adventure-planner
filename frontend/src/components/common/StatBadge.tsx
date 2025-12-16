// frontend/src/components/common/StatBadge.tsx
/**
 * Stat badge with icon and text
 * Used in: HistoryPage
 */

import React from 'react';

interface StatBadgeProps {
	icon: string;
	text: string;
}

const StatBadge: React.FC<StatBadgeProps> = ({ icon, text }) => (
	<span className="stat-badge">
		<span className="stat-badge-icon">{icon}</span>
		<span className="stat-badge-text">{text}</span>
	</span>
);

export default StatBadge;