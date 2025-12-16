// frontend/src/components/common/LoadingState.tsx
/**
 * Reusable loading state component
 * Used in: HistoryPage, AnalyticsPage
 */

import React from 'react';

interface LoadingStateProps {
	message?: string;
	icon?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
	message = 'Loading...',
	icon = '⏳'
}) => (
	<div className="loading-state">
		<div className="loading-state-icon">{icon}</div>
		<p className="loading-state-message">{message}</p>
	</div>
);

export default LoadingState;