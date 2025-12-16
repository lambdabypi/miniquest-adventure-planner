// frontend/src/pages/AnalyticsPage.tsx
import React, { useEffect, useState } from 'react';
import { analyticsApi, EnhancedAnalyticsData } from '../api/analytics';
import BackgroundOrbs from '../components/common/BackgroundOrbs';
import LoadingState from '../components/common/LoadingState';

const AnalyticsPage: React.FC = () => {
	const [analytics, setAnalytics] = useState<EnhancedAnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'cache'>('overview');

	useEffect(() => {
		fetchAnalytics();
	}, []);

	const fetchAnalytics = async () => {
		try {
			setLoading(true);
			const data = await analyticsApi.getSummary();
			setAnalytics(data);
			setError(null);
		} catch (err) {
			setError('Failed to load analytics');
			console.error('Analytics error:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="page-container">
				<BackgroundOrbs />
				<div className="page-content">
					<LoadingState message="Loading analytics..." />
				</div>
			</div>
		);
	}

	if (error || !analytics) {
		return (
			<div className="page-container">
				<BackgroundOrbs />
				<div className="page-content">
					<ErrorState message={error || 'No data available'} onRetry={fetchAnalytics} />
				</div>
			</div>
		);
	}

	return (
		<div className="page-container">
			<BackgroundOrbs />

			<div className="page-content">
				{/* Header */}
				<div style={headerStyle}>
					<h1 className="page-header">📊 Analytics Dashboard</h1>
					<div style={tabsContainerStyle}>
						<TabButton
							active={activeTab === 'overview'}
							onClick={() => setActiveTab('overview')}
							label="Overview"
							icon="📋"
						/>
						<TabButton
							active={activeTab === 'performance'}
							onClick={() => setActiveTab('performance')}
							label="Performance"
							icon="⚡"
						/>
						<TabButton
							active={activeTab === 'cache'}
							onClick={() => setActiveTab('cache')}
							label="Cache"
							icon="💾"
						/>
					</div>
				</div>

				{/* Tab Content */}
				{activeTab === 'overview' && <OverviewTab analytics={analytics} />}
				{activeTab === 'performance' && <PerformanceTab analytics={analytics} />}
				{activeTab === 'cache' && <CacheTab analytics={analytics} />}

				{/* Insights Section */}
				{analytics.insights && analytics.insights.length > 0 && (
					<InsightsSection insights={analytics.insights} />
				)}

				<p style={timestampStyle}>
					Last updated: {new Date(analytics.processed_at || analytics.generated_at).toLocaleString()}
				</p>
			</div>
		</div>
	);
};

// ========================================
// TAB COMPONENTS
// ========================================

const OverviewTab: React.FC<{ analytics: EnhancedAnalyticsData }> = ({ analytics }) => (
	<>
		{/* Stats Cards */}
		<div style={statsGridStyle}>
			<StatCard
				icon="🔍"
				label="Total Queries"
				value={analytics.total_queries}
				color="#667eea"
			/>
			<StatCard
				icon="👥"
				label="Total Users"
				value={analytics.total_users}
				color="#764ba2"
			/>
			<StatCard
				icon="⏰"
				label="Queries (24h)"
				value={analytics.recent_queries_24h}
				color="#48bb78"
			/>
			<StatCard
				icon="🎯"
				label="Avg Adventures"
				value={analytics.avg_adventures_per_query.toFixed(1)}
				color="#f59e0b"
			/>
		</div>

		{/* Top Themes */}
		<div style={sectionStyle}>
			<h2 style={sectionTitleStyle}>🔥 Top Adventure Themes</h2>
			<div style={themesContainerStyle}>
				{analytics.top_adventure_themes.map((theme, index) => (
					<ThemeCard key={index} theme={theme.theme} count={theme.count} rank={index + 1} />
				))}
			</div>
		</div>
	</>
);

const PerformanceTab: React.FC<{ analytics: EnhancedAnalyticsData }> = ({ analytics }) => {
	const perf = analytics.performance;

	if (!perf) {
		return <div style={sectionStyle}>No performance data available</div>;
	}

	return (
		<>
			{/* Performance Stats Grid */}
			<div style={statsGridStyle}>
				<StatCard
					icon="⚡"
					label="Avg Response Time"
					value={`${perf.avg_response_time}s`}
					color="#667eea"
					subtitle={perf.improvement_vs_baseline ? `${perf.improvement_vs_baseline} faster` : undefined}
				/>
				<StatCard
					icon="🏃"
					label="Fastest Query"
					value={`${perf.fastest_query}s`}
					color="#48bb78"
				/>
				<StatCard
					icon="🐌"
					label="Slowest Query"
					value={`${perf.slowest_query}s`}
					color="#f59e0b"
				/>
				<StatCard
					icon="📊"
					label="Median Time"
					value={`${perf.median_response_time}s`}
					color="#764ba2"
				/>
			</div>

			{/* Performance Details */}
			<div style={sectionStyle}>
				<h2 style={sectionTitleStyle}>📈 Performance Breakdown</h2>
				<div style={detailsGridStyle}>
					<DetailRow label="Queries Tracked" value={perf.total_queries_tracked} />
					<DetailRow label="Avg Adventures Generated" value={perf.avg_adventures_generated} />
					<DetailRow label="Performance Baseline" value={`${perf.performance_baseline}s`} />
					<DetailRow
						label="Performance Trend"
						value={perf.performance_trend}
						valueColor={
							perf.performance_trend === 'improving'
								? '#48bb78'
								: perf.performance_trend === 'degrading'
									? '#ef4444'
									: '#64748b'
						}
					/>
				</div>
			</div>

			{/* Optimization Impact */}
			<div style={sectionStyle}>
				<h2 style={sectionTitleStyle}>🚀 Optimization Impact</h2>
				<div style={impactContainerStyle}>
					<ImpactBar
						label="Baseline"
						value={perf.performance_baseline}
						percentage={100}
						color="#cbd5e1"
					/>
					<ImpactBar
						label="Current Avg"
						value={perf.avg_response_time}
						percentage={(perf.avg_response_time / perf.performance_baseline) * 100}
						color="#667eea"
					/>
					<div style={improvementBadgeStyle}>
						{perf.improvement_vs_baseline || 'N/A'} Improvement
					</div>
				</div>
			</div>
		</>
	);
};

const CacheTab: React.FC<{ analytics: EnhancedAnalyticsData }> = ({ analytics }) => {
	const cache = analytics.cache;
	const perf = analytics.performance;

	if (!cache) {
		return <div style={sectionStyle}>Cache data not available</div>;
	}

	if (!cache.enabled) {
		return <div style={sectionStyle}>⚠️ Cache is not enabled</div>;
	}

	return (
		<>
			{/* Cache Stats Grid */}
			<div style={statsGridStyle}>
				<StatCard
					icon="💾"
					label="Cache Hit Rate"
					value={perf?.cache_hit_rate || cache.lifetime_hit_rate}
					color="#667eea"
				/>
				<StatCard
					icon="✅"
					label="Lifetime Hits"
					value={cache.lifetime_hits}
					color="#48bb78"
				/>
				<StatCard
					icon="❌"
					label="Lifetime Misses"
					value={cache.lifetime_misses}
					color="#f59e0b"
				/>
				<StatCard
					icon="⏰"
					label="Time Saved"
					value={cache.estimated_time_saved}
					color="#764ba2"
				/>
			</div>

			{/* Cache Details */}
			<div style={sectionStyle}>
				<h2 style={sectionTitleStyle}>📊 Cache Status</h2>
				<div style={detailsGridStyle}>
					<DetailRow label="Current Size" value={`${cache.current_size} / ${cache.max_size}`} />
					<DetailRow label="Capacity Used" value={cache.capacity_used} />
					<DetailRow label="TTL (Time to Live)" value={`${cache.ttl_minutes} minutes`} />
					<DetailRow
						label="Status"
						value="Operational"
						valueColor="#48bb78"
					/>
				</div>

				{/* Cache Capacity Bar */}
				<div style={{ marginTop: '30px' }}>
					<div style={progressLabelStyle}>
						Cache Capacity: {cache.current_size} / {cache.max_size} venues
					</div>
					<div style={progressBarBgStyle}>
						<div
							style={{
								...progressBarFillStyle,
								width: cache.capacity_used,
								background:
									parseInt(cache.capacity_used) > 80
										? '#ef4444'
										: parseInt(cache.capacity_used) > 50
											? '#f59e0b'
											: '#48bb78',
							}}
						/>
					</div>
				</div>
			</div>

			{/* Performance Impact from Cache */}
			{perf && (
				<div style={sectionStyle}>
					<h2 style={sectionTitleStyle}>⚡ Cache Performance Impact</h2>
					<div style={detailsGridStyle}>
						<DetailRow label="Cache Hits (Recent)" value={perf.cache_hits_total || 0} />
						<DetailRow label="Cache Attempts (Recent)" value={perf.cache_attempts_total || 0} />
						<DetailRow label="Time Saved (Recent)" value={perf.time_saved_by_cache || '0s'} />
					</div>
				</div>
			)}
		</>
	);
};

// ========================================
// COMPONENTS
// ========================================

const TabButton: React.FC<{
	active: boolean;
	onClick: () => void;
	label: string;
	icon: string;
}> = ({ active, onClick, label, icon }) => (
	<button onClick={onClick} style={active ? activeTabStyle : inactiveTabStyle}>
		<span style={{ marginRight: '8px' }}>{icon}</span>
		{label}
	</button>
);

const StatCard: React.FC<{
	icon: string;
	label: string;
	value: number | string;
	color: string;
	subtitle?: string;
}> = ({ icon, label, value, color, subtitle }) => (
	<div style={{ ...statCardStyle, borderTop: `4px solid ${color}` }}>
		<div style={{ fontSize: '2rem', marginBottom: '10px' }}>{icon}</div>
		<div style={{ fontSize: '2.5rem', fontWeight: 'bold', color, marginBottom: '5px' }}>
			{value}
		</div>
		<div style={{ color: '#64748b', fontSize: '0.9rem' }}>{label}</div>
		{subtitle && (
			<div style={{ color: '#48bb78', fontSize: '0.8rem', marginTop: '5px', fontWeight: '600' }}>
				{subtitle}
			</div>
		)}
	</div>
);

const ThemeCard: React.FC<{ theme: string; count: number; rank: number }> = ({
	theme,
	count,
	rank,
}) => (
	<div style={themeCardStyle}>
		<div style={rankBadgeStyle}>#{rank}</div>
		<div style={{ flex: 1 }}>
			<div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', marginBottom: '5px' }}>
				{theme}
			</div>
			<div style={{ color: '#64748b', fontSize: '0.9rem' }}>
				{count} {count === 1 ? 'adventure' : 'adventures'}
			</div>
		</div>
	</div>
);

const DetailRow: React.FC<{
	label: string;
	value: string | number;
	valueColor?: string;
}> = ({ label, value, valueColor }) => (
	<div style={detailRowStyle}>
		<span style={{ color: '#64748b' }}>{label}:</span>
		<span style={{ fontWeight: '600', color: valueColor || '#1e293b' }}>{value}</span>
	</div>
);

const ImpactBar: React.FC<{
	label: string;
	value: number;
	percentage: number;
	color: string;
}> = ({ label, value, percentage, color }) => (
	<div style={{ marginBottom: '15px' }}>
		<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
			<span style={{ color: '#64748b', fontSize: '0.9rem' }}>{label}</span>
			<span style={{ fontWeight: '600' }}>{value}s</span>
		</div>
		<div style={progressBarBgStyle}>
			<div style={{ ...progressBarFillStyle, width: `${percentage}%`, background: color }} />
		</div>
	</div>
);

const InsightsSection: React.FC<{ insights: string[] }> = ({ insights }) => (
	<div style={sectionStyle}>
		<h2 style={sectionTitleStyle}>💡 Insights</h2>
		<div style={insightsContainerStyle}>
			{insights.map((insight, index) => (
				<div key={index} style={insightItemStyle}>
					{insight}
				</div>
			))}
		</div>
	</div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
	<div style={{ textAlign: 'center', padding: '50px' }}>
		<div style={{ fontSize: '3rem', marginBottom: '20px' }}>❌</div>
		<p style={{ color: '#ef4444', fontSize: '1.1rem', marginBottom: '20px' }}>{message}</p>
		<button onClick={onRetry} style={retryButtonStyle}>
			🔄 Retry
		</button>
	</div>
);

// ========================================
// STYLES
// ========================================

const headerStyle: React.CSSProperties = {
	marginBottom: '30px',
};

const tabsContainerStyle: React.CSSProperties = {
	display: 'flex',
	gap: '10px',
	marginTop: '20px',
	borderBottom: '2px solid #e2e8f0',
	paddingBottom: '0',
};

const activeTabStyle: React.CSSProperties = {
	background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	color: 'white',
	border: 'none',
	padding: '12px 24px',
	borderRadius: '8px 8px 0 0',
	fontSize: '1rem',
	fontWeight: '600',
	cursor: 'pointer',
	transition: 'all 0.2s',
};

const inactiveTabStyle: React.CSSProperties = {
	background: 'white',
	color: '#64748b',
	border: 'none',
	padding: '12px 24px',
	borderRadius: '8px 8px 0 0',
	fontSize: '1rem',
	fontWeight: '600',
	cursor: 'pointer',
	transition: 'all 0.2s',
};

const statsGridStyle: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
	gap: '20px',
	marginBottom: '40px',
};

