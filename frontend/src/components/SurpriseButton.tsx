// ============================================================
// frontend/src/components/SurpriseButton.tsx  (NEW)
// One-click full plan - no input needed
// ============================================================
import React from 'react';

const SURPRISE_PROMPTS = [
	'Surprise me with coffee shops and parks',
	'Give me a spontaneous afternoon with museums and food',
	'Surprise me with art galleries and cafes',
	'Give me a random adventure with restaurants and culture',
	'Surprise me with outdoor spots and coffee',
	'Give me something fun with food and history',
	'Surprise me with bookshops and coffee',
	'Give me a spontaneous day with parks and brunch',
];

interface Props {
	onSurprise: (prompt: string) => void;
	loading: boolean;
	isDark: boolean;
}

const SurpriseButton: React.FC<Props> = ({ onSurprise, loading, isDark }) => {
	const handleClick = () => {
		const prompt = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
		onSurprise(prompt);
	};

	return (
		<button
			onClick={handleClick}
			disabled={loading}
			title="Get a random adventure, no input needed!"
			style={{
				background: loading
					? (isDark ? '#374151' : '#cbd5e0')
					: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
				color: 'white', border: 'none', borderRadius: 8,
				padding: '10px',
				fontSize: '1rem',
				cursor: loading ? 'not-allowed' : 'pointer',
				flexShrink: 0, lineHeight: 1,
				boxShadow: loading ? 'none' : '0 2px 8px rgba(245,158,11,0.4)',
				transition: 'opacity 0.2s, transform 0.15s',
			}}
			onMouseEnter={e => { if (!loading) { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
			onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
		>
			🎲
		</button>
	);
};

export default SurpriseButton;