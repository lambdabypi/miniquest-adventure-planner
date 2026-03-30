// frontend/src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme, t } from '../contexts/ThemeContext';
import PasswordInput from '../components/common/PasswordInput';

const LoginPage: React.FC = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
	const [scrollY, setScrollY] = useState(0);

	const { login, isAuthenticated } = useAuth();
	const { isDark } = useTheme();
	const tk = t(isDark);
	const navigate = useNavigate();

	useEffect(() => {
		const onScroll = () => setScrollY(window.scrollY);
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	useEffect(() => {
		const expired = sessionStorage.getItem('session_expired');
		const msg = sessionStorage.getItem('session_expired_message');
		if (expired === 'true' && msg) {
			setSessionExpiredMessage(msg);
			sessionStorage.removeItem('session_expired');
			sessionStorage.removeItem('session_expired_message');
			const timer = setTimeout(() => setSessionExpiredMessage(''), 10000);
			return () => clearTimeout(timer);
		}
		const savedEmail = localStorage.getItem('remembered_email');
		if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }
	}, []);

	useEffect(() => { if (isAuthenticated) navigate('/adventures'); }, [isAuthenticated, navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(''); setSessionExpiredMessage(''); setLoading(true);
		try {
			await login(email, password);
			if (rememberMe) localStorage.setItem('remembered_email', email);
			else localStorage.removeItem('remembered_email');
			navigate('/adventures');
		} catch (err: any) {
			setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Login failed.');
		} finally { setLoading(false); }
	};

	const inputStyle: React.CSSProperties = {
		width: '100%', padding: '13px 16px',
		background: tk.inputBg,
		border: `1px solid ${tk.inputBorder}`,
		borderRadius: 12, fontSize: '0.95rem',
		color: tk.textPrimary, outline: 'none',
		transition: 'border-color 0.2s, box-shadow 0.2s',
		fontFamily: 'inherit', boxSizing: 'border-box',
	};

	return (
		<div style={{
			minHeight: '100vh', background: tk.pageBg,
			display: 'flex', alignItems: 'center', justifyContent: 'center',
			padding: '40px 20px', position: 'relative', overflow: 'hidden',
			fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		}}>
			{/* Parallax blobs */}
			<div style={{ position: 'fixed', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0, top: '-15%', left: '-10%', width: 500, height: 500, background: tk.blob1, transform: `translateY(${scrollY * 0.1}px)`, transition: 'background 0.5s' }} />
			<div style={{ position: 'fixed', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0, bottom: '-15%', right: '-10%', width: 550, height: 550, background: tk.blob2, transform: `translateY(${-scrollY * 0.08}px)`, transition: 'background 0.5s' }} />

			<div style={{
				position: 'relative', zIndex: 1,
				background: tk.cardBg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
				border: `1px solid ${tk.cardBorder}`, borderRadius: 24,
				padding: '44px 40px', width: '100%', maxWidth: 460,
				color: tk.textPrimary,
				boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(0,0,0,0.08)',
				animation: 'slideUp 0.4s cubic-bezier(0.4,0,0.2,1)',
			}}>
				{/* Header */}
				<h1 style={{ fontSize: '1.9rem', fontWeight: 800, textAlign: 'center', marginBottom: 8, color: tk.textPrimary }}>
					Welcome back
				</h1>
				<p style={{ color: tk.textSecondary, textAlign: 'center', fontSize: '0.92rem', marginBottom: 28 }}>
					Sign in to continue planning adventures
				</p>

				{/* Session expired */}
				{sessionExpiredMessage && (
					<div style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '0.88rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d', animation: 'slideDown 0.3s ease' }}>
						<div style={{ flex: 1 }}><strong>Session expired</strong> - {sessionExpiredMessage}</div>
						<button onClick={() => setSessionExpiredMessage('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
					</div>
				)}

				{/* Error */}
				{error && !sessionExpiredMessage && (
					<div style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '0.88rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', animation: 'shake 0.4s ease' }}>
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
					<input
						type="email" placeholder="Email address" value={email}
						onChange={e => setEmail(e.target.value)} required autoComplete="email"
						style={inputStyle}
						onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
						onBlur={e => { e.currentTarget.style.borderColor = tk.inputBorder; e.currentTarget.style.boxShadow = 'none'; }}
					/>
					<PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required autoComplete="current-password" />
					<label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
						<input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: '#7c3aed' }} />
						<span style={{ color: tk.textSecondary, fontSize: '0.85rem' }}>Remember me</span>
					</label>
					<button
						type="submit" disabled={loading}
						style={{
							background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: 'white', border: 'none',
							borderRadius: 12, padding: '14px', fontSize: '1rem', fontWeight: 700,
							cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
							marginTop: 4, boxShadow: '0 4px 20px rgba(124,58,237,0.4)', transition: 'all 0.2s',
						}}
						onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
						onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
					>
						{loading ? 'Signing in…' : 'Sign In'}
					</button>
				</form>

				<p style={{ textAlign: 'center', marginTop: 24, color: tk.textMuted, fontSize: '0.88rem' }}>
					Don't have an account?{' '}
					<Link to="/register" style={{ color: tk.linkColor, fontWeight: 600, textDecoration: 'none' }}>Create one →</Link>
				</p>
				<div style={{ textAlign: 'center', marginTop: 18, fontSize: '0.78rem', color: tk.textMuted }}>
					Your connection is secure and encrypted
				</div>
			</div>

			<style>{`
				@keyframes slideUp   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
				@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
				@keyframes shake     { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
			`}</style>
		</div>
	);
};

export default LoginPage;