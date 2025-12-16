// frontend/src/components/LoadingState.tsx
/**
 * Loading state component for adventure generation
 */

import React from 'react';
import { LocationStatus } from '../types/api';

interface LoadingStateProps {
	locationStatus: LocationStatus;
}

const LoadingState: React.FC<LoadingStateProps> = ({ locationStatus }) => {
	return (
		<div style={{
			textAlign: 'center',
			backgroundColor: '#f0f9ff',
			border: '1px solid #bae6fd',
			padding: '25px',
			borderRadius: '12px',
			marginBottom: '20px',
		}}>
			<div style={{ fontSize: '2rem', marginBottom: '15px' }}>🔍</div>
			<h3>Live Research in Progress...</h3>
			<div style={{ color: '#64748b', lineHeight: '1.6' }}>
				<div>🤖 Parsing your query with OpenAI...</div>
				<div>📍 Using {locationStatus === 'detected' ? 'auto-detected' : 'manual'} location...</div>
				<div>🏢 Scouting specific venues...</div>
				<div>📚 <strong>Researching live data with Tavily API:</strong></div>
				<div style={{ marginLeft: '20px', fontSize: '14px', color: '#059669' }}>
					• Current hours and access information<br />
					• Menu items, exhibitions, activities<br />
					• Visitor tips and recommendations<br />
					• Weather and seasonal updates
				</div>
				<div>🗺️ Enhancing with Google Maps...</div>
				<div>✨ Creating personalized adventures...</div>
			</div>
		</div>
	);
};

export default LoadingState;