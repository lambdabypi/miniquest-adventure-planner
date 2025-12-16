// frontend/src/pages/RegisterPage.tsx - REFACTORED
/**
 * Registration page with reusable components and CSS classes
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import BackgroundOrbs from '../components/common/BackgroundOrbs';
import GlassCard from '../components/common/GlassCard';
import GlassInput from '../components/common/GlassInput';
import GlassButton from '../components/common/GlassButton';
import TechBadge from '../components/common/TechBadge';

const RegisterPage: React.FC = () => {
	const [email, setEmail] = useState('');
	const [username, setUsername] = useState('');
	const [fullName, setFullName] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const { register } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		if (password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}

		setLoading(true);

		try {
			await register(email, username, fullName, password);
			navigate('/app');
		} catch (err: any) {
			setError(err.message || 'Registration failed');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="page-container page-container-center">
			<BackgroundOrbs />

			<GlassCard style={{ maxWidth: '500px', width: '100%' }}>
				{/* Header */}
				<div style={{ textAlign: 'center', marginBottom: '30px' }}>
					<div className="hero-icon" style={{ fontSize: '3rem', marginBottom: '15px' }}>
						🗺️
					</div>
					<h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
						Create Account
					</h1>
					<p className="page-subheader" style={{ marginBottom: 0 }}>
						Join MiniQuest and start planning adventures
					</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="form-section">
					<GlassInput
						type="text"
						placeholder="Full Name"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						required
					/>

					<GlassInput
						type="text"
						placeholder="Username"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>

					<GlassInput
						type="email"
						placeholder="Email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>

					<GlassInput
						type="password"
						placeholder="Password (min 8 characters)"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						minLength={8}
					/>

					<GlassInput
						type="password"
						placeholder="Confirm Password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
					/>

					{error && (
						<div className="error-message">
							❌ {error}
						</div>
					)}

					<GlassButton type="submit" disabled={loading}>
						{loading ? '⏳ Creating Account...' : '🎉 Create Account'}
					</GlassButton>
				</form>

				{/* Footer */}
				<div style={{ textAlign: 'center', marginTop: '25px' }}>
					<p className="auth-text">
						Already have an account?{' '}
						<Link to="/login" className="auth-link">
							Sign In
						</Link>
					</p>
				</div>

				{/* Features Footer */}
				<div className="auth-footer">
					<h4 className="auth-footer-title">FEATURES</h4>
					<div className="feature-tags">
						<TechBadge variant="feature">Live Research</TechBadge>
						<TechBadge variant="feature">Smart Routing</TechBadge>
						<TechBadge variant="feature">AI-Powered</TechBadge>
						<TechBadge variant="feature">Personalized</TechBadge>
					</div>
				</div>
			</GlassCard>
		</div>
	);
};

export default RegisterPage;