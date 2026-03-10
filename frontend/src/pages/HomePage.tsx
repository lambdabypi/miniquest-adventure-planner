// frontend/src/pages/HomePage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme, t } from '../contexts/ThemeContext';

const EXAMPLES = [
	'French breakfast and coffee in Boston',
	'Art galleries and wine bars in NYC',
	'Parks, bookshops and brunch in Cambridge',
	'Jazz clubs and late-night bites in Manhattan',
];

const AGENTS = [
	{ icon: '📍', label: 'Location' },
	{ icon: '🔍', label: 'Venue Scout' },
	{ icon: '🔬', label: 'Research' },
	{ icon: '🗺️', label: 'Routing' },
	{ icon: '✨', label: 'Creator' },
];

const FEATURES = [
	{ icon: '⚡', title: 'Live Research', desc: 'Tavily API fetches real-time hours, reviews, and tips for every venue.' },
	{ icon: '🧠', title: '7 AI Agents', desc: 'LangGraph coordinates intent, scouting, routing and creation in parallel.' },
	{ icon: '🗺️', title: 'Smart Routing', desc: 'Google Maps optimises your stop order to minimise travel time.' },
	{ icon: '🎯', title: 'Personalised', desc: 'RAG system learns your history to recommend adventures you\'ll love.' },
];

