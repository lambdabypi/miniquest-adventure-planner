// frontend/src/components/common/FeatureCard.tsx
/**
 * Feature card with icon, title, and optional description
 * Used in: HomePage
 */

import React, { useState } from 'react';

interface FeatureCardProps {
	icon: string;
	title: string;
	description?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<div
			className={`feature-card ${isHovered ? 'feature-card-hover' : ''}`}
			onMouseEnter={() => setIsHovered(false)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div className="feature-card-icon">{icon}</div>
			<h4 className="feature-card-title">{title}</h4>
			{description && <p className="feature-card-description">{description}</p>}
		</div>
	);
};

export default FeatureCard;