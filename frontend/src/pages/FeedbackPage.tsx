// frontend/src/pages/FeedbackPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, t } from '../contexts/ThemeContext';
import apiClient from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FeedbackPayload {
	overall_rating: number;
	what_worked: string;
	what_to_improve: string;
	feature_requests: string;
	free_text: string;
	would_recommend: boolean | null;
	adventure_count?: number;
}

// ── Star Rating ───────────────────────────────────────────────────────────────
const StarRating: React.FC<{
	value: number;
	onChange: (v: number) => void;
	isDark: boolean;
}> = ({ value, onChange, isDark }) => {
	const [hovered, setHovered] = useState(0);
	const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing'];
	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
			<div style={{ display: 'flex', gap: 8 }}>
				{[1, 2, 3, 4, 5].map(n => (
					<button
						key={n}
						onClick={() => onChange(n)}
						onMouseEnter={() => setHovered(n)}
						onMouseLeave={() => setHovered(0)}
						style={{
							background: 'none', border: 'none', cursor: 'pointer',
							fontSize: '2.2rem', padding: '4px',
							transform: (hovered || value) >= n ? 'scale(1.15)' : 'scale(1)',
							transition: 'transform 0.15s, filter 0.15s',
							filter: (hovered || value) >= n ? 'none' : 'grayscale(1) opacity(0.35)',
						}}
					>⭐</button>
				))}
			</div>
			{(hovered || value) > 0 && (
				<div style={{
					fontSize: '0.9rem', fontWeight: 600,
					color: isDark ? '#a78bfa' : '#7c3aed',
					animation: 'fadeIn 0.2s ease',
				}}>
					{labels[hovered || value]}
				</div>
			)}
		</div>
	);
};

// ── Animated Card ─────────────────────────────────────────────────────────────
const FadeCard: React.FC<{
	visible: boolean;
	children: React.ReactNode;
	isDark: boolean;
}> = ({ visible, children, isDark }) => (
	<div style={{
		opacity: visible ? 1 : 0,
		transform: visible ? 'translateY(0)' : 'translateY(24px)',
		transition: 'opacity 0.45s ease, transform 0.45s ease',
		pointerEvents: visible ? 'auto' : 'none',
		background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
		border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
		borderRadius: 16,
		padding: '28px 32px',
		boxShadow: isDark ? 'none' : '0 4px 24px rgba(0,0,0,0.06)',
		marginBottom: 20,
	}}>
		{children}
	</div>
);

