// frontend/src/components/CompletionModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTheme, t } from '../contexts/ThemeContext';
import apiClient from '../api/client';

interface Props {
	adventure: any;
	savedAdventureId: string;
	onClose: () => void;
	onUpdate: (rating: number | null, notes: string) => void;
}

interface Particle {
	id: number; x: number; y: number;
	vx: number; vy: number; color: string;
	size: number; rotation: number; rotSpeed: number; opacity: number;
}

const COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#e879f9'];

const CompletionModal: React.FC<Props> = ({ adventure, savedAdventureId, onClose, onUpdate }) => {
	const { isDark } = useTheme();
	const tk = t(isDark);
	const [rating, setRating] = useState<number | null>(null);
	const [notes, setNotes] = useState('');
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const [sharing, setSharing] = useState(false);
	const [copied, setCopied] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animRef = useRef<number>();

	// ── Confetti ──────────────────────────────────────────────
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		const ctx = canvas.getContext('2d')!;

		const ps: Particle[] = Array.from({ length: 90 }, (_, i) => ({
			id: i,
			x: Math.random() * canvas.width,
			y: -20 - Math.random() * 120,
			vx: (Math.random() - 0.5) * 3.5,
			vy: 2 + Math.random() * 3,
			color: COLORS[Math.floor(Math.random() * COLORS.length)],
			size: 6 + Math.random() * 8,
			rotation: Math.random() * 360,
			rotSpeed: (Math.random() - 0.5) * 8,
			opacity: 1,
		}));

		let live = [...ps];

		const tick = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			live = live
				.map(p => ({
					...p,
					x: p.x + p.vx,
					y: p.y + p.vy,
					vy: p.vy + 0.06,
					rotation: p.rotation + p.rotSpeed,
					opacity: p.y > canvas.height * 0.65 ? p.opacity - 0.025 : p.opacity,
				}))
				.filter(p => p.opacity > 0 && p.y < canvas.height + 20);

			live.forEach(p => {
				ctx.save();
				ctx.globalAlpha = Math.max(0, p.opacity);
				ctx.translate(p.x, p.y);
				ctx.rotate((p.rotation * Math.PI) / 180);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
				ctx.restore();
			});

			if (live.length > 0) {
				animRef.current = requestAnimationFrame(tick);
			} else {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
		};

		animRef.current = requestAnimationFrame(tick);
		return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
	}, []);

	// ── Save completion ───────────────────────────────────────
	const handleSave = async () => {
		setSaving(true);
		try {
			await apiClient.patch(`/api/saved-adventures/${savedAdventureId}`, {
				completed: true,
				rating: rating ?? undefined,
				notes: notes || undefined,
			});
			onUpdate(rating, notes);
			setSaved(true);
		} catch (e) {
			console.error('Failed to mark complete', e);
		} finally {
			setSaving(false);
		}
	};

	// ── Share ─────────────────────────────────────────────────
	const handleShare = async () => {
		setSharing(true);
		try {
			const res = await apiClient.post('/api/share', { adventure_data: adventure });
			setShareUrl(res.data.share_url);
		} catch (e) {
			console.error('Share failed', e);
		} finally {
			setSharing(false);
		}
	};

	const handleCopy = () => {
		if (!shareUrl) return;
		navigator.clipboard.writeText(shareUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2500);
	};

	const border = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
	const cardBg = isDark ? '#1a1040' : 'white';

	return (
		<div style={{
			position: 'fixed', inset: 0, zIndex: 4000,
			background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
			display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
		}}>
			{/* Confetti canvas — sits above backdrop, below modal */}
			<canvas ref={canvasRef} style={{
				position: 'fixed', inset: 0, zIndex: 4001, pointerEvents: 'none',
			}} />

			<div style={{
				position: 'relative', zIndex: 4002,
				background: cardBg, borderRadius: 20, padding: 32,
				width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
				boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
				border: `1px solid ${border}`,
				animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
			}}>

				{/* Header */}
				<div style={{ textAlign: 'center', marginBottom: 28 }}>
					<div style={{ fontSize: '3.5rem', marginBottom: 12, animation: 'bounce 0.6s ease 0.2s both' }}>🎉</div>
					<h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: tk.textPrimary, marginBottom: 8 }}>
						Adventure Complete!
					</h2>
					<p style={{ fontSize: '0.9rem', color: tk.textMuted, lineHeight: 1.6 }}>
						<strong style={{ color: tk.textAccent }}>{adventure?.title}</strong>
						<br />How did it go?
					</p>
				</div>

				{/* Rating */}
				<div style={{ marginBottom: 24 }}>
					<div style={{ fontSize: '0.78rem', fontWeight: 700, color: tk.textSecondary, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
						Rate your adventure
					</div>
					<div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
						{[1, 2, 3, 4, 5].map(star => (
							<button key={star} onClick={() => setRating(star === rating ? null : star)}
								style={{
									background: 'none', border: 'none', cursor: 'pointer', padding: 4,
									fontSize: rating && rating >= star ? '2.2rem' : '1.8rem',
									filter: rating && rating >= star ? 'none' : 'grayscale(1)',
									transform: rating && rating >= star ? 'scale(1.15)' : 'scale(1)',
									transition: 'all 0.15s',
								}}
							>⭐</button>
						))}
					</div>
					{rating && (
						<div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.85rem', color: tk.textAccent, fontWeight: 600 }}>
							{['', '👎 Not for me', '😐 It was okay', '👍 Pretty good', '😊 Really enjoyed it', '🌟 Absolutely loved it'][rating]}
						</div>
					)}
				</div>

				{/* Notes */}
				<div style={{ marginBottom: 28 }}>
					<div style={{ fontSize: '0.78rem', fontWeight: 700, color: tk.textSecondary, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
						Notes (optional)
					</div>
					<textarea
						value={notes}
						onChange={e => setNotes(e.target.value)}
						placeholder="What was the highlight? Any tips for next time?"
						rows={3}
						style={{
							width: '100%', padding: '10px 12px', borderRadius: 10,
							border: `1.5px solid ${border}`, fontSize: '0.88rem',
							fontFamily: 'inherit', resize: 'vertical', outline: 'none',
							background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
							color: tk.textPrimary, boxSizing: 'border-box',
							transition: 'border-color 0.2s',
						}}
						onFocus={e => { e.currentTarget.style.borderColor = '#667eea'; }}
						onBlur={e => { e.currentTarget.style.borderColor = border; }}
					/>
				</div>

				{/* Share */}
				<div style={{
					marginBottom: 28, padding: '16px 18px', borderRadius: 12,
					background: isDark ? 'rgba(102,126,234,0.1)' : '#eef2ff',
					border: `1px solid ${isDark ? 'rgba(102,126,234,0.25)' : '#c7d2fe'}`,
				}}>
					<div style={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#a5b4fc' : '#4338ca', marginBottom: 10 }}>
						🔗 Share this adventure
					</div>
					{!shareUrl ? (
						<button
							onClick={handleShare}
							disabled={sharing}
							style={{
								width: '100%', padding: '9px 16px', borderRadius: 8,
								background: sharing ? (isDark ? '#374151' : '#cbd5e0') : 'linear-gradient(135deg,#667eea,#764ba2)',
								color: 'white', border: 'none', fontSize: '0.85rem', fontWeight: 600,
								cursor: sharing ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s',
							}}
						>
							{sharing ? '⏳ Creating link...' : '🔗 Create share link'}
						</button>
					) : (
						<div style={{ display: 'flex', gap: 6 }}>
							<input
								readOnly value={shareUrl}
								style={{
									flex: 1, padding: '8px 10px', borderRadius: 7,
									border: `1px solid ${border}`, fontSize: '0.78rem',
									background: isDark ? 'rgba(255,255,255,0.06)' : 'white',
									color: tk.textPrimary, outline: 'none',
								}}
							/>
							<button onClick={handleCopy} style={{
								padding: '8px 13px', borderRadius: 7,
								background: copied ? '#10b981' : '#667eea',
								color: 'white', border: 'none', fontSize: '0.8rem',
								fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
								transition: 'background 0.2s',
							}}>
								{copied ? '✅ Copied!' : '📋 Copy'}
							</button>
						</div>
					)}
				</div>

				{/* Actions */}
				{!saved ? (
					<div style={{ display: 'flex', gap: 10 }}>
						<button
							onClick={onClose}
							style={{
								flex: 1, padding: '12px', borderRadius: 10,
								background: isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
								color: tk.textSecondary, border: `1px solid ${border}`,
								fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
							}}
						>
							Skip
						</button>
						<button
							onClick={handleSave}
							disabled={saving}
							style={{
								flex: 2, padding: '12px', borderRadius: 10,
								background: saving ? (isDark ? '#374151' : '#cbd5e0') : 'linear-gradient(135deg,#7c3aed,#3b82f6)',
								color: 'white', border: 'none',
								fontSize: '0.9rem', fontWeight: 700,
								cursor: saving ? 'not-allowed' : 'pointer',
								boxShadow: saving ? 'none' : '0 4px 16px rgba(124,58,237,0.4)',
								transition: 'all 0.2s',
							}}
						>
							{saving ? '⏳ Saving...' : '✅ Mark Complete'}
						</button>
					</div>
				) : (
					<div style={{ textAlign: 'center' }}>
						<div style={{
							padding: '14px', borderRadius: 10, marginBottom: 12,
							background: isDark ? 'rgba(16,185,129,0.15)' : '#dcfce7',
							border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : '#86efac'}`,
							color: isDark ? '#6ee7b7' : '#15803d',
							fontSize: '0.9rem', fontWeight: 600,
						}}>
							✅ Marked complete{rating ? ` · ${'⭐'.repeat(rating)}` : ''}
						</div>
						<button onClick={onClose} style={{
							width: '100%', padding: '12px', borderRadius: 10,
							background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
							color: 'white', border: 'none', fontSize: '0.9rem',
							fontWeight: 700, cursor: 'pointer',
							boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
						}}>
							Done 🎉
						</button>
					</div>
				)}
			</div>

			<style>{`
        @keyframes popIn {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes bounce {
          0%   { transform: scale(0.3); opacity: 0; }
          50%  { transform: scale(1.25); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
		</div>
	);
};

export default CompletionModal;