// frontend/src/pages/SharedAdventurePage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme, t } from '../contexts/ThemeContext';
import EnhancedAdventureCard from '../components/EnhancedAdventureCard';

interface SharedData {
	share_id: string;
	adventure_data: any;
	shared_by: string;
	message?: string;
	view_count: number;
	created_at: string;
}

const SharedAdventurePage: React.FC = () => {
	const { shareId } = useParams<{ shareId: string }>();
	const { isDark } = useTheme();
	const tk = t(isDark);

	const [data, setData] = useState<SharedData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!shareId) return;
		const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
		fetch(`${apiBase}/api/share/${shareId}`)
			.then(res => {
				if (res.status === 404) throw new Error('This share link does not exist.');
				if (res.status === 410) throw new Error('This share link has expired.');
				if (!res.ok) throw new Error('Failed to load adventure.');
				return res.json();
			})
			.then(setData)
			.catch(e => setError(e.message))
			.finally(() => setLoading(false));
	}, [shareId]);

	const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';

	if (loading) return (
		<div style={{
			minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
			background: isDark ? '#0f0a1e' : '#f8fafc',
		}}>
			<div style={{ textAlign: 'center', color: tk.textMuted }}>
				<div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗺️</div>
				<div style={{ fontSize: '1rem' }}>Loading adventure...</div>
			</div>
		</div>
	);

	if (error) return (
		<div style={{
			minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
			background: isDark ? '#0f0a1e' : '#f8fafc',
		}}>
			<div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
				<div style={{ fontSize: '2.5rem', marginBottom: 12 }}>😕</div>
				<div style={{ fontSize: '1.1rem', fontWeight: 600, color: tk.textPrimary, marginBottom: 8 }}>{error}</div>
				<Link to="/" style={{ color: '#667eea', fontSize: '0.9rem' }}>← Go to MiniQuest</Link>
			</div>
		</div>
	);

	if (!data) return null;

	return (
		<div style={{
			minHeight: '100vh',
			background: isDark ? '#0f0a1e' : '#f8fafc',
			padding: '32px 16px',
		}}>
			<div style={{ maxWidth: 720, margin: '0 auto' }}>
				{/* Header */}
				<div style={{
					marginBottom: 24, padding: '20px 24px',
					background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
					borderRadius: 16, color: 'white',
				}}>
					<div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 4 }}>Shared via MiniQuest</div>
					<div style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>
						{data.adventure_data?.title || 'A MiniQuest Adventure'}
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.8rem', opacity: 0.9 }}>
						<span>👤 Shared by <strong>{data.shared_by}</strong></span>
						<span>👁️ {data.view_count} {data.view_count === 1 ? 'view' : 'views'}</span>
						<span>📅 {new Date(data.created_at).toLocaleDateString()}</span>
					</div>
					{data.message && (
						<div style={{
							marginTop: 12, padding: '10px 14px',
							background: 'rgba(255,255,255,0.15)', borderRadius: 8,
							fontSize: '0.88rem', fontStyle: 'italic',
						}}>
							"{data.message}"
						</div>
					)}
				</div>

				{/* Adventure card — read-only (no save button needed) */}
				<EnhancedAdventureCard
					adventure={data.adventure_data}
					index={0}
					onSave={undefined}
				/>

				{/* Footer CTA */}
				<div style={{
					marginTop: 24, padding: '20px 24px', textAlign: 'center',
					background: isDark ? 'rgba(255,255,255,0.04)' : 'white',
					border: `1px solid ${borderColor}`,
					borderRadius: 16,
				}}>
					<div style={{ fontSize: '1rem', fontWeight: 600, color: tk.textPrimary, marginBottom: 6 }}>
						Want to plan your own adventure?
					</div>
					<div style={{ fontSize: '0.85rem', color: tk.textMuted, marginBottom: 16 }}>
						MiniQuest creates spontaneous local adventures in Boston and New York City.
					</div>
					<Link
						to="/"
						style={{
							display: 'inline-block',
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							color: 'white', textDecoration: 'none',
							padding: '10px 24px', borderRadius: 20,
							fontSize: '0.88rem', fontWeight: 600,
							boxShadow: '0 2px 8px rgba(102,126,234,0.4)',
						}}
					>
						🗺️ Try MiniQuest
					</Link>
				</div>
			</div>
		</div>
	);
};

export default SharedAdventurePage;