// ── Textarea ──────────────────────────────────────────────────────────────────
const StyledTextarea: React.FC<{
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	isDark: boolean;
	rows?: number;
}> = ({ value, onChange, placeholder, isDark, rows = 3 }) => (
	<textarea
		value={value}
		onChange={e => onChange(e.target.value)}
		placeholder={placeholder}
		rows={rows}
		style={{
			width: '100%', boxSizing: 'border-box',
			padding: '12px 14px', borderRadius: 10,
			border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
			background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
			color: isDark ? '#f1f5f9' : '#1e293b',
			fontSize: '0.92rem', lineHeight: 1.5, resize: 'vertical',
			outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
		}}
		onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; }}
		onBlur={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'; }}
	/>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
const FeedbackPage: React.FC = () => {
	const { user } = useAuth();
	const { isDark } = useTheme();
	const tk = t(isDark);

	const [step, setStep] = useState(0);     // which cards are visible (0 = none, 5 = all)
	const [submitted, setSubmitted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	const [rating, setRating] = useState(0);
	const [whatWorked, setWhatWorked] = useState('');
	const [whatToImprove, setWhatToImprove] = useState('');
	const [featureRequests, setFeatureRequests] = useState('');
	const [freeText, setFreeText] = useState('');
	const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

	const bottomRef = useRef<HTMLDivElement>(null);

	// Cascade card reveals on a short delay
	useEffect(() => {
		if (step < 5) {
			const t = setTimeout(() => setStep(s => s + 1), step === 0 ? 100 : 0);
			return () => clearTimeout(t);
		}
	}, [step]);

	// Auto-scroll when a new card appears after user action
	const advanceAndScroll = () => {
		setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
	};

	const handleRatingChange = (v: number) => {
		setRating(v);
		advanceAndScroll();
	};

	const handleRecommend = (v: boolean) => {
		setWouldRecommend(v);
		advanceAndScroll();
	};

	const canSubmit = rating > 0 && wouldRecommend !== null;

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setSubmitting(true);
		setError('');
		try {
			const payload: FeedbackPayload = {
				overall_rating: rating,
				what_worked: whatWorked.trim(),
				what_to_improve: whatToImprove.trim(),
				feature_requests: featureRequests.trim(),
				free_text: freeText.trim(),
				would_recommend: wouldRecommend,
			};
			await apiClient.post('/api/feedback', payload);
			setSubmitted(true);
		} catch (e: any) {
			setError(e.response?.data?.detail || 'Something went wrong. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	// ── Submitted state ───────────────────────────────────────────────────────
	if (submitted) {
		return (
			<div style={{
				minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
				padding: '40px 20px',
				background: isDark ? 'transparent' : 'transparent',
			}}>
				<div style={{
					textAlign: 'center', maxWidth: 480,
					animation: 'fadeUp 0.5s ease',
				}}>
					<div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
					<h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: tk.textPrimary, marginBottom: 10 }}>
						Thank you, {user?.username}!
					</h2>
					<p style={{ color: tk.textSecondary, lineHeight: 1.7, fontSize: '1rem' }}>
						Your feedback helps make MiniQuest better. We read every response.
					</p>
					<a href="/app" style={{
						display: 'inline-block', marginTop: 28,
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
						color: 'white', padding: '12px 28px', borderRadius: 10,
						textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
						boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
					}}>Back to adventures →</a>
				</div>
			</div>
		);
	}

	return (
		<div style={{ minHeight: '100vh', padding: '48px 20px 80px', maxWidth: 640, margin: '0 auto' }}>
			{/* Header */}
			<div style={{ marginBottom: 36, animation: 'fadeUp 0.4s ease' }}>
				<div style={{ fontSize: '2rem', marginBottom: 8 }}>💬</div>
				<h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: tk.textPrimary, margin: 0 }}>
					Share your feedback
				</h1>
				<p style={{ color: tk.textSecondary, marginTop: 8, fontSize: '0.95rem', lineHeight: 1.6 }}>
					Takes about 2 minutes. Helps us build the right things.
				</p>
			</div>

			{/* Card 1 — Star rating */}
			<FadeCard visible={step >= 1} isDark={isDark}>
				<div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', color: isDark ? '#a78bfa' : '#7c3aed', marginBottom: 10 }}>
					OVERALL EXPERIENCE
				</div>
				<h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: tk.textPrimary, margin: '0 0 20px' }}>
					How would you rate MiniQuest overall?
				</h3>
				<StarRating value={rating} onChange={handleRatingChange} isDark={isDark} />
			</FadeCard>

			{/* Card 2 — What worked */}
			<FadeCard visible={step >= 2} isDark={isDark}>
				<div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', color: isDark ? '#34d399' : '#059669', marginBottom: 10 }}>
					HIGHLIGHTS
				</div>
				<h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: tk.textPrimary, margin: '0 0 14px' }}>
					What worked well? ✨
				</h3>
				<StyledTextarea
					value={whatWorked}
					onChange={setWhatWorked}
					placeholder="e.g. The venue suggestions were spot-on, loved the route map..."
					isDark={isDark}
				/>
			</FadeCard>

			{/* Card 3 — What to improve */}
			<FadeCard visible={step >= 3} isDark={isDark}>
				<div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', color: isDark ? '#fbbf24' : '#d97706', marginBottom: 10 }}>
					IMPROVEMENTS
				</div>
				<h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: tk.textPrimary, margin: '0 0 14px' }}>
					What could be better? 🔧
				</h3>
				<StyledTextarea
					value={whatToImprove}
					onChange={setWhatToImprove}
					placeholder="e.g. Venues were sometimes outside the neighborhood I asked for..."
					isDark={isDark}
				/>
			</FadeCard>

			{/* Card 4 — Feature requests */}
			<FadeCard visible={step >= 4} isDark={isDark}>
				<div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', color: isDark ? '#60a5fa' : '#2563eb', marginBottom: 10 }}>
					FEATURE REQUESTS
				</div>
				<h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: tk.textPrimary, margin: '0 0 14px' }}>
					Anything you wish MiniQuest could do? 🚀
				</h3>
				<StyledTextarea
					value={featureRequests}
					onChange={setFeatureRequests}
					placeholder="e.g. More cities, trip export to calendar, offline mode..."
					isDark={isDark}
				/>
			</FadeCard>

			{/* Card 5 — Recommend + free text + submit */}
			<FadeCard visible={step >= 5} isDark={isDark}>
				<div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', color: isDark ? '#f472b6' : '#db2777', marginBottom: 10 }}>
					FINAL THOUGHTS
				</div>
				<h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: tk.textPrimary, margin: '0 0 16px' }}>
					Would you recommend MiniQuest to a friend?
				</h3>
				<div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
					{[{ label: '👍 Yes', value: true }, { label: '👎 Not yet', value: false }].map(({ label, value }) => (
						<button
							key={String(value)}
							onClick={() => handleRecommend(value)}
							style={{
								flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer',
								fontWeight: 600, fontSize: '0.9rem',
								border: `2px solid ${wouldRecommend === value
									? (isDark ? '#a78bfa' : '#7c3aed')
									: (isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0')}`,
								background: wouldRecommend === value
									? (isDark ? 'rgba(167,139,250,0.15)' : '#ede9fe')
									: 'transparent',
								color: wouldRecommend === value
									? (isDark ? '#a78bfa' : '#7c3aed')
									: tk.textSecondary,
								transition: 'all 0.2s',
							}}
						>{label}</button>
					))}
				</div>

				<h3 style={{ fontSize: '1rem', fontWeight: 600, color: tk.textPrimary, margin: '0 0 12px' }}>
					Anything else you'd like to share?
				</h3>
				<StyledTextarea
					value={freeText}
					onChange={setFreeText}
					placeholder="Open thoughts, bugs, anything..."
					isDark={isDark}
					rows={3}
				/>

				{error && (
					<div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.88rem' }}>
						{error}
					</div>
				)}

				<button
					onClick={handleSubmit}
					disabled={!canSubmit || submitting}
					style={{
						width: '100%', marginTop: 20, padding: '14px',
						background: canSubmit && !submitting
							? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
							: (isDark ? '#374151' : '#cbd5e0'),
						color: canSubmit && !submitting ? 'white' : (isDark ? '#6b7280' : '#94a3b8'),
						border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 700,
						cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
						transition: 'all 0.2s',
						boxShadow: canSubmit && !submitting ? '0 4px 14px rgba(102,126,234,0.4)' : 'none',
					}}
				>
					{submitting ? '⏳ Submitting...' : '🚀 Submit Feedback'}
				</button>
				{!canSubmit && (
					<p style={{ textAlign: 'center', fontSize: '0.78rem', color: tk.textMuted, marginTop: 8 }}>
						Please rate your experience and answer the recommendation question to submit.
					</p>
				)}
			</FadeCard>

			<div ref={bottomRef} />

			<style>{`
				@keyframes fadeUp {
					from { opacity: 0; transform: translateY(20px); }
					to   { opacity: 1; transform: translateY(0); }
				}
				@keyframes fadeIn {
					from { opacity: 0; }
					to   { opacity: 1; }
				}
			`}</style>
		</div>
	);
};

export default FeedbackPage;