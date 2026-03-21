// ============================================================
// frontend/src/components/ShareCard.tsx  (NEW)
// Generates a copyable share link for any adventure
// ============================================================
import React, { useState } from 'react';
import { useTheme, t } from '../contexts/ThemeContext';
import apiClient from '../api/client';

interface Props {
	adventure: any;
}

const ShareCard: React.FC<Props> = ({ adventure }) => {
	const { isDark } = useTheme();
	const tk = t(isDark);
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleShare = async () => {
		setLoading(true); setError(null);
		try {
			const res = await apiClient.post('/api/share', { adventure_data: adventure });
			setShareUrl(res.data.share_url);
		} catch {
			setError('Could not create share link. Try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = () => {
		if (!shareUrl) return;
		navigator.clipboard.writeText(shareUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2500);
	};

	return (
		<div style={{ marginTop: 10 }}>
			{!shareUrl ? (
				<button
					onClick={handleShare}
					disabled={loading}
					style={{
						background: loading ? (isDark ? '#374151' : '#cbd5e0') : 'linear-gradient(135deg,#667eea,#764ba2)',
						color: 'white', border: 'none', borderRadius: 8,
						padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600,
						cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
					}}
				>
					{loading ? '⏳ Creating link...' : '🔗 Share this adventure'}
				</button>
			) : (
				<div style={{
					background: isDark ? 'rgba(102,126,234,0.12)' : '#eef2ff',
					border: `1px solid ${isDark ? 'rgba(102,126,234,0.3)' : '#c7d2fe'}`,
					borderRadius: 10, padding: '10px 14px',
				}}>
					<div style={{ fontSize: '0.75rem', color: isDark ? '#a5b4fc' : '#4338ca', fontWeight: 600, marginBottom: 6 }}>
						🔗 Share link (expires in 30 days)
					</div>
					<div style={{ display: 'flex', gap: 6 }}>
						<input
							readOnly value={shareUrl}
							style={{
								flex: 1, padding: '7px 10px', borderRadius: 6,
								border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}`,
								background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
								color: tk.textPrimary, fontSize: '0.78rem',
							}}
						/>
						<button
							onClick={handleCopy}
							style={{
								padding: '7px 12px', borderRadius: 6,
								background: copied ? '#10b981' : '#667eea',
								color: 'white', border: 'none', fontSize: '0.78rem',
								fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
							}}
						>
							{copied ? '✅ Copied!' : '📋 Copy'}
						</button>
					</div>
				</div>
			)}
			{error && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 6 }}>{error}</div>}
		</div>
	);
};

export default ShareCard;