const HomePage: React.FC = () => {
	const { isAuthenticated } = useAuth();
	const { isDark } = useTheme();
	const tk = t(isDark);
	const navigate = useNavigate();

	const [exampleIdx, setExampleIdx] = useState(0);
	const [fade, setFade] = useState(true);
	const [scrollY, setScrollY] = useState(0);
	const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
	const heroRef = useRef<HTMLDivElement>(null);

	// Cycle examples
	useEffect(() => {
		const timer = setInterval(() => {
			setFade(false);
			setTimeout(() => { setExampleIdx(i => (i + 1) % EXAMPLES.length); setFade(true); }, 300);
		}, 3200);
		return () => clearInterval(timer);
	}, []);

	// Parallax scroll
	useEffect(() => {
		const onScroll = () => setScrollY(window.scrollY);
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	return (
		<div style={{
			minHeight: '100vh',
			background: tk.pageBg,
			position: 'relative',
			overflow: 'hidden',
			color: tk.textPrimary,
			fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		}}>
			{/* Parallax blobs */}
			<div style={{
				position: 'fixed', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0,
				top: '-15%', left: '-10%', width: 600, height: 600,
				background: tk.blob1,
				transform: `translateY(${scrollY * 0.15}px)`,
				transition: 'background 0.5s',
			}} />
			<div style={{
				position: 'fixed', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0,
				bottom: '-20%', right: '-10%', width: 700, height: 700,
				background: tk.blob2,
				transform: `translateY(${-scrollY * 0.1}px)`,
				transition: 'background 0.5s',
			}} />
			<div style={{
				position: 'fixed', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none', zIndex: 0,
				top: '40%', left: '30%', width: 400, height: 400,
				background: isDark ? 'rgba(236,72,153,0.08)' : 'rgba(236,72,153,0.05)',
				transform: `translateY(${scrollY * 0.08}px)`,
			}} />

			<div ref={heroRef} style={{
				position: 'relative', zIndex: 1,
				maxWidth: 960, margin: '0 auto',
				padding: '80px 24px 60px',
				display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56,
			}}>
				{/* ── HERO ── */}
				<div style={{ textAlign: 'center', maxWidth: 760, animation: 'fadeInUp 0.7s ease both' }}>
					<div style={{
						display: 'inline-block',
						background: isDark ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.1)',
						border: `1px solid ${isDark ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.25)'}`,
						color: tk.textAccent,
						borderRadius: 999, padding: '6px 18px',
						fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 24,
					}}>
						🗺️ AI-Powered Adventure Planning
					</div>

					<h1 style={{
						fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
						fontWeight: 800, lineHeight: 1.15, marginBottom: 20, letterSpacing: '-1px',
						color: tk.textPrimary,
					}}>
						Discover your next
						<span style={{
							background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
							WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
						}}> Mini Adventure</span>
					</h1>

					<p style={{ fontSize: '1.1rem', color: tk.textSecondary, lineHeight: 1.75, marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
						Tell MiniQuest what you're in the mood for. Seven AI agents find real venues,
						research them live, and build a perfect half-day itinerary in{' '}
						<strong style={{ color: tk.textAccent }}>Boston</strong> or{' '}
						<strong style={{ color: tk.textAccent }}>New York City</strong>.
					</p>

					{/* Animated example */}
					<div style={{
						display: 'inline-flex', alignItems: 'center', gap: 10,
						background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
						border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
						borderRadius: 12, padding: '10px 20px', marginBottom: 36, fontSize: '0.92rem',
					}}>
						<span style={{ color: tk.textAccent, fontWeight: 700, whiteSpace: 'nowrap' }}>Try:</span>
						<span style={{ color: tk.textSecondary, fontStyle: 'italic', opacity: fade ? 1 : 0, transition: 'opacity 0.3s' }}>
							"{EXAMPLES[exampleIdx]}"
						</span>
					</div>

					{/* CTAs */}
					<div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
						<button
							onClick={() => navigate(isAuthenticated ? '/app' : '/register')}
							style={{
								background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
								color: 'white', border: 'none', borderRadius: 14,
								padding: '15px 34px', fontSize: '1.05rem', fontWeight: 700,
								cursor: 'pointer', boxShadow: '0 4px 24px rgba(124,58,237,0.45)',
								transition: 'all 0.2s',
							}}
							onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.55)'; }}
							onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,58,237,0.45)'; }}
						>
							🚀 {isAuthenticated ? 'Start Exploring' : 'Get Started — Free'}
						</button>
						<button
							onClick={() => navigate('/about')}
							style={{
								background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
								color: tk.textSecondary,
								border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'}`,
								borderRadius: 14, padding: '15px 28px', fontSize: '1.05rem', fontWeight: 600,
								cursor: 'pointer', transition: 'all 0.2s',
							}}
							onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
							onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
						>
							How it works →
						</button>
					</div>
				</div>

				{/* ── CITY CARDS ── */}
				<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', width: '100%', animation: 'fadeInUp 0.7s ease 0.15s both' }}>
					{[
						{ emoji: '🏛️', city: 'Boston', desc: 'Back Bay · North End · Cambridge · Beacon Hill' },
						{ emoji: '🗽', city: 'New York City', desc: 'Manhattan · Brooklyn · SoHo · East Village' },
					].map(({ emoji, city, desc }) => (
						<div key={city} style={{
							flex: '1 1 260px',
							background: tk.cardBg,
							border: `1px solid ${tk.cardBorder}`,
							borderRadius: 18, padding: '20px 24px',
							display: 'flex', alignItems: 'center', gap: 16,
							backdropFilter: 'blur(12px)',
							transition: 'all 0.25s',
						}}
							onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(124,58,237,0.15)'; }}
							onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
						>
							<span style={{ fontSize: '2.2rem' }}>{emoji}</span>
							<div>
								<div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 4, color: tk.textPrimary }}>{city}</div>
								<div style={{ fontSize: '0.8rem', color: tk.textMuted, lineHeight: 1.5 }}>{desc}</div>
							</div>
						</div>
					))}
				</div>

				{/* ── AGENT PIPELINE ── */}
				<div style={{ width: '100%', textAlign: 'center', animation: 'fadeInUp 0.7s ease 0.25s both' }}>
					<div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: tk.textAccent, textTransform: 'uppercase', marginBottom: 18 }}>
						How it works
					</div>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
						{AGENTS.map(({ icon, label }, i) => (
							<React.Fragment key={label}>
								<div style={{
									display: 'flex', alignItems: 'center', gap: 7,
									background: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(124,58,237,0.08)',
									border: `1px solid ${isDark ? 'rgba(167,139,250,0.25)' : 'rgba(124,58,237,0.18)'}`,
									borderRadius: 999, padding: '8px 16px',
									fontSize: '0.82rem', fontWeight: 600, color: tk.textSecondary,
									transition: 'all 0.2s',
									animation: `fadeInUp 0.5s ease ${0.3 + i * 0.07}s both`,
								}}>
									<span style={{ fontSize: '1.1rem' }}>{icon}</span>
									{label}
								</div>
								{i < AGENTS.length - 1 && (
									<span style={{ color: tk.textMuted, fontSize: '1.1rem' }}>→</span>
								)}
							</React.Fragment>
						))}
					</div>
				</div>

				{/* ── FEATURE GRID ── */}
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, width: '100%' }}>
					{FEATURES.map(({ icon, title, desc }, i) => (
						<div
							key={title}
							onMouseEnter={() => setHoveredFeature(i)}
							onMouseLeave={() => setHoveredFeature(null)}
							style={{
								background: tk.cardBg,
								border: `1px solid ${hoveredFeature === i ? tk.textAccent : tk.cardBorder}`,
								borderRadius: 18, padding: '28px 22px',
								backdropFilter: 'blur(12px)',
								transition: 'all 0.25s',
								transform: hoveredFeature === i ? 'translateY(-4px)' : 'none',
								boxShadow: hoveredFeature === i ? '0 12px 32px rgba(124,58,237,0.15)' : 'none',
								animation: `fadeInUp 0.6s ease ${0.4 + i * 0.08}s both`,
								cursor: 'default',
							}}
						>
							<div style={{ fontSize: '2rem', marginBottom: 12 }}>{icon}</div>
							<div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: tk.textPrimary }}>{title}</div>
							<div style={{ fontSize: '0.83rem', color: tk.textMuted, lineHeight: 1.6 }}>{desc}</div>
						</div>
					))}
				</div>

				{/* ── TECH STACK ── */}
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeInUp 0.6s ease 0.6s both' }}>
					{['LangGraph', 'Tavily API', 'OpenAI GPT-4', 'Google Maps', 'MongoDB', 'FastAPI'].map(tech => (
						<span key={tech} style={{
							background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
							border: `1px solid ${isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.08)'}`,
							color: tk.textMuted,
							borderRadius: 999, padding: '5px 14px',
							fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.03em',
							transition: 'all 0.2s',
						}}
							onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = tk.textAccent; (e.currentTarget as HTMLSpanElement).style.borderColor = tk.textAccent; }}
							onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = tk.textMuted; (e.currentTarget as HTMLSpanElement).style.borderColor = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.08)'; }}
						>
							{tech}
						</span>
					))}
				</div>
			</div>

			<style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
		</div>
	);
};

export default HomePage;