const statCardStyle: React.CSSProperties = {
	background: 'white',
	padding: '30px',
	borderRadius: '16px',
	textAlign: 'center',
	boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
	transition: 'transform 0.2s',
};

const sectionStyle: React.CSSProperties = {
	background: 'white',
	padding: '30px',
	borderRadius: '16px',
	boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
	marginBottom: '30px',
};

const sectionTitleStyle: React.CSSProperties = {
	fontSize: '1.5rem',
	fontWeight: 'bold',
	marginBottom: '20px',
	color: '#1e293b',
};

const themesContainerStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: '15px',
};

const themeCardStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: '15px',
	padding: '15px',
	background: '#f8fafc',
	borderRadius: '12px',
	border: '2px solid #e2e8f0',
};

const rankBadgeStyle: React.CSSProperties = {
	background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	color: 'white',
	width: '40px',
	height: '40px',
	borderRadius: '50%',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	fontWeight: 'bold',
	fontSize: '1.1rem',
};

const detailsGridStyle: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
	gap: '15px',
};

const detailRowStyle: React.CSSProperties = {
	display: 'flex',
	justifyContent: 'space-between',
	padding: '12px',
	background: '#f8fafc',
	borderRadius: '8px',
};

const impactContainerStyle: React.CSSProperties = {
	marginTop: '20px',
};

