// frontend/src/pages/RegisterPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme, t } from '../contexts/ThemeContext';
import PasswordInput from '../components/common/PasswordInput';

const STRENGTH_COLORS: Record<string, string> = {
	weak: '#ef4444',
	fair: '#f59e0b',
	good: '#3b82f6',
	strong: '#10b981',
};

const STRENGTH_LABELS: Record<string, string> = {
	weak: 'Weak',
	fair: 'Fair',
	good: 'Good',
	strong: 'Strong 💪',
};

const checkStrength = (pw: string) => {
	const checks = {
		length: pw.length >= 8,
		upper: /[A-Z]/.test(pw),
		lower: /[a-z]/.test(pw),
		num: /[0-9]/.test(pw),
		special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
	};
	const score = Object.values(checks).filter(Boolean).length;
	const strength = score >= 5 ? 'strong' : score >= 4 ? 'good' : score >= 3 ? 'fair' : 'weak';
	return { score, strength };
};

const RegisterPage: React.FC = () => {
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [fullName, setFullName] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [scrollY, setScrollY] = useState(0);

	const { register } = useAuth();
	const { isDark } = useTheme();
	const tk = t(isDark);
	const navigate = useNavigate();

	const ps = checkStrength(password);
	const passwordsMatch = !!(password && confirmPassword && password === confirmPassword);
	const canSubmit = !!(
		email && username && fullName && password && confirmPassword &&
		ps.score >= 4 && passwordsMatch && !loading
	);

	useEffect(() => {
		const onScroll = () => setScrollY(window.scrollY);
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		if (ps.score < 4) { setError('Please create a stronger password'); return; }
		if (!passwordsMatch) { setError('Passwords do not match'); return; }
		setLoading(true);
		try {
			await register(email, username, fullName, password);
			navigate('/app');
		} catch (err: any) {
			let msg =
				err.response?.data?.detail ||
				err.response?.data?.message ||
				err.message ||
				'Registration failed';
			if (msg.toLowerCase().includes('email already')) msg = 'This email is already registered. Try logging in.';
			if (msg.toLowerCase().includes('username already')) msg = 'Username taken. Please choose another.';
			setError(msg);
		} finally {
			setLoading(false);
		}
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

	const focusInput = (e: React.FocusEvent<HTMLInputElement>) => {
		e.currentTarget.style.borderColor = '#7c3aed';
		e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)';
	};
	const blurInput = (e: React.FocusEvent<HTMLInputElement>) => {
		e.currentTarget.style.borderColor = tk.inputBorder;
		e.currentTarget.style.boxShadow = 'none';
	};

	return (
		<div style={{
			minHeight: '100vh',
			background: tk.pageBg,
			display: 'flex', alignItems: 'center', justifyContent: 'center',
			padding: '40px 20px', position: 'relative', overflow: 'hidden',
			fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		}}>
			{/* Parallax blob — top left */}
			<div style={{
				position: 'fixed', borderRadius: '50%', filter: 'blur(100px)',
				pointerEvents: 'none', zIndex: 0,
				top: '-15%', left: '-10%', width: 500, height: 500,
				background: tk.blob1,
				transform: `translateY(${scrollY * 0.1}px)`,
				transition: 'background 0.5s',
			}} />
			{/* Parallax blob — bottom right */}
			<div style={{
				position: 'fixed', borderRadius: '50%', filter: 'blur(100px)',
				pointerEvents: 'none', zIndex: 0,
				bottom: '-15%', right: '-10%', width: 550, height: 550,
				background: tk.blob2,
				transform: `translateY(${-scrollY * 0.08}px)`,
				transition: 'background 0.5s',
			}} />

			{/* Card */}
			<div style={{
				position: 'relative', zIndex: 1,
				background: tk.cardBg,
				backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
				border: `1px solid ${tk.cardBorder}`,
				borderRadius: 24, padding: '44px 40px',
				width: '100%', maxWidth: 520,
				color: tk.textPrimary,
				boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(0,0,0,0.08)',
				animation: 'slideUp 0.4s cubic-bezier(0.4,0,0.2,1)',
			}}>
				{/* Header */}
				<h1 style={{ fontSize: '1.9rem', fontWeight: 800, textAlign: 'center', marginBottom: 8, color: tk.textPrimary }}>
					Create account
				</h1>
				<p style={{ color: tk.textSecondary, textAlign: 'center', fontSize: '0.92rem', marginBottom: 28 }}>
					Join MiniQuest and start exploring
				</p>

				{/* Error banner */}
				{error && (
					<div style={{
						borderRadius: 12, padding: '12px 16px', marginBottom: 16,
						fontSize: '0.88rem', fontWeight: 500,
						display: 'flex', alignItems: 'flex-start', gap: 8,
						background: 'rgba(239,68,68,0.15)',
						border: '1px solid rgba(239,68,68,0.3)',
						color: '#fca5a5',
						animation: 'shake 0.4s ease',
					}}>
						<div style={{ flex: 1 }}>
							{error}
							{(error.toLowerCase().includes('email already') || error.toLowerCase().includes('email is already')) && (
								<div style={{ marginTop: 8 }}>
									<Link to="/login" style={{ color: tk.linkColor, textDecoration: 'underline', fontSize: '0.9em' }}>
										Go to login page →
									</Link>
								</div>
							)}
						</div>
					</div>
				)}

				<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

					{/* Full name */}
					<input
						type="text" placeholder="Full name" value={fullName}
						onChange={e => setFullName(e.target.value)}
						required autoComplete="name"
						style={inputStyle} onFocus={focusInput} onBlur={blurInput}
					/>

					{/* Username */}
					<div>
						<input
							type="text" placeholder="Username" value={username}
							onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
							required autoComplete="username"
							style={inputStyle} onFocus={focusInput} onBlur={blurInput}
						/>
						{username && (
							<div style={{ fontSize: '0.78rem', color: tk.textMuted, marginTop: 5, marginLeft: 4 }}>
								Lowercase letters, numbers, underscores only
							</div>
						)}
					</div>

					{/* Email */}
					<input
						type="email" placeholder="Email address" value={email}
						onChange={e => setEmail(e.target.value)}
						required autoComplete="email"
						style={inputStyle} onFocus={focusInput} onBlur={blurInput}
					/>

					{/* Password + strength meter */}
					<div>
						<PasswordInput
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="Password"
							required
							autoComplete="new-password"
						/>
						{password && (
							<div style={{ marginTop: 10 }}>
								<div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
									{[1, 2, 3, 4, 5].map(n => (
										<div key={n} style={{
											flex: 1, height: 4, borderRadius: 2,
											background: n <= ps.score
												? STRENGTH_COLORS[ps.strength]
												: (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
											transition: 'background 0.3s',
										}} />
									))}
								</div>
								<div style={{ fontSize: '0.78rem', color: STRENGTH_COLORS[ps.strength], fontWeight: 600 }}>
									Password strength: {STRENGTH_LABELS[ps.strength]}
								</div>
							</div>
						)}
					</div>

					{/* Confirm password */}
					<div>
						<PasswordInput
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							placeholder="Confirm password"
							required
							autoComplete="new-password"
						/>
						{confirmPassword && (
							<div style={{
								marginTop: 8, fontSize: '0.82rem', fontWeight: 600,
								color: passwordsMatch ? '#10b981' : '#ef4444',
							}}>
								{passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
							</div>
						)}
					</div>

					{/* Inline hint when submit is still blocked */}
					{!canSubmit && (password || confirmPassword) && (
						<div style={{ fontSize: '0.82rem', color: tk.textMuted, textAlign: 'center' }}>
							{ps.score < 4 && password && 'Password must be stronger · '}
							{!passwordsMatch && confirmPassword && 'Passwords must match'}
						</div>
					)}

					{/* Submit */}
					<button
						type="button"
						onClick={handleSubmit as any}
						disabled={!canSubmit}
						style={{
							background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
							color: 'white', border: 'none', borderRadius: 12,
							padding: '14px', fontSize: '1rem', fontWeight: 700,
							cursor: canSubmit ? 'pointer' : 'not-allowed',
							opacity: canSubmit ? 1 : 0.5, marginTop: 4,
							boxShadow: canSubmit ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
							transition: 'all 0.2s',
						}}
						onMouseEnter={e => { if (canSubmit) e.currentTarget.style.transform = 'translateY(-1px)'; }}
						onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
					>
						{loading ? '⏳ Creating account…' : '🎉 Create Account'}
					</button>
				</div>

				<p style={{ textAlign: 'center', marginTop: 24, color: tk.textMuted, fontSize: '0.88rem' }}>
					Already have an account?{' '}
					<Link to="/login" style={{ color: tk.linkColor, fontWeight: 600, textDecoration: 'none' }}>
						Sign in →
					</Link>
				</p>

				<div style={{ textAlign: 'center', marginTop: 18, fontSize: '0.78rem', color: tk.textMuted }}>
					Your connection is secure and encrypted
				</div>
			</div>

			<style>{`
				@keyframes slideUp {
					from { opacity: 0; transform: translateY(20px); }
					to   { opacity: 1; transform: translateY(0); }
				}
				@keyframes shake {
					0%, 100% { transform: translateX(0); }
					25%       { transform: translateX(-6px); }
					75%       { transform: translateX(6px); }
				}
			`}</style>
		</div>
	);
};

export default RegisterPage;