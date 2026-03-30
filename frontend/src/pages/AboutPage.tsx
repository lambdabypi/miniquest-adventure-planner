// frontend/src/pages/AboutPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, t } from '../contexts/ThemeContext';

const AGENTS = [
	{ icon: '📍', name: 'LocationParser', desc: 'Resolves your location to coordinates and a canonical city name. Supports any US city. Defaults to your address if no location is found in the query.' },
	{ icon: '🤔', name: 'IntentParser', desc: 'Reads your request and extracts themes, activities, meal context, group size, and time-of-day - including vibe words like "chill", "party", or "date night".' },
	{ icon: '🔍', name: 'VenueScout', desc: 'Discovers venues via Google Places (primary), Tavily live discovery (fallback), or GPT-4o knowledge base (last resort). Batch-fetches websites for all results.' },
	{ icon: '🔬', name: 'TavilyResearch', desc: 'Runs up to 18 parallel live web searches - pulling current hours, prices, reviews, and standout details. Results are Redis-cached for 24 hours.' },
	{ icon: '🗺️', name: 'RoutingAgent', desc: 'Resolves street-level addresses, builds Google Maps deep links, and injects per-step transit directions. Live MBTA integration for Boston itineraries.' },
	{ icon: '✨', name: 'AdventureCreator', desc: 'Assembles 3 themed, narrative itineraries from researched and routed venues - streamed to you one by one as each finishes.' },
];

const STEPS = [
	{ n: '01', title: 'Describe your vibe', desc: 'Type anything - "rainy afternoon in Brooklyn" or just tap a vibe chip.' },
	{ n: '02', title: '6 agents go to work', desc: 'Location, intent, venues, live research, routing, and creation run in sequence.' },
	{ n: '03', title: 'Watch it happen', desc: 'A real-time progress tracker shows each agent as it completes.' },
	{ n: '04', title: 'Pick your adventure', desc: 'Choose from 3 curated itineraries, each with a map link, transit directions, and insider details.' },
];

const USECASES = [
	{ icon: '🏙️', text: 'Weekend exploration' },
	{ icon: '☕', text: 'Afternoon coffee & culture' },
	{ icon: '🎨', text: 'Museum-hopping' },
	{ icon: '🍽️', text: 'Dinner + evening plans' },
	{ icon: '💑', text: 'Date night ideas' },
	{ icon: '👥', text: 'Group days out' },
];

const STATS = [
	{ val: '6', label: 'AI Agents' },
	{ val: '~4s', label: 'Warm Cache' },
	{ val: '90%+', label: 'Cache Hit Rate' },
	{ val: 'US-wide', label: 'Coverage' },
];

const FEATURES = [
	{ icon: '🎲', title: 'Surprise Me', desc: 'One tap fires a random itinerary. No input needed.' },
	{ icon: '👥', title: 'Group Mode', desc: 'Enter up to 6 people with individual preferences. MiniQuest finds a day that works for everyone.' },
	{ icon: '💾', title: 'Save & Rate', desc: 'Save any itinerary, rate it, add notes. The more you save, the better your recommendations get.' },
	{ icon: '🔗', title: 'Share Links', desc: 'Share any adventure with a public link that stays live for 30 days.' },
	{ icon: '🌍', title: 'Community Feed', desc: 'See what other users are exploring. Post, like, and comment on adventures.' },
	{ icon: '📊', title: 'Analytics', desc: 'Track your usage, favorite themes, top locations, and cache performance.' },
];

