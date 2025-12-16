// frontend/src/components/common/EmptyState.tsx
/**
 * Reusable empty state component
 * Used in: HistoryPage, AdventuresPage
 */

import React from 'react';

interface EmptyStateProps {
	icon?: string;
	title: string;
	message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
	icon = '🗺️',
	title,
	message
}) => (
	<div className="empty-state">
		<div className="empty-state-icon">{icon}</div>
		<h3 className="empty-state-title">{title}</h3>
		<p className="empty-state-message">{message}</p>
	</div>
);

export default EmptyState;