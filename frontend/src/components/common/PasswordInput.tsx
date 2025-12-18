// frontend/src/components/common/PasswordInput.tsx
/**
 * Reusable password input component with show/hide toggle
 */

import React, { useState } from 'react';

interface PasswordInputProps {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	placeholder: string;
	required?: boolean;
	autoComplete?: string;
	minLength?: number;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
	value,
	onChange,
	placeholder,
	required = false,
	autoComplete = 'current-password',
	minLength,
}) => {
	const [showPassword, setShowPassword] = useState(false);

	return (
		<div style={{ position: 'relative' }}>
			<input
				type={showPassword ? 'text' : 'password'}
				placeholder={placeholder}
				value={value}
				onChange={onChange}
				required={required}
				autoComplete={autoComplete}
				minLength={minLength}
				className="glass-input"
				style={{
					width: '100%',
					padding: '14px 45px 14px 16px',
					background: 'rgba(255, 255, 255, 0.05)',
					border: '1px solid rgba(255, 255, 255, 0.1)',
					borderRadius: '12px',
					color: 'black',
					fontSize: '1rem',
					outline: 'none',
					transition: 'all 0.3s ease',
					backdropFilter: 'blur(10px)',
				}}
			/>
			<button
				type="button"
				onClick={() => setShowPassword(!showPassword)}
				style={{
					position: 'absolute',
					right: '12px',
					top: '50%',
					transform: 'translateY(-50%)',
					background: 'transparent',
					border: 'none',
					color: 'rgba(255, 255, 255, 0.6)',
					cursor: 'pointer',
					padding: '8px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					transition: 'color 0.2s ease',
					fontSize: '1.2rem',
				}}
				onMouseOver={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)')}
				onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')}
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				{showPassword ? '🙈' : '👁️'}
			</button>
		</div>
	);
};

export default PasswordInput;