const AboutPage: React.FC = () => {
	const navigate = useNavigate();
	const { isDark } = useTheme();
	const tk = t(isDark);
	const [scrollY, setScrollY] = useState(0);
	const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

	useEffect(() => {
		const onScroll = () => setScrollY(window.scrollY);
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => entries.forEach(e => {
				if (e.isIntersecting) setVisibleSections(prev => new Set([...prev, e.target.id]));
			}),
			{ threshold: 0.15 }
		);
		document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));
		return () => observer.disconnect();
	}, []);

	const sectionStyle = (id: string): React.CSSProperties => ({
		opacity: visibleSections.has(id) ? 1 : 0,
		transform: visibleSections.has(id) ? 'none' : 'translateY(24px)',
		transition: 'opacity 0.6s ease, transform 0.6s ease',
	});

	return (
		<div style={{
			minHeight: '100vh',
			background: tk.pageBg,
			position: 'relative', overflow: 'hidden',
			color: tk.textPrimary,
			fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		}}>
			{/* Parallax blobs */}
			<div style={{
				position: 'fixed', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0,
				top: '-10%', left: '-10%', width: 600, height: 600, background: tk.blob1,
				transform: `translateY(${scrollY * 0.12}px)`, transition: 'background 0.5s',
			}} />
			<div style={{
				position: 'fixed', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0,
				bottom: '-15%', right: '-10%', width: 650, height: 650, background: tk.blob2,
				transform: `translateY(${-scrollY * 0.08}px)`, transition: 'background 0.5s',
			}} />

			<div style={{ position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', padding: '80px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 64 }}>

				{/* Hero */}
				<div style={{ textAlign: 'center', maxWidth: 720, animation: 'fadeInUp 0.7s ease both' }}>
					<div style={{
						display: 'inline-block', background: isDark ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.1)',
						border: `1px solid ${isDark ? 'rgba(167,139,250,0.3)' : 'rgba(124,58,237,0.2)'}`,
						color: tk.textAccent, borderRadius: 999, padding: '6px 18px',
						fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 24,
					}}>About MiniQuest</div>
					<h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: 20, color: tk.textPrimary }}>
						Not recommendations.
						<span style={{ background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> Adventures.</span>
					</h1>
					<p style={{ fontSize: '1.05rem', color: tk.textSecondary, lineHeight: 1.8 }}>
						MiniQuest turns a single sentence into a complete, themed day plan - sequenced stops,
						a live-researched route, transit directions, and a budget estimate. Not a list of places.
						A full adventure, ready to walk out the door.
					</p>

					{/* Proof-point strip */}
					<div style={{
						display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 28,
					}}>
						{[
							{ icon: '⚡', text: '~4s on warm cache' },
							{ icon: '🔍', text: 'Live venue research' },
							{ icon: '🗺️', text: 'Full route + transit' },
							{ icon: '🧠', text: 'Learns from your history' },
							{ icon: '📱', text: 'Web + mobile app' },
						].map(({ icon, text }) => (
							<div key={text} style={{
								display: 'flex', alignItems: 'center', gap: 6,
								background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
								border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
								borderRadius: 999, padding: '5px 14px',
								fontSize: '0.8rem', color: tk.textSecondary, fontWeight: 500,
							}}>
								<span>{icon}</span>{text}
							</div>
						))}
					</div>
				</div>

				{/* Steps */}
				<div id="steps" data-section style={{ width: '100%', ...sectionStyle('steps') }}>
					<SectionLabel label="How It Works" color={tk.textAccent} />
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
						{STEPS.map(({ n, title, desc }, i) => (
							<div key={n} style={{
								background: tk.cardBg, border: `1px solid ${tk.cardBorder}`,
								borderRadius: 18, padding: '28px 22px', backdropFilter: 'blur(10px)',
								transition: 'all 0.25s',
								animation: `fadeInUp 0.5s ease ${i * 0.1}s both`,
							}}
								onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.borderColor = tk.textAccent; }}
								onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = tk.cardBorder; }}
							>
								<div style={{ fontSize: '2.5rem', fontWeight: 800, color: isDark ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.2)', lineHeight: 1, marginBottom: 14 }}>{n}</div>
								<div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: tk.textPrimary }}>{title}</div>
								<div style={{ fontSize: '0.83rem', color: tk.textMuted, lineHeight: 1.6 }}>{desc}</div>
							</div>
						))}
					</div>
				</div>

				{/* Agents */}
				<div id="agents" data-section style={{ width: '100%', ...sectionStyle('agents') }}>
					<SectionLabel label="The 6 AI Agents" color={tk.textAccent} />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{AGENTS.map(({ icon, name, desc }, i) => (
							<div key={name} style={{
								display: 'flex', alignItems: 'flex-start', gap: 16,
								background: tk.cardBg, border: `1px solid ${tk.cardBorder}`,
								borderRadius: 14, padding: '16px 20px', backdropFilter: 'blur(10px)',
								transition: 'all 0.2s',
								animation: `slideInLeft 0.5s ease ${i * 0.06}s both`,
							}}
								onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)'; (e.currentTarget as HTMLDivElement).style.borderColor = tk.textAccent; }}
								onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = tk.cardBorder; }}
							>
								<span style={{ fontSize: '1.6rem', flexShrink: 0, marginTop: 2 }}>{icon}</span>
								<div>
									<div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: tk.textAccent }}>{name}</div>
									<div style={{ fontSize: '0.83rem', color: tk.textMuted, lineHeight: 1.6 }}>{desc}</div>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Features */}
				<div id="features" data-section style={{ width: '100%', ...sectionStyle('features') }}>
					<SectionLabel label="Features" color={tk.textAccent} />
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
						{FEATURES.map(({ icon, title, desc }, i) => (
							<div key={title} style={{
								background: tk.cardBg, border: `1px solid ${tk.cardBorder}`,
								borderRadius: 16, padding: '20px 20px', backdropFilter: 'blur(10px)',
								transition: 'all 0.25s',
								animation: `fadeInUp 0.5s ease ${i * 0.07}s both`,
							}}
								onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.borderColor = tk.textAccent; }}
								onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = tk.cardBorder; }}
							>
								<div style={{ fontSize: '1.5rem', marginBottom: 10 }}>{icon}</div>
								<div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 6, color: tk.textPrimary }}>{title}</div>
								<div style={{ fontSize: '0.82rem', color: tk.textMuted, lineHeight: 1.6 }}>{desc}</div>
							</div>
						))}
					</div>
				</div>

				{/* Use cases */}
				<div id="usecases" data-section style={{ width: '100%', ...sectionStyle('usecases') }}>
					<SectionLabel label="Perfect For" color={tk.textAccent} />
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
						{USECASES.map(({ icon, text }, i) => (
							<div key={text} style={{
								display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
								background: tk.cardBg, border: `1px solid ${tk.cardBorder}`,
								borderRadius: 16, padding: '22px 16px', backdropFilter: 'blur(10px)',
								textAlign: 'center', transition: 'all 0.25s',
								animation: `fadeInUp 0.5s ease ${i * 0.07}s both`,
							}}
								onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.02)'; }}
								onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
							>
								<span style={{ fontSize: '1.8rem' }}>{icon}</span>
								<span style={{ fontSize: '0.85rem', fontWeight: 600, color: tk.textSecondary }}>{text}</span>
							</div>
						))}
					</div>
				</div>

				{/* Stats */}
				<div id="stats" data-section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', width: '100%', ...sectionStyle('stats') }}>
					{STATS.map(({ val, label }, i) => (
						<div key={label} style={{
							flex: '1 1 140px', textAlign: 'center',
							background: isDark ? 'rgba(167,139,250,0.1)' : 'rgba(124,58,237,0.07)',
							border: `1px solid ${isDark ? 'rgba(167,139,250,0.2)' : 'rgba(124,58,237,0.15)'}`,
							borderRadius: 16, padding: '24px 20px',
							animation: `popIn 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.1}s both`,
						}}>
							<div style={{ fontSize: '2.2rem', fontWeight: 800, color: tk.textAccent, marginBottom: 6 }}>{val}</div>
							<div style={{ fontSize: '0.82rem', color: tk.textMuted, fontWeight: 600 }}>{label}</div>
						</div>
					))}
				</div>

				{/* CTA */}
				<div id="cta" data-section style={{ textAlign: 'center', maxWidth: 500, ...sectionStyle('cta') }}>
					<div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12, color: tk.textPrimary }}>Ready to explore?</div>
					<p style={{ fontSize: '0.95rem', color: tk.textSecondary, marginBottom: 28, lineHeight: 1.6 }}>
						Any US city. Your next adventure is one sentence away.
					</p>
					<button
						onClick={() => navigate('/register')}
						style={{
							background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
							color: 'white', border: 'none', borderRadius: 14,
							padding: '15px 36px', fontSize: '1.05rem', fontWeight: 700,
							cursor: 'pointer', boxShadow: '0 4px 24px rgba(124,58,237,0.45)',
							transition: 'all 0.2s',
						}}
						onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.55)'; }}
						onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,58,237,0.45)'; }}
					>
						Get Started - Free
					</button>
				</div>

			</div>

			<style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          0% { transform: scale(0.85); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
		</div>
	);
};

const SectionLabel: React.FC<{ label: string; color: string }> = ({ label, color }) => (
	<div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color, textTransform: 'uppercase', marginBottom: 20 }}>
		{label}
	</div>
);

export default AboutPage;