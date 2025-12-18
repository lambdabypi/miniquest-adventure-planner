// frontend/src/pages/LoginPage.tsx - MERGED: Session Handling + Enhanced Style
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import BackgroundOrbs from '../components/common/BackgroundOrbs';
import GlassCard from '../components/common/GlassCard';
import GlassInput from '../components/common/GlassInput';
import GlassButton from '../components/common/GlassButton';
import PasswordInput from '../components/common/PasswordInput';

const LoginPage: React.FC = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);

	// ✅ Session expiration state
	const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');

	const { login, isAuthenticated } = useAuth();
	const navigate = useNavigate();

	// ✅ Check for session expiration + remember me on mount
	useEffect(() => {
		// Check for session expiration
		const expired = sessionStorage.getItem('session_expired');
		const expiredMessage = sessionStorage.getItem('session_expired_message');

		if (expired === 'true' && expiredMessage) {
			setSessionExpiredMessage(expiredMessage);

			// Clear the flags
			sessionStorage.removeItem('session_expired');
			sessionStorage.removeItem('session_expired_message');

			// Auto-clear after 10 seconds
			const timer = setTimeout(() => {
				setSessionExpiredMessage('');
			}, 10000);

			return () => clearTimeout(timer);
		}

		// Check for saved email if "remember me" was used
		const savedEmail = localStorage.getItem('remembered_email');
		if (savedEmail) {
			setEmail(savedEmail);
			setRememberMe(true);
		}
	}, []);

	// ✅ Redirect if already authenticated
	useEffect(() => {
		if (isAuthenticated) {
			navigate('/adventures');
		}
	}, [isAuthenticated, navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setSessionExpiredMessage('');
		setLoading(true);

		try {
			await login(email, password);

			// Handle "remember me" functionality
			if (rememberMe) {
				localStorage.setItem('remembered_email', email);
			} else {
				localStorage.removeItem('remembered_email');
			}

			navigate('/adventures');
		} catch (err: any) {
			console.error('Login error:', err);

			// ✅ Extract user-friendly error message
			const errorMessage =
				err.response?.data?.detail ||
				err.response?.data?.message ||
				err.message ||
				'Login failed. Please check your credentials.';

			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="page-container page-container-center">
			<BackgroundOrbs />

			<GlassCard style={{ maxWidth: '450px', width: '100%' }}>
				{/* Header */}
				<div style={{ textAlign: 'center', marginBottom: '35px' }}>
					<h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
						Welcome Back
					</h1>
					<p className="page-subheader, text-black" style={{ marginBottom: 0 }}>
						Sign in to continue your adventure planning
					</p>
				</div>

				{/* ✅ Session Expired Warning (Priority Display) */}
				{sessionExpiredMessage && (
					<div style={{
						background: 'rgba(239, 68, 68, 0.15)',
						border: '1px solid rgba(239, 68, 68, 0.3)',
						borderRadius: '12px',
						padding: '14px',
						marginBottom: '20px',
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
						animation: 'slideDown 0.3s ease-out',
					}}>
						<span style={{ fontSize: '1.3rem' }}>⏰</span>
						<div style={{ flex: 1 }}>
							<div style={{
								fontSize: '0.9rem',
								fontWeight: '600',
								color: '#0000009d',
								marginBottom: '3px',
							}}>
								Session Expired
							</div>
							<div style={{
								fontSize: '0.8rem',
								color: 'rgba(255, 255, 255, 0.7)',
							}}>
								{sessionExpiredMessage}
							</div>
						</div>
						<button
							onClick={() => setSessionExpiredMessage('')}
							style={{
								background: 'rgba(239, 68, 68, 0.2)',
								border: 'none',
								color: '#fca5a5',
								cursor: 'pointer',
								fontSize: '1.2rem',
								padding: '4px 8px',
								borderRadius: '6px',
								transition: 'all 0.2s',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
							}}
						>
							×
						</button>
					</div>
				)}

				{/* Login Error */}
				{error && !sessionExpiredMessage && (
					<div
						className="error-message"
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							marginBottom: '20px',
							animation: 'shake 0.5s ease',
						}}
					>
						{error}
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="form-section">
					<GlassInput
						type="email"
						placeholder="Email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						autoComplete="email"
					/>

					<PasswordInput
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Password"
						required
						autoComplete="current-password"
					/>

					<GlassButton type="submit" disabled={loading}>
						{loading ? '⏳ Signing In...' : '🚀 Sign In'}
					</GlassButton>
				</form>

				{/* Footer */}
				<div style={{ textAlign: 'center', marginTop: '25px' }}>
					<p className="auth-text, text-black">
						Don't have an account?{' '}
						<Link to="/register" className="auth-link, text-black">
							Sign Up
						</Link>
					</p>
				</div>

				{/* Security Notice */}
				<div
					style={{
						marginTop: '30px',
						padding: '15px',
						background: 'rgba(167, 139, 250, 0.1)',
						border: '1px solid rgba(167, 139, 250, 0.2)',
						borderRadius: '12px',
						fontSize: '0.85rem',
						color: 'rgba(0, 0, 0, 0.7)',
						textAlign: 'center',
					}}
				>
					🔒 Your connection is secure and encrypted
				</div>
			</GlassCard>

			<style>{`
				@keyframes shake {
					0%, 100% { transform: translateX(0); }
					10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
					20%, 40%, 60%, 80% { transform: translateX(5px); }
				}
				
				@keyframes slideDown {
					from {
						transform: translateY(-20px);
						opacity: 0;
					}
					to {
						transform: translateY(0);
						opacity: 1;
					}
				}
			`}</style>
		</div>
	);
};

export default LoginPage;