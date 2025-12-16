// frontend/src/components/common/GlassButton.tsx
/**
 * Reusable glassmorphic button with hover effects
 * Used in: LoginPage, RegisterPage, HomePage
 */

import React, { useState } from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary';
}

const GlassButton: React.FC<GlassButtonProps> = ({
	children,
	disabled,
	variant = 'primary',
	className = '',
	...props
}) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<button
			{...props}
			disabled={disabled}
			className={`glass-button glass-button-${variant} ${isHovered ? 'glass-button-hover' : ''} ${disabled ? 'glass-button-disabled' : ''} ${className}`}
			onMouseEnter={() => !disabled && setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{children}
		</button>
	);
};

export default GlassButton;