// frontend/src/components/common/GlassInput.tsx
/**
 * Reusable glassmorphic input with focus states
 * Used in: LoginPage, RegisterPage
 */

import React, { useState } from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

const GlassInput: React.FC<GlassInputProps> = (props) => {
	const [isFocused, setIsFocused] = useState(false);

	return (
		<input
			{...props}
			className={`glass-input ${isFocused ? 'glass-input-focused' : ''}`}
			onFocus={(e) => {
				setIsFocused(true);
				props.onFocus?.(e);
			}}
			onBlur={(e) => {
				setIsFocused(false);
				props.onBlur?.(e);
			}}
		/>
	);
};

export default GlassInput;