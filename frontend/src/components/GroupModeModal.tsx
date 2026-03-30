// ============================================================
// frontend/src/components/GroupModeModal.tsx  (NEW)
// Multi-person preference input
// ============================================================
import React, { useState } from 'react';
import { useTheme, t } from '../contexts/ThemeContext';

interface Person { name: string; preferences: string; }

interface Props {
	onGenerate: (prompt: string) => void;
	onClose: () => void;
	location: string;
}

const GroupModeModal: React.FC<Props> = ({ onGenerate, onClose, location }) => {
	const { isDark } = useTheme();
	const tk = t(isDark);
	const [people, setPeople] = useState<Person[]>([
		{ name: '', preferences: '' },
		{ name: '', preferences: '' },
	]);

	const addPerson = () => {
		if (people.length < 6) setPeople(p => [...p, { name: '', preferences: '' }]);
	};

	const update = (i: number, field: keyof Person, val: string) => {
		setPeople(p => p.map((person, idx) => idx === i ? { ...person, [field]: val } : person));
	};

	const handleGenerate = () => {
		const valid = people.filter(p => p.preferences.trim());
		if (valid.length < 2) return;
		const desc = valid.map(p => `${p.name || 'Person'}: ${p.preferences}`).join(', ');
		const prompt = `Group adventure in ${location} for: ${desc}. Find something everyone will enjoy.`;
		onGenerate(prompt);
		onClose();
	};

	const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';

	return (
		<div style={{
			position: 'fixed', inset: 0, zIndex: 3000,
			background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
			display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
		}} onClick={onClose}>
			<div
				onClick={e => e.stopPropagation()}
				style={{
					background: isDark ? '#1e1b4b' : 'white',
					borderRadius: 16, padding: 24, width: '100%', maxWidth: 480,
					boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
					border: `1px solid ${borderColor}`,
				}}
			>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
					<h2 style={{ margin: 0, fontSize: '1.1rem', color: tk.textPrimary }}>👥 Group Mode</h2>
					<button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: tk.textMuted }}>✕</button>
				</div>
				<p style={{ fontSize: '0.82rem', color: tk.textMuted, marginBottom: 16 }}>
					Enter each person's preferences - MiniQuest will find an adventure everyone enjoys.
				</p>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
					{people.map((person, i) => (
						<div key={i} style={{ display: 'flex', gap: 8 }}>
							<input
								placeholder={`Name ${i + 1}`}
								value={person.name}
								onChange={e => update(i, 'name', e.target.value)}
								style={{
									width: 90, padding: '8px 10px', borderRadius: 8,
									border: `1px solid ${borderColor}`, fontSize: '0.82rem',
									background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
									color: tk.textPrimary, flexShrink: 0,
								}}
							/>
							<input
								placeholder="e.g. coffee, art, parks"
								value={person.preferences}
								onChange={e => update(i, 'preferences', e.target.value)}
								style={{
									flex: 1, padding: '8px 10px', borderRadius: 8,
									border: `1px solid ${borderColor}`, fontSize: '0.82rem',
									background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
									color: tk.textPrimary,
								}}
							/>
						</div>
					))}
				</div>

				<div style={{ display: 'flex', gap: 8 }}>
					{people.length < 6 && (
						<button
							onClick={addPerson}
							style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: tk.textSecondary, fontSize: '0.82rem', cursor: 'pointer' }}
						>+ Add person</button>
					)}
					<button
						onClick={handleGenerate}
						disabled={people.filter(p => p.preferences.trim()).length < 2}
						style={{
							flex: 1, padding: '9px 14px', borderRadius: 8, border: 'none',
							background: 'linear-gradient(135deg,#667eea,#764ba2)',
							color: 'white', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
						}}
					>
						🗺️ Find group adventure
					</button>
				</div>
			</div>
		</div>
	);
};

export default GroupModeModal;