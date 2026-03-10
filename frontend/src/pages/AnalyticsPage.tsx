// frontend/src/pages/AnalyticsPage.tsx
import React, { useEffect, useState } from 'react';
import { analyticsApi, EnhancedAnalyticsData } from '../api/analytics';
import LoadingState from '../components/common/LoadingState';
import { useTheme, t } from '../contexts/ThemeContext';

// ── Theme-aware style factories ─────────────────────────────

const getStyles = (isDark: boolean) => {
	const tk = t(isDark);
	return {
		card: {
			background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
			padding: '30px', borderRadius: '16px', textAlign: 'center' as const,
			boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)',
			transition: 'transform 0.2s',
			border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none',
		},
		section: {
			background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
			padding: '30px', borderRadius: '16px',
			boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)',
			marginBottom: '30px',
			border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none',
		},
		sectionTitle: {
			fontSize: '1.5rem', fontWeight: 'bold' as const,
			marginBottom: '20px', color: tk.textPrimary,
		},
		themeCard: {
			display: 'flex', alignItems: 'center' as const, gap: '15px', padding: '15px',
			background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
			borderRadius: '12px',
			border: `2px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
		},
		detailRow: {
			display: 'flex', justifyContent: 'space-between' as const, padding: '12px',
			background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
			borderRadius: '8px',
		},
		labelColor: tk.textSecondary,
		valueColor: tk.textPrimary,
		progressLabel: {
			marginBottom: '8px', color: tk.textSecondary,
			fontSize: '0.9rem', fontWeight: '600' as const,
		},
		progressTrack: {
			background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
			height: '24px', borderRadius: '12px', overflow: 'hidden' as const,
		},
		inactiveTab: {
			background: isDark ? 'rgba(255,255,255,0.08)' : 'white',
			color: isDark ? 'rgba(255,255,255,0.65)' : '#64748b',
			border: 'none', padding: '12px 24px', borderRadius: '8px 8px 0 0',
			fontSize: '1rem', fontWeight: '600' as const, cursor: 'pointer',
			transition: 'all 0.2s',
		},
		tabBorder: isDark ? '2px solid rgba(255,255,255,0.1)' : '2px solid #e2e8f0',
		insightItem: {
			padding: '15px',
			background: isDark ? 'rgba(59,130,246,0.1)' : '#f0f9ff',
			border: `2px solid ${isDark ? 'rgba(59,130,246,0.25)' : '#bae6fd'}`,
			borderRadius: '8px',
			color: isDark ? '#93c5fd' : '#0c4a6e',
			fontSize: '1rem',
		},
		timestamp: {
			textAlign: 'center' as const, color: tk.textMuted,
			fontSize: '0.9rem', marginTop: '20px',
		},
	};
};

type Styles = ReturnType<typeof getStyles>;

// ── Page ────────────────────────────────────────────────────

const AnalyticsPage: React.FC = () => {
	const [analytics, setAnalytics] = useState<EnhancedAnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'cache'>('overview');
	const { isDark } = useTheme();
	const tk = t(isDark);
	const s = getStyles(isDark);

	useEffect(() => { fetchAnalytics(); }, []);

	const fetchAnalytics = async () => {
		try {
			setLoading(true);
			const data = await analyticsApi.getSummary();
			setAnalytics(data);
			setError(null);
		} catch (err) {
			setError('Failed to load analytics');
		} finally {
			setLoading(false);
		}
	};

	if (loading) return (
		<div className="page-content" style={{ background: 'transparent', color: tk.textPrimary }}>
			<LoadingState message="Loading analytics..." />
		</div>
	);

	if (error || !analytics) return (
		<div className="page-content" style={{ background: 'transparent', color: tk.textPrimary }}>
			<ErrorState message={error ?? 'No data available'} onRetry={fetchAnalytics} />
		</div>
	);

	return (
		<div className="page-content" style={{ background: 'transparent', color: tk.textPrimary }}>

			{/* Header + Tabs */}
			<div style={{ marginBottom: '30px' }}>
				<h1 className="page-header" style={{ color: tk.textPrimary }}>📊 Analytics Dashboard</h1>
				<div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderBottom: s.tabBorder }}>
					{(['overview', 'performance', 'cache'] as const).map(tab => (
						<button key={tab} onClick={() => setActiveTab(tab)}
							style={activeTab === tab ? activeTabStyle : s.inactiveTab}
						>
							<span style={{ marginRight: '8px' }}>
								{tab === 'overview' ? '📋' : tab === 'performance' ? '⚡' : '💾'}
							</span>
							{tab.charAt(0).toUpperCase() + tab.slice(1)}
						</button>
					))}
				</div>
			</div>

			{activeTab === 'overview' && <OverviewTab analytics={analytics} s={s} />}
			{activeTab === 'performance' && <PerformanceTab analytics={analytics} s={s} />}
			{activeTab === 'cache' && <CacheTab analytics={analytics} s={s} />}

			{/* Insights */}
			{(analytics.insights?.length ?? 0) > 0 && (
				<div style={s.section}>
					<h2 style={s.sectionTitle}>💡 Insights</h2>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
						{analytics.insights?.map((insight, i) => (
							<div key={i} style={s.insightItem}>{insight}</div>
						))}
					</div>
				</div>
			)}

			<p style={s.timestamp}>
				Last updated: {new Date(analytics.processed_at ?? analytics.generated_at).toLocaleString()}
			</p>
		</div>
	);
};

// ── Tab components ──────────────────────────────────────────

const OverviewTab: React.FC<{ analytics: EnhancedAnalyticsData; s: Styles }> = ({ analytics, s }) => (
	<>
		<div style={statsGridStyle}>
			<StatCard icon="🔍" label="Total Queries" value={analytics.total_queries} color="#667eea" s={s} />
			<StatCard icon="👥" label="Total Users" value={analytics.total_users} color="#764ba2" s={s} />
			<StatCard icon="⏰" label="Queries (24h)" value={analytics.recent_queries_24h} color="#48bb78" s={s} />
			<StatCard icon="🎯" label="Avg Adventures" value={analytics.avg_adventures_per_query.toFixed(1)} color="#f59e0b" s={s} />
		</div>
		<div style={s.section}>
			<h2 style={s.sectionTitle}>🔥 Top Adventure Themes</h2>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
				{analytics.top_adventure_themes.map((theme, i) => (
					<div key={i} style={s.themeCard}>
						<div style={rankBadgeStyle}>#{i + 1}</div>
						<div style={{ flex: 1 }}>
							<div style={{ fontSize: '1.1rem', fontWeight: 600, color: s.valueColor, marginBottom: 5 }}>
								{theme.theme}
							</div>
							<div style={{ color: s.labelColor, fontSize: '0.9rem' }}>
								{theme.count} {theme.count === 1 ? 'adventure' : 'adventures'}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	</>
);

const PerformanceTab: React.FC<{ analytics: EnhancedAnalyticsData; s: Styles }> = ({ analytics, s }) => {
	const perf = analytics.performance;
	if (!perf) return <div style={s.section}>No performance data available</div>;
	return (
		<>
			<div style={statsGridStyle}>
				<StatCard icon="⚡" label="Avg Response Time" value={`${perf.avg_response_time}s`} color="#667eea" s={s} subtitle={perf.improvement_vs_baseline ? `${perf.improvement_vs_baseline} faster` : undefined} />
				<StatCard icon="🏃" label="Fastest Query" value={`${perf.fastest_query}s`} color="#48bb78" s={s} />
				<StatCard icon="🐌" label="Slowest Query" value={`${perf.slowest_query}s`} color="#f59e0b" s={s} />
				<StatCard icon="📊" label="Median Time" value={`${perf.median_response_time}s`} color="#764ba2" s={s} />
			</div>
			<div style={s.section}>
				<h2 style={s.sectionTitle}>📈 Performance Breakdown</h2>
				<div style={detailsGridStyle}>
					<DetailRow label="Queries Tracked" value={perf.total_queries_tracked} s={s} />
					<DetailRow label="Avg Adventures Generated" value={perf.avg_adventures_generated} s={s} />
					<DetailRow label="Performance Baseline" value={`${perf.performance_baseline}s`} s={s} />
					<DetailRow label="Performance Trend" value={perf.performance_trend} s={s}
						valueColor={perf.performance_trend === 'improving' ? '#48bb78' : perf.performance_trend === 'degrading' ? '#ef4444' : s.labelColor}
					/>
				</div>
			</div>
			<div style={s.section}>
				<h2 style={s.sectionTitle}>🚀 Optimization Impact</h2>
				<div style={{ marginTop: '20px' }}>
					<ImpactBar label="Baseline" value={perf.performance_baseline} percentage={100} color="#cbd5e1" s={s} />
					<ImpactBar label="Current Avg" value={perf.avg_response_time} percentage={(perf.avg_response_time / perf.performance_baseline) * 100} color="#667eea" s={s} />
					<div style={improvementBadgeStyle}>{perf.improvement_vs_baseline ?? 'N/A'} Improvement</div>
				</div>
			</div>
		</>
	);
};

const CacheTab: React.FC<{ analytics: EnhancedAnalyticsData; s: Styles }> = ({ analytics, s }) => {
	const cache = analytics.cache;
	const perf = analytics.performance;
	if (!cache) return <div style={s.section}>Cache data not available</div>;
	if (!cache.enabled) return <div style={s.section}>⚠️ Cache is not enabled</div>;
	return (
		<>
			<div style={statsGridStyle}>
				<StatCard icon="💾" label="Cache Hit Rate" value={perf?.cache_hit_rate ?? cache.lifetime_hit_rate ?? 'N/A'} color="#667eea" s={s} />
				<StatCard icon="✅" label="Lifetime Hits" value={cache.lifetime_hits ?? 0} color="#48bb78" s={s} />
				<StatCard icon="❌" label="Lifetime Misses" value={cache.lifetime_misses ?? 0} color="#f59e0b" s={s} />
				<StatCard icon="⏰" label="Time Saved" value={cache.estimated_time_saved ?? 'N/A'} color="#764ba2" s={s} />
			</div>
			<div style={s.section}>
				<h2 style={s.sectionTitle}>📊 Cache Status</h2>
				<div style={detailsGridStyle}>
					<DetailRow label="Current Size" value={`${cache.current_size ?? 0} / ${cache.max_size ?? 0}`} s={s} />
					<DetailRow label="Capacity Used" value={cache.capacity_used ?? 'N/A'} s={s} />
					<DetailRow label="TTL" value={`${cache.ttl_minutes ?? 0} minutes`} s={s} />
					<DetailRow label="Status" value="Operational" s={s} valueColor="#48bb78" />
				</div>
				<div style={{ marginTop: '30px' }}>
					<div style={s.progressLabel}>
						Cache Capacity: {cache.current_size} / {cache.max_size} venues
					</div>
					<div style={s.progressTrack}>
						<div style={{
							height: '100%', transition: 'width 0.5s ease',
							width: cache.capacity_used,
							background: parseInt(cache.capacity_used ?? '0') > 80 ? '#ef4444'
								: parseInt(cache.capacity_used ?? '0') > 50 ? '#f59e0b' : '#48bb78',
						}} />
					</div>
				</div>
			</div>
			{perf && (
				<div style={s.section}>
					<h2 style={s.sectionTitle}>⚡ Cache Performance Impact</h2>
					<div style={detailsGridStyle}>
						<DetailRow label="Cache Hits (Recent)" value={perf.cache_hits_total ?? 0} s={s} />
						<DetailRow label="Cache Attempts (Recent)" value={perf.cache_attempts_total ?? 0} s={s} />
						<DetailRow label="Time Saved (Recent)" value={perf.time_saved_by_cache ?? '0s'} s={s} />
					</div>
				</div>
			)}
		</>
	);
};

// ── Small components ────────────────────────────────────────

const StatCard: React.FC<{
	icon: string; label: string; value: number | string;
	color: string; s: Styles; subtitle?: string;
}> = ({ icon, label, value, color, s, subtitle }) => (
	<div style={{ ...s.card, borderTop: `4px solid ${color}` }}>
		<div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
		<div style={{ fontSize: '2.5rem', fontWeight: 'bold', color, marginBottom: '5px' }}>{value}</div>
		<div style={{ color: s.labelColor, fontSize: '0.9rem' }}>{label}</div>
		{subtitle && <div style={{ color: '#48bb78', fontSize: '0.8rem', marginTop: '5px', fontWeight: 600 }}>{subtitle}</div>}
	</div>
);

const DetailRow: React.FC<{
	label: string; value: string | number; s: Styles; valueColor?: string;
}> = ({ label, value, s, valueColor }) => (
	<div style={s.detailRow}>
		<span style={{ color: s.labelColor }}>{label}:</span>
		<span style={{ fontWeight: 600, color: valueColor ?? s.valueColor }}>{value}</span>
	</div>
);

const ImpactBar: React.FC<{
	label: string; value: number; percentage: number; color: string; s: Styles;
}> = ({ label, value, percentage, color, s }) => (
	<div style={{ marginBottom: '15px' }}>
		<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
			<span style={{ color: s.labelColor, fontSize: '0.9rem' }}>{label}</span>
			<span style={{ fontWeight: 600, color: s.valueColor }}>{value}s</span>
		</div>
		<div style={s.progressTrack}>
			<div style={{ height: '100%', transition: 'width 0.5s ease', width: `${percentage}%`, background: color }} />
		</div>
	</div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
	<div style={{ textAlign: 'center', padding: '50px' }}>
		<div style={{ fontSize: '3rem', marginBottom: '20px' }}>❌</div>
		<p style={{ color: '#ef4444', fontSize: '1.1rem', marginBottom: '20px' }}>{message}</p>
		<button onClick={onRetry} style={retryButtonStyle}>🔄 Retry</button>
	</div>
);

// ── Static styles ───────────────────────────────────────────

const activeTabStyle: React.CSSProperties = {
	background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	color: 'white', border: 'none', padding: '12px 24px',
	borderRadius: '8px 8px 0 0', fontSize: '1rem',
	fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
};

const statsGridStyle: React.CSSProperties = {
	display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
	gap: '20px', marginBottom: '40px',
};

const detailsGridStyle: React.CSSProperties = {
	display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px',
};

const rankBadgeStyle: React.CSSProperties = {
	background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	color: 'white', width: '40px', height: '40px', borderRadius: '50%',
	display: 'flex', alignItems: 'center', justifyContent: 'center',
	fontWeight: 'bold', fontSize: '1.1rem',
};

const improvementBadgeStyle: React.CSSProperties = {
	marginTop: '20px', padding: '12px 24px',
	background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
	color: 'white', borderRadius: '8px', textAlign: 'center',
	fontSize: '1.1rem', fontWeight: 'bold',
};

const retryButtonStyle: React.CSSProperties = {
	background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	color: 'white', border: 'none', padding: '12px 30px',
	borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
};

export default AnalyticsPage;