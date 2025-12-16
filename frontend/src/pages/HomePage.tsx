// frontend/src/pages/HomePage.tsx - REFACTORED
/**
 * Landing page with reusable components and CSS classes
 */

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

			<GlassCard className="glass-card-large" style={{ maxWidth: '700px', width: '100%', textAlign: 'center' }}>
				{/* Hero Section */}
				<div className="hero-icon">🗺️</div>
				<h1 className="hero-title">MiniQuest</h1>
				<p className="hero-subtitle">AI-Powered Adventure Planning</p>

				{/* Features Grid */}
				<div className="feature-grid">
					<FeatureCard icon="🤖" title="Multi-Agent AI" />
					<FeatureCard icon="📚" title="Live Research" />
					<FeatureCard icon="🗺️" title="Smart Routes" />
					<FeatureCard icon="🧠" title="Personalized" />
				</div>

				{/* CTA Button */}
				<GlassButton
					variant="secondary"
					onClick={handleGetStarted}
					className="cta-button"
				>
					{isAuthenticated ? 'Start Your Adventure' : 'Get Started'} →
				</GlassButton>

				{/* Tech Stack */}
				<div className="tech-stack">
					<div className="tech-stack-container">
						<TechBadge>LangGraph</TechBadge>
						<TechBadge>Tavily</TechBadge>
						<TechBadge>OpenAI</TechBadge>
						<TechBadge>Google Maps</TechBadge>
					</div>
				</div>
			</GlassCard>
		</div>
	);
};

export default HomePage;