const progressBarBgStyle: React.CSSProperties = {
	background: '#e2e8f0',
	height: '24px',
	borderRadius: '12px',
	overflow: 'hidden',
};

const progressBarFillStyle: React.CSSProperties = {
	height: '100%',
	transition: 'width 0.5s ease',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'flex-end',
	paddingRight: '10px',
	color: 'white',
	fontWeight: 'bold',
	fontSize: '0.9rem',
};

const progressLabelStyle: React.CSSProperties = {
	marginBottom: '8px',
	color: '#64748b',
	fontSize: '0.9rem',
	fontWeight: '600',
};

const improvementBadgeStyle: React.CSSProperties = {
	marginTop: '20px',
	padding: '12px 24px',
	background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
	color: 'white',
	borderRadius: '8px',
	textAlign: 'center',
	fontSize: '1.1rem',
	fontWeight: 'bold',
};

const insightsContainerStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: '12px',
};

const insightItemStyle: React.CSSProperties = {
	padding: '15px',
	background: '#f0f9ff',
	border: '2px solid #bae6fd',
	borderRadius: '8px',
	color: '#0c4a6e',
	fontSize: '1rem',
};

const timestampStyle: React.CSSProperties = {
	textAlign: 'center',
	color: '#94a3b8',
	fontSize: '0.9rem',
	marginTop: '20px',
};

const retryButtonStyle: React.CSSProperties = {
	background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
	color: 'white',
	border: 'none',
	padding: '12px 30px',
	borderRadius: '8px',
	fontSize: '1rem',
	fontWeight: '600',
	cursor: 'pointer',
};

export default AnalyticsPage;