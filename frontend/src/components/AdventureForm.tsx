// ============================================================
// frontend/src/components/AdventureForm.tsx
// ============================================================
import React from 'react';
import { useTheme, t } from '../contexts/ThemeContext';

interface AdventureFormProps {
	query: string;
	setQuery: (query: string) => void;
	onGenerate: () => void;
	onTest: () => void;
	loading: boolean;
}

const AdventureForm: React.FC<AdventureFormProps> = ({ query, setQuery, onGenerate, onTest, loading }) => {
	const { isDark } = useTheme();
	const tk = t(isDark);

	return (
		<div style={{ marginBottom: '20px' }}>
			<label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: tk.textPrimary, fontSize: '0.9rem' }}>
				Adventure Query:
			</label>
			<textarea
				value={query}
				onChange={e => setQuery(e.target.value)}
				placeholder={`Examples:\n- 'Coffee shops and parks in Boston'\n- 'Museums in NYC'\n- 'Art galleries and wine bars in Cambridge'`}
				style={{
					width: '100%', padding: '13px 16px',
					background: tk.formTextareaBg,
					border: `1px solid ${tk.formTextareaBorder}`,
					borderRadius: '12px', fontSize: '0.95rem',
					color: tk.textPrimary, minHeight: '100px', resize: 'vertical',
					outline: 'none', fontFamily: 'inherit',
					transition: 'border-color 0.2s, box-shadow 0.2s',
				}}
				onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
				onBlur={e => { e.currentTarget.style.borderColor = tk.formTextareaBorder; e.currentTarget.style.boxShadow = 'none'; }}
			/>
			<div style={{ fontSize: '0.78rem', color: tk.textGreen, marginTop: 6, fontWeight: 600 }}>
				🔍 Live research on hours, menus, events + smart Google Maps routing
			</div>
			<div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
				<button
					onClick={onGenerate}
					disabled={loading}
					style={{
						flex: 1, padding: '13px 20px', border: 'none', borderRadius: '12px',
						fontSize: '0.95rem', fontWeight: 700, color: 'white',
						background: loading ? 'rgba(100,116,139,0.4)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
						cursor: loading ? 'not-allowed' : 'pointer',
						boxShadow: loading ? 'none' : '0 4px 16px rgba(124,58,237,0.35)',
						transition: 'all 0.2s',
					}}
					onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
					onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
				>
					{loading ? '🔍 Researching…' : '🚀 Generate Adventures'}
				</button>
				<button
					onClick={onTest}
					style={{
						padding: '13px 20px', border: 'none', borderRadius: '12px',
						fontSize: '0.95rem', fontWeight: 700, color: 'white',
						background: 'linear-gradient(135deg, #059669, #10b981)',
						cursor: 'pointer', transition: 'all 0.2s',
						boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
					}}
					onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
					onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
				>
					🧪 Test
				</button>
			</div>
		</div>
	);
};

export default AdventureForm;