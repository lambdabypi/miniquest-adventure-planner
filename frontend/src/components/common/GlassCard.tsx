// frontend/src/components/common/GlassCard.tsx
/**
 * Reusable glassmorphic card container
 * Used across: HomePage, HistoryPage, and other pages
 */

import React, { ReactNode } from 'react';

interface GlassCardProps {
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', style }) => (
	<div className={`glass-card ${className}`} style={style}>
		{children}
	</div>
);

export default GlassCard;