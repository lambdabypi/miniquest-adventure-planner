// frontend/src/pages/LoginPage.tsx
/**
 * Login page with improved error handling
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import BackgroundOrbs from '../components/common/BackgroundOrbs';
import GlassCard from '../components/common/GlassCard';
import GlassInput from '../components/common/GlassInput';
import GlassButton from '../components/common/GlassButton';

const LoginPage: React.FC = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const { login } = useAuth();
	const navigate = useNavigate();

	// Check for session expiry message on mount
	useEffect(() => {
		const sessionExpired = sessionStorage.getItem('session_expired');
		if (sessionExpired) {
			setError(sessionExpired);
			sessionStorage.removeItem('session_expired');
		}
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			await login(email, password);
			navigate('/app');
		} catch (err: any) {
			// Extract user-friendly error message
			const errorMessage = err.response?.data?.detail ||
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
					/>

					<GlassInput
						type="password"
						placeholder="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>

					{error && (
						<div className="error-message">
							{error}
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
			</GlassCard>
		</div>
	);
};

export default LoginPage;