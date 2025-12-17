// frontend/src/components/NavigationBar.tsx - UPDATED WITH ABOUT LINK
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import GlassButton from './common/GlassButton';

const NavigationBar: React.FC = () => {
	const { isAuthenticated, user, logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const handleLogout = () => {
		logout();
		navigate('/');
	};

	const isActive = (path: string) => location.pathname === path;

	return (
		<nav style={navWrapperStyle}>
			<div className="glass-card" style={navCardStyle}>
				<div style={navContainerStyle}>
					{/* Logo */}
					<div
						onClick={() => navigate('/')}
						style={logoStyle}
					>
						🗺️ <span style={{ color: 'black', fontWeight: 'bold' }}>MiniQuest</span>
					</div>

					{/* Navigation Links */}
					<div style={navLinksStyle}>
						{isAuthenticated && (
							<>
								<NavLink
									icon="📍"
									label="Adventures"
									onClick={() => navigate('/app')}
									active={isActive('/app')}
								/>
								<NavLink
									icon="📊"
									label="Analytics"
									onClick={() => navigate('/analytics')}
									active={isActive('/analytics')}
								/>
								<NavLink
									icon="💾"
									label="Saved"
									onClick={() => navigate('/saved-adventures')}
									active={isActive('/saved-adventures')}
								/>
								<NavLink
									icon="ℹ️"
									label="About"
									onClick={() => navigate('/about')}
									active={isActive('/about')}
								/>
							</>
						)}
					</div>

					{/* User Section */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
						{isAuthenticated ? (
							<>
								<div style={userInfoStyle}>
									<span style={{ fontSize: '1.2rem' }}>👤</span>
									<span style={{ fontWeight: '600', color: 'black' }}>{user?.username}</span>
								</div>
								<GlassButton
									variant="secondary"
									onClick={handleLogout}
									style={logoutButtonStyle}
								>
									Logout
								</GlassButton>
							</>
						) : (
							<>
								<GlassButton
									variant="secondary"
									onClick={() => navigate('/login')}
									style={authButtonStyle}
								>
									Login
								</GlassButton>
								<GlassButton
									variant="primary"
									onClick={() => navigate('/register')}
									style={authButtonStyle}
								>
									Sign Up
								</GlassButton>
							</>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
};

// Nav Link Component
const NavLink: React.FC<{
	icon: string;
	label: string;
	onClick: () => void;
	active: boolean;
}> = ({ icon, label, onClick, active }) => (
	<GlassButton
		variant={active ? 'primary' : 'secondary'}
		onClick={onClick}
		style={navLinkStyle}
	>
		<span style={{ fontSize: '1.1rem' }}>{icon}</span>
		{label}
	</GlassButton>
);

// Styles
const navWrapperStyle: React.CSSProperties = {
	position: 'sticky',
	top: 0,
	zIndex: 100,
	padding: '15px 30px',
};

const navCardStyle: React.CSSProperties = {
	padding: '15px 30px',
	margin: 0,
};

const navContainerStyle: React.CSSProperties = {
	maxWidth: '1400px',
	margin: '0 auto',
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
};

const logoStyle: React.CSSProperties = {
	fontSize: '1.3rem',
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
	color: 'white',
	textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
	cursor: 'pointer',
};

const navLinksStyle: React.CSSProperties = {
	display: 'flex',
	gap: '8px',
};

const navLinkStyle: React.CSSProperties = {
	padding: '10px 18px',
	fontSize: '0.95rem',
	display: 'flex',
	alignItems: 'center',
	gap: '6px',
	color: 'rgba(0, 0, 0, 0.9)',
	fontWeight: '500',
};

const userInfoStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
};

const logoutButtonStyle: React.CSSProperties = {
	background: 'rgba(255, 255, 255, 0.3)',
	padding: '10px 20px',
	fontSize: '0.95rem',
	fontWeight: '600',
	color: 'black',
};

const authButtonStyle: React.CSSProperties = {
	padding: '10px 20px',
	fontSize: '0.95rem',
	fontWeight: '600',
	color: 'black',
};

export default NavigationBar;