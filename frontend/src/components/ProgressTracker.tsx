// frontend/src/components/ProgressTracker.tsx
import React, { useEffect, useState } from 'react';
import { useTheme, t } from '../contexts/ThemeContext';

interface ProgressUpdate {
	step: string;
	agent: string;
	status: 'in_progress' | 'complete' | 'error' | 'clarification_needed';
	message: string;
	progress: number;
	details?: any;
	error?: any;
}

interface ProgressTrackerProps {
	currentProgress: ProgressUpdate | null;
	progressHistory: ProgressUpdate[];
	isVisible: boolean;
}

const AGENT_EMOJI: Record<string, string> = {
	Coordinator: '🎯', LocationParser: '📍', RAG: '🧠',
	IntentParser: '🤔', VenueScout: '🔍', TavilyResearch: '🔬',
	ResearchSummary: '📊', RoutingAgent: '🗺️', AdventureCreator: '✨',
};

const STATUS_COLOR: Record<string, string> = {
	complete: '#10b981', in_progress: '#3b82f6', error: '#ef4444', clarification_needed: '#f59e0b',
};

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentProgress, progressHistory, isVisible }) => {
	const { isDark } = useTheme();
	const tk = t(isDark);
	const [displayPct, setDisplayPct] = useState(0);
	const target = Math.round((currentProgress?.progress || 0) * 100);

	// Animate percentage counter
	useEffect(() => {
		if (displayPct === target) return;
		const step = target > displayPct ? 1 : -1;
		const timer = setTimeout(() => setDisplayPct(p => p + step), 12);
		return () => clearTimeout(timer);
	}, [displayPct, target]);

	if (!isVisible) return null;

	return (
		<div style={{
			background: tk.progressCardBg,
			backdropFilter: 'blur(16px)',
			WebkitBackdropFilter: 'blur(16px)',
			border: `1px solid ${tk.progressCardBorder}`,
			borderRadius: '14px', padding: '20px', marginBottom: '20px',
			animation: 'slideDown 0.3s cubic-bezier(0.4,0,0.2,1)',
		}}>
			{/* Header */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
				<div style={{ fontSize: '1.2rem', animation: 'spin 1s linear infinite' }}>⭕</div>
				<div style={{ fontSize: '1rem', fontWeight: 700, color: tk.textPrimary }}>
					Adventure Generation Progress
				</div>
				<div style={{
					marginLeft: 'auto', fontSize: '1.4rem', fontWeight: 800,
					color: '#a78bfa', fontVariantNumeric: 'tabular-nums',
					transition: 'color 0.3s',
				}}>
					{displayPct}%
				</div>
			</div>

			{/* Progress bar */}
			<div style={{
				width: '100%', height: 10,
				background: tk.progressTrackBg,
				borderRadius: 5, overflow: 'hidden', marginBottom: 8, position: 'relative',
			}}>
				<div style={{
					width: `${target}%`, height: '100%',
					background: 'linear-gradient(90deg, #7c3aed, #3b82f6, #06b6d4)',
					backgroundSize: '200% 100%',
					borderRadius: 5,
					transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
					animation: currentProgress?.status === 'in_progress' ? 'shimmer-bg 2s linear infinite' : 'none',
					position: 'relative',
				}}>
					{/* Glow tip */}
					<div style={{
						position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
						width: 14, height: 14, borderRadius: '50%',
						background: 'white', boxShadow: '0 0 10px 4px rgba(124,58,237,0.6)',
						opacity: currentProgress?.status === 'in_progress' ? 1 : 0,
						transition: 'opacity 0.3s',
					}} />
				</div>
			</div>

			<div style={{ fontSize: '0.75rem', color: tk.textMuted, marginBottom: 16 }}>
				{currentProgress?.step || 'Initializing…'}
			</div>

			{/* Current agent card */}
			{currentProgress && (
				<div style={{
					background: currentProgress.status === 'in_progress' ? tk.stepCardBg : tk.stepCardIdleBg,
					border: `1px solid ${currentProgress.status === 'in_progress' ? tk.stepCardBorder : tk.stepCardIdleBorder}`,
					borderRadius: '10px', padding: '14px', marginBottom: 14,
					transition: 'all 0.3s',
					animation: 'fadeInUp 0.3s ease',
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<span style={{
							fontSize: '1.8rem',
							display: 'inline-block',
							animation: currentProgress.status === 'in_progress' ? 'bounce 0.8s ease infinite' : 'none',
						}}>
							{AGENT_EMOJI[currentProgress.agent] || '⚙️'}
						</span>
						<div style={{ flex: 1 }}>
							<div style={{ fontWeight: 600, color: tk.textPrimary, fontSize: '0.95rem', marginBottom: 3 }}>
								{currentProgress.agent}
							</div>
							<div style={{ fontSize: '0.85rem', color: tk.textSecondary, lineHeight: 1.4 }}>
								{currentProgress.message}
							</div>
						</div>
						{currentProgress.status === 'in_progress' && (
							<div style={{
								width: 20, height: 20,
								border: '3px solid rgba(59,130,246,0.3)',
								borderTopColor: '#3b82f6',
								borderRadius: '50%',
								animation: 'spin 0.8s linear infinite',
							}} />
						)}
						{currentProgress.status === 'complete' && (
							<div style={{
								color: '#10b981', fontSize: '1.4rem',
								animation: 'popIn 0.3s cubic-bezier(0.4,0,0.2,1)',
							}}>✓</div>
						)}
					</div>
					{currentProgress.details && (
						<div style={{
							fontSize: '0.75rem', color: tk.textMuted,
							marginTop: 10, paddingTop: 10,
							borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
							display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6,
						}}>
							{Object.entries(currentProgress.details).map(([k, v]) => (
								<div key={k}>
									<span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}: </span>
									<span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* History */}
			<div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`, paddingTop: 12 }}>
				<div style={{ fontSize: '0.78rem', fontWeight: 600, color: tk.textMuted, marginBottom: 8 }}>
					Recent Steps:
				</div>
				<div style={{ maxHeight: 150, overflowY: 'auto' }}>
					{progressHistory.slice(-8).reverse().map((upd, i) => (
						<div key={i} style={{
							display: 'flex', alignItems: 'center', gap: 10,
							padding: '6px 0',
							borderBottom: i < Math.min(progressHistory.length, 8) - 1
								? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'}`
								: 'none',
							opacity: upd.status === 'complete' ? 0.6 : 1,
							transition: 'opacity 0.3s',
						}}>
							<span style={{ fontSize: '1.1rem' }}>{AGENT_EMOJI[upd.agent] || '⚙️'}</span>
							<div style={{ flex: 1 }}>
								<div style={{ color: tk.textPrimary, fontSize: '0.8rem', fontWeight: 500 }}>{upd.agent}</div>
								<div style={{ color: tk.textSecondary, fontSize: '0.75rem' }}>{upd.message}</div>
							</div>
							<div style={{ fontSize: '0.7rem', color: STATUS_COLOR[upd.status], fontWeight: 600 }}>
								{upd.status === 'complete' ? '✓' : upd.status === 'error' ? '✗' : upd.status === 'in_progress' ? '⏳' : '•'}
							</div>
						</div>
					))}
				</div>
			</div>

			<style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer-bg {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
		</div>
	);
};

export default ProgressTracker;