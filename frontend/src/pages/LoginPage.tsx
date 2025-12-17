// frontend/src/pages/LoginPage.tsx - HANDLE SESSION EXPIRATION MESSAGE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
	const { login, isAuthenticated } = useAuth();
	const navigate = useNavigate();

	// ✅ Check for session expiration on mount
	useEffect(() => {
		const expired = sessionStorage.getItem('session_expired');
		const message = sessionStorage.getItem('session_expired_message');

		if (expired === 'true' && message) {
			setSessionExpiredMessage(message);

			// Clear the flags
			sessionStorage.removeItem('session_expired');
			sessionStorage.removeItem('session_expired_message');

			// Auto-clear after 10 seconds
			const timer = setTimeout(() => {
				setSessionExpiredMessage('');
			}, 10000);

			return () => clearTimeout(timer);
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
			navigate('/adventures');
		} catch (err: any) {
			console.error('Login error:', err);

			// ✅ Extract error message from response
			const errorMessage = err.response?.data?.detail
				|| err.message
				|| 'Login failed';

			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{
			minHeight: '100vh',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			padding: '20px',
		}}>
			<div style={{
				background: 'white',
				padding: '40px',
				borderRadius: '16px',
				boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
				width: '100%',
				maxWidth: '400px',
			}}>
				<div style={{
					textAlign: 'center',
					marginBottom: '30px',
				}}>
					<h1 style={{
						fontSize: '2rem',
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						marginBottom: '10px',
					}}>
						🗺️ MiniQuest
					</h1>
					<p style={{
						color: '#64748b',
						fontSize: '0.9rem',
					}}>
						Welcome back! Log in to continue.
					</p>
				</div>

				{/* ✅ Session Expired Warning */}
				{sessionExpiredMessage && (
					<div style={{
						background: '#fef2f2',
						border: '1px solid #fecaca',
						borderRadius: '8px',
						padding: '12px',
						marginBottom: '20px',
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
					}}>
						<span style={{ fontSize: '1.2rem' }}>⏰</span>
						<div style={{ flex: 1 }}>
							<div style={{
								fontSize: '0.85rem',
								fontWeight: '600',
								color: '#dc2626',
								marginBottom: '2px',
							}}>
								Session Expired
							</div>
							<div style={{
								fontSize: '0.8rem',
								color: '#991b1b',
							}}>
								{sessionExpiredMessage}
							</div>
						</div>
						<button
							onClick={() => setSessionExpiredMessage('')}
							style={{
								background: 'none',
								border: 'none',
								color: '#dc2626',
								cursor: 'pointer',
								fontSize: '1.2rem',
								padding: '0 5px',
							}}
						>
							×
						</button>
					</div>
				)}

				{/* Login Error */}
				{error && (
					<div style={{
						background: '#fef2f2',
						border: '1px solid #fecaca',
						borderRadius: '8px',
						padding: '12px',
						marginBottom: '20px',
						color: '#dc2626',
						fontSize: '0.9rem',
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
					}}>
						<span>❌</span>
						<span>{error}</span>
					</div>
				)}

				<form onSubmit={handleSubmit} style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '20px',
				}}>
					<div>
						<label style={{
							display: 'block',
							marginBottom: '8px',
							fontSize: '0.9rem',
							fontWeight: '500',
							color: '#1e293b',
						}}>
							Email
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={loading}
							style={{
								width: '100%',
								padding: '12px',
								border: '2px solid #e2e8f0',
								borderRadius: '8px',
								fontSize: '0.95rem',
								outline: 'none',
								transition: 'border-color 0.2s',
							}}
							onFocus={(e) => {
								e.target.style.borderColor = '#667eea';
							}}
							onBlur={(e) => {
								e.target.style.borderColor = '#e2e8f0';
							}}
						/>
					</div>

					<div>
						<label style={{
							display: 'block',
							marginBottom: '8px',
							fontSize: '0.9rem',
							fontWeight: '500',
							color: '#1e293b',
						}}>
							Password
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={loading}
							style={{
								width: '100%',
								padding: '12px',
								border: '2px solid #e2e8f0',
								borderRadius: '8px',
								fontSize: '0.95rem',
								outline: 'none',
								transition: 'border-color 0.2s',
							}}
							onFocus={(e) => {
								e.target.style.borderColor = '#667eea';
							}}
							onBlur={(e) => {
								e.target.style.borderColor = '#e2e8f0';
							}}
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						style={{
							width: '100%',
							padding: '14px',
							background: loading
								? '#94a3b8'
								: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							fontSize: '1rem',
							fontWeight: '600',
							cursor: loading ? 'not-allowed' : 'pointer',
							transition: 'all 0.2s',
							boxShadow: loading
								? 'none'
								: '0 4px 12px rgba(102, 126, 234, 0.4)',
						}}
						onMouseEnter={(e) => {
							if (!loading) {
								e.currentTarget.style.transform = 'translateY(-2px)';
								e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
							}
						}}
						onMouseLeave={(e) => {
							if (!loading) {
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
							}
						}}
					>
						{loading ? (
							<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
								<span className="spinner" />
								Logging in...
							</span>
						) : (
							'Log In'
						)}
					</button>
				</form>

				<div style={{
					marginTop: '25px',
					textAlign: 'center',
					fontSize: '0.9rem',
					color: '#64748b',
				}}>
					Don't have an account?{' '}
					<a
						href="/register"
						style={{
							color: '#667eea',
							textDecoration: 'none',
							fontWeight: '600',
						}}
					>
						Sign up
					</a>
				</div>
			</div>

			<style>{`
				.spinner {
					width: 16px;
					height: 16px;
					border: 2px solid rgba(255, 255, 255, 0.3);
					border-top-color: white;
					border-radius: 50%;
					animation: spin 0.8s linear infinite;
				}
				
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
			`}</style>
		</div>
	);
};

export default LoginPage;