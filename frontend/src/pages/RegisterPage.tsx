// frontend/src/pages/RegisterPage.tsx - ENHANCED
/**
 * Enhanced registration page with password strength validation and improved UX
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import BackgroundOrbs from '../components/common/BackgroundOrbs';
import GlassCard from '../components/common/GlassCard';
import GlassInput from '../components/common/GlassInput';
import GlassButton from '../components/common/GlassButton';
import TechBadge from '../components/common/TechBadge';
import PasswordInput from '../components/common/PasswordInput';
import PasswordStrengthIndicator from '../components/common/PasswordStrengthIndicator';

// Password strength checker utility
const checkPasswordStrength = (password: string) => {
	const checks = {
		length: password.length >= 8,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		number: /[0-9]/.test(password),
		special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
	};

	const score = Object.values(checks).filter(Boolean).length;

	let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
	if (score >= 5) strength = 'strong';
	else if (score >= 4) strength = 'good';
	else if (score >= 3) strength = 'fair';

	return { checks, score, strength };
};

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

	// Password validation
	const passwordStrength = checkPasswordStrength(password);
	const isPasswordStrong = passwordStrength.score >= 4;
	const passwordsMatch = password && confirmPassword && password === confirmPassword;

	// Form validation
	const canSubmit =
		email &&
		username &&
		fullName &&
		password &&
		confirmPassword &&
		isPasswordStrong &&
		passwordsMatch &&
		!loading;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (!isPasswordStrong) {
			setError('Please create a stronger password (must meet at least 4 criteria)');
			return;
		}

		if (!passwordsMatch) {
			setError('Passwords do not match');
			return;
		}

		setLoading(true);

		try {
			await register(email, username, fullName, password);
			navigate('/app');
		} catch (err: any) {
			// Extract detailed error message from API response
			let errorMessage = 'Registration failed';

			if (err.response?.data?.detail) {
				errorMessage = err.response.data.detail;
			} else if (err.response?.data?.message) {
				errorMessage = err.response.data.message;
			} else if (err.message) {
				errorMessage = err.message;
			}

			// Handle specific error cases with user-friendly messages
			if (errorMessage.toLowerCase().includes('email already exists') ||
				errorMessage.toLowerCase().includes('user with this email')) {
				errorMessage = 'This email is already registered. Please use a different email or try logging in.';
			} else if (errorMessage.toLowerCase().includes('username already exists') ||
				errorMessage.toLowerCase().includes('user with this username')) {
				errorMessage = 'This username is already taken. Please choose a different username.';
			}

			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	// Sanitize username input
	const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
		setUsername(sanitized);
	};

	return (
		<div className="page-container page-container-center">
			<BackgroundOrbs />

			<GlassCard style={{ maxWidth: '500px', width: '100%' }}>
				{/* Header */}
				<div style={{ textAlign: 'center', marginBottom: '30px' }}>
					<h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
						Create Account
					</h1>
					<p className="page-subheader, text-black" style={{ marginBottom: 0 }}>
						Join MiniQuest and start planning adventures
					</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="form-section">
					<GlassInput
						type="text"
						color='black'
						placeholder="Full Name"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						required
						autoComplete="name"
					/>

					<div>
						<GlassInput
							type="text"
							placeholder="Username"
							value={username}
							onChange={handleUsernameChange}
							required
							autoComplete="username"
						/>
						{username && (
							<div
								style={{
									fontSize: '0.85rem',
									color: 'rgba(0, 0, 0, 0.6)',
									marginTop: '6px',
									marginLeft: '4px',
								}}
							>
								Only lowercase letters, numbers, and underscores allowed
							</div>
						)}
					</div>

					<GlassInput
						type="email"
						placeholder="Email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						autoComplete="email"
					/>

					<div>
						<PasswordInput
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Password"
							required
							autoComplete="new-password"
						/>
						{password && (
							<PasswordStrengthIndicator
								password={password}
								checks={passwordStrength.checks}
								strength={passwordStrength.strength}
								score={passwordStrength.score}
							/>
						)}
					</div>

					<div>
						<PasswordInput
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Confirm Password"
							required
							autoComplete="new-password"
						/>
						{confirmPassword && (
							<div
								style={{
									marginTop: '10px',
									fontSize: '0.85rem',
									display: 'flex',
									alignItems: 'center',
									gap: '6px',
									color: passwordsMatch ? '#10b981' : '#ef4444',
								}}
							>
								{passwordsMatch ? '✓' : '✗'}
								{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
							</div>
						)}
					</div>

					{error && (
						<div className="error-message" style={{
							display: 'flex',
							alignItems: 'flex-start',
							gap: '8px',
							animation: 'shake 0.5s ease'
						}}>
							<div style={{ flex: 1 }}>
								{error}
								{(error.toLowerCase().includes('email already') ||
									error.toLowerCase().includes('email is already')) && (
										<div style={{ marginTop: '8px' }}>
											<Link
												to="/login"
												style={{
													color: '#a78bfa',
													textDecoration: 'underline',
													fontSize: '0.9em'
												}}
											>
												Go to login page
											</Link>
										</div>
									)}
							</div>
						</div>
					)}

					<GlassButton type="submit" disabled={!canSubmit}>
						{loading ? '⏳ Creating Account...' : '🎉 Create Account'}
					</GlassButton>

					{/* Validation hints */}
					{!canSubmit && (password || confirmPassword) && (
						<div
							style={{
								fontSize: '0.85rem',
								color: 'rgba(0, 0, 0, 0.5)',
								textAlign: 'center',
								marginTop: '-8px',
							}}
						>
							{!isPasswordStrong && password && 'Password must be stronger'}
							{!passwordsMatch && confirmPassword && 'Passwords must match'}
						</div>
					)}
				</form>

				{/* Footer */}
				<div style={{ textAlign: 'center', marginTop: '25px' }}>
					<p className="auth-text, text-black">
						Already have an account?{' '}
						<Link to="/login" className="auth-link, text-black">
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

export default RegisterPage;