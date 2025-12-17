// frontend/src/pages/LoginPage.tsx - ENHANCED
/**
 * Enhanced login page with improved security and UX features
 */

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

	const { login } = useAuth();
	const navigate = useNavigate();

	// Check for session expiry message on mount
	useEffect(() => {
		const sessionExpired = sessionStorage.getItem('session_expired');
		if (sessionExpired) {
			setError(sessionExpired);
			sessionStorage.removeItem('session_expired');
		}

		// Check for saved email if "remember me" was used
		const savedEmail = localStorage.getItem('remembered_email');
		if (savedEmail) {
			setEmail(savedEmail);
			setRememberMe(true);
		}
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			await login(email, password);

			// Handle "remember me" functionality
			if (rememberMe) {
				localStorage.setItem('remembered_email', email);
			} else {
				localStorage.removeItem('remembered_email');
			}

			navigate('/app');
		} catch (err: any) {
			// Extract user-friendly error message
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
					<div className="hero-icon" style={{ fontSize: '3rem', marginBottom: '15px' }}>
						🗺️
					</div>
					<h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
						Welcome Back
					</h1>
					<p className="page-subheader" style={{ marginBottom: 0 }}>
						Sign in to continue your adventure planning
					</p>
				</div>

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

					{error && (
						<div
							className="error-message"
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								animation: 'shake 0.5s ease',
							}}
						>
							⚠️ {error}
						</div>
					)}

					<GlassButton type="submit" disabled={loading}>
						{loading ? '⏳ Signing In...' : '🚀 Sign In'}
					</GlassButton>
				</form>

				{/* Footer */}
				<div style={{ textAlign: 'center', marginTop: '25px' }}>
					<p className="auth-text">
						Don't have an account?{' '}
						<Link to="/register" className="auth-link">
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
						color: 'rgba(255, 255, 255, 0.7)',
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
			`}</style>
		</div>
	);
};

export default LoginPage;