// ============================================================
// frontend/src/components/OnboardingModal.tsx  (NEW)
// 3-question progressive profiling shown once on first use
// ============================================================
import React, { useState } from 'react';
import { useTheme, t } from '../contexts/ThemeContext';

interface Props { onComplete: (prefs: string) => void; username: string; }

const STEPS = [
	{ q: "What kind of vibe are you usually in the mood for?", options: ['☕ Relaxed & cozy', '🏃 Active & outdoorsy', '🎨 Cultural & artsy', '🍽️ Food-focused'] },
	{ q: "How do you prefer to get around?", options: ['🚶 Walking', '🚇 Transit', '🚗 Driving', '🚲 Cycling'] },
	{ q: "What's your typical budget for a half-day out?", options: ['💸 Under $20', '💵 $20–$50', '💳 $50–$100', '🤑 Whatever it takes'] },
];

const OnboardingModal: React.FC<Props> = ({ onComplete, username }) => {
	const { isDark } = useTheme();
	const tk = t(isDark);
	const [step, setStep] = useState(0);
	const [answers, setAnswers] = useState<string[]>([]);

	const handleSelect = (option: string) => {
		const next = [...answers, option];
		if (step < STEPS.length - 1) {
			setAnswers(next);
			setStep(s => s + 1);
		} else {
			localStorage.setItem('miniquest_onboarded', '1');
			const pref = `I like ${next[0].replace(/[^\w\s]/gi, '').trim().toLowerCase()} activities, prefer ${next[1].replace(/[^\w\s]/gi, '').trim().toLowerCase()}, budget around ${next[2].replace(/[^\w\s]/gi, '').trim().toLowerCase()}`;
			onComplete(pref);
		}
	};

	return (
		<div style={{
			position: 'fixed', inset: 0, zIndex: 4000,
			background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
			display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
		}}>
			<div style={{
				background: isDark ? '#1e1b4b' : 'white',
				borderRadius: 20, padding: 28, width: '100%', maxWidth: 420,
				boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
				border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
				textAlign: 'center',
			}}>
				<div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👋</div>
				<h2 style={{ margin: '0 0 4px 0', color: tk.textPrimary, fontSize: '1.2rem' }}>
					Welcome, {username}!
				</h2>
				<p style={{ fontSize: '0.82rem', color: tk.textMuted, marginBottom: 20 }}>
					3 quick questions to personalize your adventures
				</p>

				{/* Progress dots */}
				<div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
					{STEPS.map((_, i) => (
						<div key={i} style={{
							width: 8, height: 8, borderRadius: '50%',
							background: i <= step ? '#667eea' : (isDark ? 'rgba(255,255,255,0.2)' : '#e2e8f0'),
							transition: 'background 0.3s',
						}} />
					))}
				</div>

				<p style={{ fontSize: '0.95rem', fontWeight: 600, color: tk.textPrimary, marginBottom: 16 }}>
					{STEPS[step].q}
				</p>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{STEPS[step].options.map(opt => (
						<button
							key={opt}
							onClick={() => handleSelect(opt)}
							style={{
								padding: '12px 16px', borderRadius: 10,
								border: `2px solid ${isDark ? 'rgba(102,126,234,0.3)' : '#c7d2fe'}`,
								background: isDark ? 'rgba(102,126,234,0.08)' : '#eef2ff',
								color: tk.textPrimary, fontSize: '0.9rem', cursor: 'pointer',
								transition: 'all 0.15s', textAlign: 'left',
							}}
							onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(102,126,234,0.2)' : '#e0e7ff'; e.currentTarget.style.borderColor = '#667eea'; }}
							onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(102,126,234,0.08)' : '#eef2ff'; e.currentTarget.style.borderColor = isDark ? 'rgba(102,126,234,0.3)' : '#c7d2fe'; }}
						>{opt}</button>
					))}
				</div>

				<p style={{ fontSize: '0.72rem', color: tk.textMuted, marginTop: 16 }}>
					Step {step + 1} of {STEPS.length}
				</p>
			</div>
		</div>
	);
};

export default OnboardingModal;