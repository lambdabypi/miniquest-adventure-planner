// frontend/src/components/common/TechBadge.tsx
/**
 * Technology/feature badge component
 * Used in: HomePage, RegisterPage
 */

import React, { ReactNode } from 'react';

interface TechBadgeProps {
	children: ReactNode;
	variant?: 'tech' | 'feature';
}

const TechBadge: React.FC<TechBadgeProps> = ({ children, variant = 'tech' }) => (
	<span className={`tech-badge tech-badge-${variant}`}>
		{children}
	</span>
);

export default TechBadge;