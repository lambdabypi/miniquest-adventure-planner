// ============================================================
// frontend/src/components/LoadingState.tsx  (non-common version)
// ============================================================
// Uncomment and use this as a separate file:

import React from 'react';
import { LocationStatus } from '../types/api';
import { useTheme, t } from '../contexts/ThemeContext';

interface LoadingStateProps {
	locationStatus: LocationStatus;
}

const LoadingState: React.FC<LoadingStateProps> = ({ locationStatus }) => {
	const { isDark } = useTheme();
	const tk = t(isDark);

	const steps = [
		{ icon: '🤖', text: 'Parsing your query with OpenAI…' },
		{ icon: '📍', text: `Using ${locationStatus === 'detected' ? 'auto-detected' : 'manual'} location…` },
		{ icon: '🏢', text: 'Scouting specific venues…' },
		{ icon: '🔬', text: 'Researching live data with Tavily API…' },
		{ icon: '🗺️', text: 'Optimizing route with Google Maps…' },
		{ icon: '✨', text: 'Creating personalized adventures…' },
	];

	return (
		<div style={{
			background: tk.loadingBg,
			border: `1px solid ${tk.loadingBorder}`,
			backdropFilter: 'blur(12px)',
			padding: '28px', borderRadius: '14px', marginBottom: '20px',
			textAlign: 'center',
		}}>
			<div style={{ fontSize: '2.5rem', marginBottom: '14px', animation: 'spin-slow 3s linear infinite', display: 'inline-block' }}>🔍</div>
			<h3 style={{ color: tk.textPrimary, marginBottom: '18px', fontWeight: 700 }}>Live Research in Progress…</h3>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', maxWidth: 360, margin: '0 auto' }}>
				{steps.map(({ icon, text }, i) => (
					<div key={i} style={{
						display: 'flex', alignItems: 'center', gap: 10,
						color: tk.textSecondary, fontSize: '0.88rem', lineHeight: 1.5,
						animation: `slideInStep 0.4s ease both`,
						animationDelay: `${i * 80}ms`,
					}}>
						<span style={{ fontSize: '1.1rem' }}>{icon}</span>
						{text}
					</div>
				))}
			</div>
			<style>{`
		@keyframes slideInStep {
		  from { opacity: 0; transform: translateX(-10px); }
		  to { opacity: 1; transform: translateX(0); }
		}
		@keyframes spin-slow {
		  to { transform: rotate(360deg); }
		}
	  `}</style>
		</div>
	);
};

export default LoadingState;
