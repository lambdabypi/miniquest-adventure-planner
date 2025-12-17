// frontend/src/components/ProgressTracker.tsx
import React from 'react';

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

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
	currentProgress,
	progressHistory,
	isVisible
}) => {
	if (!isVisible) return null;

	const getAgentEmoji = (agent: string): string => {
		const emojiMap: Record<string, string> = {
			'Coordinator': '🎯',
			'LocationParser': '📍',
			'RAG': '🧠',
			'IntentParser': '🤔',
			'VenueScout': '🔍',
			'TavilyResearch': '🔬',
			'ResearchSummary': '📊',
			'RoutingAgent': '🗺️',
			'AdventureCreator': '✨'
		};
		return emojiMap[agent] || '⚙️';
	};

	const getStatusColor = (status: string): string => {
		switch (status) {
			case 'complete': return '#10b981';
			case 'in_progress': return '#3b82f6';
			case 'error': return '#ef4444';
			case 'clarification_needed': return '#f59e0b';
			default: return '#64748b';
		}
	};

	return (
		<div style={{
			background: 'white',
			border: '1px solid #e2e8f0',
			borderRadius: '12px',
			padding: '20px',
			marginBottom: '20px',
			boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
		}}>
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: '10px',
				marginBottom: '15px'
			}}>
				<div style={{ fontSize: '1.2rem' }}>🔄</div>
				<div style={{
					fontSize: '1rem',
					fontWeight: '600',
					color: '#1e293b'
				}}>
					Adventure Generation Progress
				</div>
			</div>

			{/* Progress Bar */}
			<div style={{ marginBottom: '20px' }}>
				<div style={{
					width: '100%',
					height: '10px',
					background: '#e2e8f0',
					borderRadius: '5px',
					overflow: 'hidden',
					position: 'relative'
				}}>
					<div style={{
						width: `${(currentProgress?.progress || 0) * 100}%`,
						height: '100%',
						background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
						transition: 'width 0.5s ease',
						position: 'relative',
						overflow: 'hidden'
					}}>
						{/* Animated shimmer effect */}
						<div style={{
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
							animation: currentProgress?.status === 'in_progress' ? 'shimmer 2s infinite' : 'none'
						}} />
					</div>
				</div>
				<div style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginTop: '8px'
				}}>
					<div style={{
						fontSize: '0.75rem',
						color: '#64748b'
					}}>
						{currentProgress?.step || 'Initializing...'}
					</div>
					<div style={{
						fontSize: '0.85rem',
						fontWeight: '600',
						color: '#1e293b'
					}}>
						{Math.round((currentProgress?.progress || 0) * 100)}%
					</div>
				</div>
			</div>

			{/* Current Step */}
			{currentProgress && (
				<div style={{
					background: currentProgress.status === 'in_progress' ? '#f0f9ff' : '#f8fafc',
					border: `1px solid ${currentProgress.status === 'in_progress' ? '#bae6fd' : '#e2e8f0'}`,
					borderRadius: '8px',
					padding: '15px',
					marginBottom: '15px'
				}}>
					<div style={{
						display: 'flex',
						alignItems: 'center',
						gap: '12px',
						marginBottom: currentProgress.details ? '10px' : '0'
					}}>
						<span style={{ fontSize: '1.8rem' }}>
							{getAgentEmoji(currentProgress.agent)}
						</span>
						<div style={{ flex: 1 }}>
							<div style={{
								fontWeight: '600',
								color: '#1e293b',
								fontSize: '0.95rem',
								marginBottom: '4px'
							}}>
								{currentProgress.agent}
							</div>
							<div style={{
								fontSize: '0.85rem',
								color: '#64748b',
								lineHeight: '1.4'
							}}>
								{currentProgress.message}
							</div>
						</div>
						{currentProgress.status === 'in_progress' && (
							<div className="spinner-large" />
						)}
						{currentProgress.status === 'complete' && (
							<div style={{
								color: '#10b981',
								fontSize: '1.5rem'
							}}>
								✓
							</div>
						)}
					</div>

					{/* Details */}
					{currentProgress.details && (
						<div style={{
							fontSize: '0.75rem',
							color: '#64748b',
							marginTop: '10px',
							paddingTop: '10px',
							borderTop: '1px solid #e2e8f0',
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
							gap: '8px'
						}}>
							{Object.entries(currentProgress.details).map(([key, value]) => (
								<div key={key}>
									<span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
										{key.replace(/_/g, ' ')}:
									</span>{' '}
									<span>
										{typeof value === 'object' ? JSON.stringify(value) : String(value)}
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Progress History */}
			<div style={{
				borderTop: '1px solid #e2e8f0',
				paddingTop: '15px'
			}}>
				<div style={{
					fontSize: '0.8rem',
					fontWeight: '600',
					color: '#64748b',
					marginBottom: '10px'
				}}>
					Recent Steps:
				</div>
				<div style={{
					maxHeight: '150px',
					overflowY: 'auto',
					fontSize: '0.8rem'
				}}>
					{progressHistory.slice(-8).reverse().map((update, idx) => (
						<div
							key={idx}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '10px',
								padding: '8px 0',
								borderBottom: idx < progressHistory.slice(-8).length - 1 ? '1px solid #f1f5f9' : 'none',
								opacity: update.status === 'complete' ? 0.7 : 1
							}}
						>
							<span style={{ fontSize: '1.2rem' }}>
								{getAgentEmoji(update.agent)}
							</span>
							<div style={{ flex: 1 }}>
								<div style={{
									color: '#1e293b',
									fontSize: '0.8rem',
									fontWeight: '500'
								}}>
									{update.agent}
								</div>
								<div style={{
									color: '#64748b',
									fontSize: '0.75rem'
								}}>
									{update.message}
								</div>
							</div>
							<div style={{
								fontSize: '0.7rem',
								color: getStatusColor(update.status),
								fontWeight: '600'
							}}>
								{update.status === 'complete' ? '✓' :
									update.status === 'error' ? '✗' :
										update.status === 'in_progress' ? '⏳' : '•'}
							</div>
						</div>
					))}
				</div>
			</div>

			<style>{`
				@keyframes shimmer {
					0% { transform: translateX(-100%); }
					100% { transform: translateX(100%); }
				}
				
				.spinner-large {
					width: 20px;
					height: 20px;
					border: 3px solid rgba(59, 130, 246, 0.3);
					border-top-color: #3b82f6;
					border-radius: 50%;
					animation: spin 0.8s linear infinite;
				}
				
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
			`}</style>
		</div>
	);
};

export default ProgressTracker;