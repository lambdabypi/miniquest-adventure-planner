// frontend/src/components/NavigationBar.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme, t } from '../contexts/ThemeContext';

const OBSERVABILITY_ENABLED = (import.meta as any).env.VITE_OBSERVABILITY_ENABLED === 'true';
const ADMIN_EMAIL = (import.meta as any).env.VITE_ADMIN_EMAIL || '';

const HAMBURGER_BREAKPOINT = 1080;

function useIsNarrow() {
	const [narrow, setNarrow] = useState(window.innerWidth < HAMBURGER_BREAKPOINT);
	useEffect(() => {
		const handler = () => setNarrow(window.innerWidth < HAMBURGER_BREAKPOINT);
		window.addEventListener('resize', handler);
		return () => window.removeEventListener('resize', handler);
	}, []);
	return narrow;
}

const NavigationBar: React.FC = () => {
	const { isAuthenticated, user, token, logout } = useAuth();
	const { toggleTheme, isDark } = useTheme();
	const navigate = useNavigate();
	const location = useLocation();
	const isNarrow = useIsNarrow();
	const [hoveredLink, setHoveredLink] = useState<string | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const tk = t(isDark);

	const isAdmin = !!ADMIN_EMAIL && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

	const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };
	const isActive = (path: string) => location.pathname === path;
	const go = (path: string) => { navigate(path); setMenuOpen(false); };

	useEffect(() => { setMenuOpen(false); }, [location.pathname]);
	useEffect(() => { if (!isNarrow) setMenuOpen(false); }, [isNarrow]);

	// Depend on token (set atomically with user on login) so links
	// appear immediately on first login without waiting for a re-render.
	const NAV_LINKS = useMemo(() => token ? [
		{ path: '/app', icon: '📍', label: 'Create Adventures' },
		{ path: '/feedback', icon: '💬', label: 'Feedback' },
		{ path: '/social', icon: '🌍', label: 'Community' },
		{ path: '/saved-adventures', icon: '💾', label: 'Saved' },
		{ path: '/analytics', icon: '📊', label: 'Analytics' },
		...(OBSERVABILITY_ENABLED ? [{ path: '/observability', icon: '🔭', label: 'Observability' }] : []),
		{ path: '/about', icon: 'ℹ️', label: 'About' },
		...(isAdmin ? [{ path: '/admin/feedback', icon: '📋', label: 'Responses' }] : []),
	] : [], [token, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

	const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

	return (
		<nav style={{
			position: 'sticky', top: 0, zIndex: 100,
			padding: isNarrow ? '8px 12px' : '12px 20px',
			background: 'transparent',
		}}>
			<div style={{
				maxWidth: 1400, margin: '0 auto',
				background: isDark ? 'rgba(15,12,41,0.85)' : 'rgba(255,255,255,0.85)',
				backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
				border: `1px solid ${borderColor}`,
				borderRadius: isNarrow ? 16 : 20,
				boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.07)',
				padding: isNarrow ? '8px 16px' : '10px 24px',
				display: 'flex', justifyContent: 'space-between', alignItems: 'center',
			}}>

				{/* ── Logo ── */}
				<div
					onClick={() => go('/')}
					style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', transition: 'transform 0.2s', flexShrink: 0 }}
					onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
					onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
				>
					<span style={{
						fontFamily: '"Oswald", Bold, sans-serif',
						fontSize: isNarrow ? '1.3rem' : '1.55rem',
						fontWeight: 400, letterSpacing: '2px',
						background: 'linear-gradient(90deg, #a78bfa, #60a5fa, #34d399)',
						WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
						filter: 'drop-shadow(0 2px 8px rgba(124,58,237,0.35))',
						lineHeight: 1,
					}}>MiniQuest</span>
				</div>

				{/* ── Desktop nav links ── */}
				{!isNarrow && (
					<div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
						{NAV_LINKS.map(({ path, icon, label }) => {
							const active = isActive(path);
							const hovered = hoveredLink === path;
							return (
								<button key={path} onClick={() => go(path)}
									onMouseEnter={() => setHoveredLink(path)}
									onMouseLeave={() => setHoveredLink(null)}
									style={{
										display: 'flex', alignItems: 'center', gap: 5,
										padding: '7px 11px',
										background: active ? tk.activeNavBg : hovered ? tk.secondaryBtnBg : 'transparent',
										border: `1px solid ${active ? tk.activeNavBorder : 'transparent'}`,
										borderRadius: 10,
										color: active ? tk.activeNavText : tk.inactiveNavText,
										fontSize: '0.83rem', fontWeight: active ? 600 : 500,
										cursor: 'pointer', transition: 'all 0.2s',
										transform: hovered && !active ? 'translateY(-1px)' : 'none',
										whiteSpace: 'nowrap',
									}}
								>
									<span style={{ fontSize: '0.95rem' }}>{icon}</span>
									{label}
								</button>
							);
						})}
					</div>
				)}

				{/* ── Desktop right section ── */}
				{!isNarrow && (
					<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
						<button onClick={toggleTheme}
							title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
							style={{
								display: 'flex', alignItems: 'center', gap: 7,
								padding: '7px 14px',
								background: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(99,102,241,0.12)',
								border: `1px solid ${isDark ? 'rgba(251,191,36,0.3)' : 'rgba(99,102,241,0.3)'}`,
								borderRadius: 999, color: isDark ? '#fcd34d' : '#6366f1',
								fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s',
							}}
							onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
							onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
						>
							<span style={{ display: 'inline-block', transition: 'transform 0.4s', transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)' }}>
								{isDark ? '☀️' : '🌙'}
							</span>
							{isDark ? 'Light' : 'Dark'}
						</button>

						{isAuthenticated ? (
							<>
								<div style={{
									display: 'flex', alignItems: 'center', gap: 8,
									padding: '5px 12px 5px 5px',
									background: tk.userInfoBg, border: `1px solid ${tk.userInfoBorder}`,
									borderRadius: 999, fontSize: '0.88rem', fontWeight: 600, color: tk.textPrimary,
									whiteSpace: 'nowrap',
								}}>
									<div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}>
										{user?.username?.[0]?.toUpperCase() ?? '?'}
									</div>
									{user?.username}
								</div>
								<button onClick={handleLogout}
									style={{ background: tk.logoutBg, color: tk.logoutText, border: `1px solid ${tk.logoutBorder}`, borderRadius: 10, padding: '7px 14px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
									onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
									onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
								>Logout</button>
							</>
						) : (
							<>
								<button onClick={() => go('/login')} style={{ background: tk.secondaryBtnBg, color: tk.secondaryBtnText, border: `1px solid ${tk.secondaryBtnBorder}`, borderRadius: 10, padding: '8px 18px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Login</button>
								<button onClick={() => go('/register')} style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 12px rgba(124,58,237,0.35)', transition: 'all 0.2s' }}>Sign Up</button>
							</>
						)}
					</div>
				)}

				{/* ── Narrow: theme + hamburger ── */}
				{isNarrow && (
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
						<button onClick={toggleTheme}
							style={{
								width: 34, height: 34,
								background: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(99,102,241,0.12)',
								border: `1px solid ${isDark ? 'rgba(251,191,36,0.3)' : 'rgba(99,102,241,0.3)'}`,
								borderRadius: '50%', cursor: 'pointer',
								display: 'flex', alignItems: 'center', justifyContent: 'center',
								fontSize: '1rem', transition: 'all 0.2s',
							}}
						>{isDark ? '☀️' : '🌙'}</button>

						<button
							onClick={() => setMenuOpen(v => !v)}
							style={{
								width: 36, height: 36,
								background: menuOpen ? (isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)') : 'transparent',
								border: `1px solid ${menuOpen ? 'rgba(124,58,237,0.4)' : borderColor}`,
								borderRadius: 10, cursor: 'pointer',
								display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
								transition: 'all 0.2s', padding: 8,
							}}
							aria-label="Menu"
						>
							{[0, 1, 2].map(i => (
								<span key={i} style={{
									display: 'block', width: '100%', height: 2,
									background: tk.textPrimary, borderRadius: 2,
									transition: 'all 0.25s',
									transform: menuOpen
										? i === 0 ? 'translateY(6px) rotate(45deg)'
											: i === 2 ? 'translateY(-6px) rotate(-45deg)'
												: 'scaleX(0)'
										: 'none',
									opacity: menuOpen && i === 1 ? 0 : 1,
								}} />
							))}
						</button>
					</div>
				)}
			</div>

			{/* ── Hamburger dropdown ── */}
			{isNarrow && menuOpen && (
				<>
					<div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s ease' }} />
					<div style={{
						position: 'absolute', top: 'calc(100% + 4px)', left: 12, right: 12,
						background: isDark ? 'rgba(15,12,41,0.97)' : 'rgba(255,255,255,0.97)',
						backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
						border: `1px solid ${borderColor}`,
						borderRadius: 16, overflow: 'hidden',
						boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
						zIndex: 99, animation: 'slideDown 0.2s cubic-bezier(0.4,0,0.2,1)',
					}}>
						{isAuthenticated && (
							<div style={{ padding: '14px 16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 10 }}>
								<div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0 }}>
									{user?.username?.[0]?.toUpperCase() ?? '?'}
								</div>
								<span style={{ fontWeight: 600, color: tk.textPrimary, fontSize: '0.9rem' }}>{user?.username}</span>
							</div>
						)}

						{NAV_LINKS.map(({ path, icon, label }) => {
							const active = isActive(path);
							return (
								<button key={path} onClick={() => go(path)}
									style={{
										width: '100%', padding: '13px 16px',
										background: active ? (isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)') : 'transparent',
										border: 'none', borderBottom: `1px solid ${borderColor}`,
										display: 'flex', alignItems: 'center', gap: 12,
										color: active ? '#7c3aed' : tk.textPrimary,
										fontSize: '0.92rem', fontWeight: active ? 700 : 500,
										cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
									}}
								>
									<span style={{ fontSize: '1.1rem', width: 24, textAlign: 'center' }}>{icon}</span>
									{label}
									{active && <span style={{ marginLeft: 'auto', color: '#7c3aed', fontSize: '0.8rem' }}>●</span>}
								</button>
							);
						})}

						<div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
							{isAuthenticated ? (
								<button onClick={handleLogout}
									style={{ flex: 1, padding: '11px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}
								>Logout</button>
							) : (
								<>
									<button onClick={() => go('/login')} style={{ flex: 1, padding: '11px', background: tk.secondaryBtnBg, color: tk.secondaryBtnText, border: `1px solid ${tk.secondaryBtnBorder}`, borderRadius: 10, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>Login</button>
									<button onClick={() => go('/register')} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: 'white', border: 'none', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>Sign Up</button>
								</>
							)}
						</div>
					</div>
				</>
			)}

			<style>{`
				@keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
				@keyframes slideDown {
					from { opacity: 0; transform: translateY(-8px); }
					to   { opacity: 1; transform: translateY(0); }
				}
			`}</style>
		</nav>
	);
};

export default NavigationBar;