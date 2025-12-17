// frontend/src/pages/HomePage.tsx - Updated with city info and about link
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackgroundOrbs from '../components/common/BackgroundOrbs';
import GlassCard from '../components/common/GlassCard';
import FeatureCard from '../components/common/FeatureCard';
import TechBadge from '../components/common/TechBadge';
import GlassButton from '../components/common/GlassButton';

const HomePage: React.FC = () => {
	const { isAuthenticated, user } = useAuth();
	const navigate = useNavigate();

	const handleGetStarted = () => {
		if (isAuthenticated) {
			navigate('/app');
		} else {
			navigate('/login');
		}
	};

	return (
		<div className="page-container-center">
			<BackgroundOrbs />

			<GlassCard className="glass-card-large" style={{ maxWidth: '800px', width: '100%', textAlign: 'center' }}>
				{/* Hero Section */}
				<div className="hero-icon">🗺️</div>
				<h1 className="hero-title">MiniQuest</h1>
				<p className="hero-subtitle">AI-Powered Local Adventure Planning</p>

				{/* ✅ NEW: What MiniQuest Does */}
				<div style={{
					background: 'rgba(255, 255, 255, 0.1)',
					backdropFilter: 'blur(10px)',
					border: '1px solid rgba(255, 255, 255, 0.2)',
					borderRadius: '16px',
					padding: '25px',
					marginTop: '30px',
					marginBottom: '30px',
					textAlign: 'left',
				}}>
					<h3 style={{
						color: 'white',
						fontSize: '1.1rem',
						marginBottom: '15px',
						textAlign: 'center',
						fontWeight: '600',
					}}>
						✨ Discover Local Adventures
					</h3>
					<p style={{
						color: 'rgba(255, 255, 255, 0.9)',
						fontSize: '0.95rem',
						lineHeight: '1.7',
						marginBottom: '20px',
						textAlign: 'center',
					}}>
						MiniQuest creates personalized, single-day local adventures in <strong>Boston</strong> and <strong>New York City</strong>.
						Tell us what you're interested in, and our 7 AI agents will discover the perfect mix of museums, restaurants, parks, and hidden gems—all with live research and smart routing.
					</p>

					{/* City Badges */}
					<div style={{
						display: 'flex',
						gap: '12px',
						justifyContent: 'center',
						marginBottom: '20px',
					}}>
						<div style={{
							background: 'rgba(255, 255, 255, 0.15)',
							border: '1px solid rgba(255, 255, 255, 0.3)',
							padding: '8px 16px',
							borderRadius: '20px',
							fontSize: '0.9rem',
							color: 'white',
							fontWeight: '600',
						}}>
							📍 Boston
						</div>
						<div style={{
							background: 'rgba(255, 255, 255, 0.15)',
							border: '1px solid rgba(255, 255, 255, 0.3)',
							padding: '8px 16px',
							borderRadius: '20px',
							fontSize: '0.9rem',
							color: 'white',
							fontWeight: '600',
						}}>
							📍 New York City
						</div>
					</div>

					{/* Quick Examples */}
					<div style={{
						background: 'rgba(0, 0, 0, 0.15)',
						borderRadius: '12px',
						padding: '15px',
					}}>
						<div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem', marginBottom: '10px', fontWeight: '600' }}>
							💡 Try asking:
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
							{[
								'"Museums and coffee shops in Boston"',
								'"Parks and restaurants in NYC"',
								'"Art galleries and wine bars"'
							].map((example, idx) => (
								<div key={idx} style={{
									color: 'rgba(255, 255, 255, 0.85)',
									fontSize: '0.85rem',
									padding: '6px 12px',
									background: 'rgba(255, 255, 255, 0.08)',
									borderRadius: '6px',
									fontStyle: 'italic',
								}}>
									→ {example}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* CTA Buttons */}
				<div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
					<GlassButton
						variant="secondary"
						onClick={handleGetStarted}
						style={{
							padding: '14px 32px',
							fontSize: '1.05rem',
							fontWeight: '700',
						}}
					>
						{isAuthenticated ? '🚀 Start Exploring' : '🚀 Get Started'}
					</GlassButton>

					<GlassButton
						variant="primary"
						onClick={() => navigate('/about')}
						style={{
							padding: '14px 32px',
							fontSize: '1.05rem',
							fontWeight: '700',
						}}
					>
						📖 Learn More
					</GlassButton>
				</div>

				{/* Tech Stack */}
				<div className="tech-stack">
					<div style={{
						color: 'rgba(255, 255, 255, 0.6)',
						fontSize: '0.8rem',
						marginBottom: '12px',
						fontWeight: '600',
					}}>
						Powered by:
					</div>
					<div className="tech-stack-container">
						<TechBadge>LangGraph</TechBadge>
						<TechBadge>Tavily API</TechBadge>
						<TechBadge>OpenAI GPT-4</TechBadge>
						<TechBadge>Google Maps</TechBadge>
						<TechBadge>MongoDB</TechBadge>
					</div>
				</div>
			</GlassCard>
		</div>
	);
};

export default HomePage;