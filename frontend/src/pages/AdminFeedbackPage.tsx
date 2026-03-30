// frontend/src/pages/AdminFeedbackPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, t } from '../contexts/ThemeContext';
import apiClient from '../api/client';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

interface FeedbackItem {
	_id: string;
	username: string;
	email: string;
	overall_rating: number;
	what_worked?: string;
	what_to_improve?: string;
	feature_requests?: string;
	free_text?: string;
	would_recommend?: boolean;
	submitted_at: string;
}

interface Stats {
	total: number;
	avg_rating: number;
	recommend_pct: number;
	distribution: Record<string, number>;
}

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
	<span style={{ letterSpacing: 2 }}>
		{[1, 2, 3, 4, 5].map(n => (
			<span key={n} style={{ opacity: n <= rating ? 1 : 0.2 }}>⭐</span>
		))}
	</span>
);

const AdminFeedbackPage: React.FC = () => {
	const { user } = useAuth();
	const { isDark } = useTheme();
	const tk = t(isDark);

	const isAdmin = !!ADMIN_EMAIL && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

	const [items, setItems] = useState<FeedbackItem[]>([]);
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [expanded, setExpanded] = useState<string | null>(null);
	const [filter, setFilter] = useState<number | 'all'>('all');

	useEffect(() => {
		if (!isAdmin) { setLoading(false); return; }
		const load = async () => {
			try {
				const [fbRes, stRes] = await Promise.all([
					apiClient.get<FeedbackItem[]>('/api/feedback'),
					apiClient.get<Stats>('/api/feedback/stats'),
				]);
				setItems(fbRes.data);
				setStats(stRes.data);
			} catch (e: any) {
				setError(e.response?.data?.detail || 'Failed to load feedback');
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [isAdmin]);

	const border = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
	const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'white';
	const filtered = filter === 'all' ? items : items.filter(i => i.overall_rating === filter);

	const statCard = (label: string, value: string | number, emoji: string) => (
		<div style={{
			flex: 1, minWidth: 120, padding: '18px 20px', borderRadius: 12,
			background: cardBg, border: `1px solid ${border}`,
			boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
			textAlign: 'center',
		}}>
			<div style={{ fontSize: '1.6rem', marginBottom: 4 }}>{emoji}</div>
			<div style={{ fontSize: '1.5rem', fontWeight: 700, color: tk.textPrimary }}>{value}</div>
			<div style={{ fontSize: '0.72rem', color: tk.textMuted, marginTop: 2 }}>{label}</div>
		</div>
	);

	// ── Access denied ─────────────────────────────────────────────────────────
	if (!loading && !isAdmin) {
		return (
			<div style={{
				minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
				padding: '40px 20px',
			}}>
				<div style={{ textAlign: 'center', maxWidth: 420 }}>
					<div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
					<h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: tk.textPrimary, margin: '0 0 10px' }}>
						Admin access only
					</h2>
					<p style={{ color: tk.textSecondary, lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>
						This page is restricted to the MiniQuest admin account.
					</p>
				</div>
			</div>
		);
	}

	// ── Loading ───────────────────────────────────────────────────────────────
	if (loading) return (
		<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
			<div style={{ fontSize: '0.95rem', color: tk.textMuted }}>Loading feedback…</div>
		</div>
	);

	// ── Error ─────────────────────────────────────────────────────────────────
	if (error) return (
		<div style={{ padding: 40, color: '#fca5a5' }}>{error}</div>
	);

	return (
		<div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 80px' }}>
			{/* Header */}
			<div style={{ marginBottom: 32 }}>
				<h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: tk.textPrimary, margin: 0 }}>
					📋 Feedback Dashboard
				</h1>
				<p style={{ color: tk.textMuted, marginTop: 6, fontSize: '0.88rem' }}>
					Only visible to you.
				</p>
			</div>

			{/* Stats row */}
			{stats && (
				<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
					{statCard('Total responses', stats.total, '📝')}
					{statCard('Avg rating', `${stats.avg_rating} / 5`, '⭐')}
					{statCard('Would recommend', `${stats.recommend_pct}%`, '👍')}
					<div style={{
						flex: 2, minWidth: 200, padding: '18px 20px', borderRadius: 12,
						background: cardBg, border: `1px solid ${border}`,
						boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
					}}>
						<div style={{ fontSize: '0.72rem', color: tk.textMuted, marginBottom: 10, fontWeight: 600 }}>RATING DISTRIBUTION</div>
						{[5, 4, 3, 2, 1].map(n => {
							const count = stats.distribution[String(n)] || 0;
							const pct = stats.total ? Math.round(count / stats.total * 100) : 0;
							return (
								<div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
									<span style={{ fontSize: '0.78rem', width: 16, color: tk.textMuted }}>{n}★</span>
									<div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', overflow: 'hidden' }}>
										<div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #667eea, #764ba2)', transition: 'width 0.5s ease' }} />
									</div>
									<span style={{ fontSize: '0.72rem', color: tk.textMuted, width: 24, textAlign: 'right' }}>{count}</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Filter chips */}
			<div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
				{(['all', 5, 4, 3, 2, 1] as const).map(f => (
					<button key={String(f)} onClick={() => setFilter(f)}
						style={{
							padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
							fontWeight: 600, fontSize: '0.78rem',
							border: `1px solid ${filter === f ? '#667eea' : border}`,
							background: filter === f ? (isDark ? 'rgba(102,126,234,0.2)' : '#ede9fe') : 'transparent',
							color: filter === f ? (isDark ? '#a78bfa' : '#7c3aed') : tk.textSecondary,
							transition: 'all 0.15s',
						}}
					>
						{f === 'all' ? `All (${items.length})` : `${f}★ (${items.filter(i => i.overall_rating === f).length})`}
					</button>
				))}
			</div>

			{/* Feedback list */}
			{filtered.length === 0 ? (
				<div style={{ textAlign: 'center', padding: '60px 20px', color: tk.textMuted }}>
					No feedback yet.
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					{filtered.map(item => {
						const isOpen = expanded === item._id;
						const date = new Date(item.submitted_at).toLocaleDateString('en-US', {
							month: 'short', day: 'numeric', year: 'numeric',
							hour: '2-digit', minute: '2-digit',
						});
						return (
							<div key={item._id} style={{
								background: cardBg, border: `1px solid ${border}`,
								borderRadius: 12, overflow: 'hidden',
								boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
							}}>
								<button
									onClick={() => setExpanded(isOpen ? null : item._id)}
									style={{
										width: '100%', background: 'none', border: 'none', cursor: 'pointer',
										padding: '14px 18px',
										display: 'flex', alignItems: 'center', gap: 14,
										textAlign: 'left',
									}}
								>
									<Stars rating={item.overall_rating} />
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ fontWeight: 600, fontSize: '0.9rem', color: tk.textPrimary }}>
											{item.username}
											<span style={{ fontWeight: 400, color: tk.textMuted, marginLeft: 8, fontSize: '0.82rem' }}>
												{item.email}
											</span>
										</div>
										<div style={{ fontSize: '0.75rem', color: tk.textMuted, marginTop: 2 }}>{date}</div>
									</div>
									{item.would_recommend !== undefined && (
										<span style={{ fontSize: '1.1rem' }}>{item.would_recommend ? '👍' : '👎'}</span>
									)}
									<span style={{ color: tk.textMuted, fontSize: '0.8rem', flexShrink: 0 }}>
										{isOpen ? '▲' : '▼'}
									</span>
								</button>

								{isOpen && (
									<div style={{ padding: '0 18px 18px', borderTop: `1px solid ${border}` }}>
										{[
											{ label: '✨ What worked', value: item.what_worked },
											{ label: '🔧 What to improve', value: item.what_to_improve },
											{ label: '🚀 Feature requests', value: item.feature_requests },
											{ label: '💬 Free text', value: item.free_text },
										].filter(s => s.value?.trim()).map(({ label, value }) => (
											<div key={label} style={{ marginTop: 14 }}>
												<div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', color: isDark ? '#a78bfa' : '#7c3aed', marginBottom: 4 }}>
													{label}
												</div>
												<div style={{ fontSize: '0.9rem', color: tk.textSecondary, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
													{value}
												</div>
											</div>
										))}
										{![item.what_worked, item.what_to_improve, item.feature_requests, item.free_text].some(v => v?.trim()) && (
											<div style={{ marginTop: 14, fontSize: '0.85rem', color: tk.textMuted, fontStyle: 'italic' }}>
												No written responses.
											</div>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default AdminFeedbackPage;