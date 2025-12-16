// frontend/src/components/common/BackgroundOrbs.tsx
/**
 * Glassmorphism background decoration orbs
 * Used across: HomePage, LoginPage, RegisterPage, HistoryPage
 */

import React from 'react';

const BackgroundOrbs: React.FC = () => (
	<>
		<div className="background-orb background-orb-top" />
		<div className="background-orb background-orb-bottom" />
	</>
);

export default BackgroundOrbs;