// frontend/src/components/common/PasswordInput.tsx
/**
 * Reusable password input component with show/hide toggle
 */

import React, { useState } from 'react';
import { useTheme, t } from '../../contexts/ThemeContext';

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
	const { isDark } = useTheme();
	const tk = t(isDark);

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
				style={{
					width: '100%',
					padding: '13px 45px 13px 16px',
					background: tk.inputBg,
					border: `1px solid ${tk.inputBorder}`,
					borderRadius: 12,
					color: tk.textPrimary,
					fontSize: '0.95rem',
					outline: 'none',
					transition: 'border-color 0.2s, box-shadow 0.2s',
					fontFamily: 'inherit',
					boxSizing: 'border-box',
				}}
				onFocus={e => {
					e.currentTarget.style.borderColor = '#7c3aed';
					e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)';
				}}
				onBlur={e => {
					e.currentTarget.style.borderColor = tk.inputBorder;
					e.currentTarget.style.boxShadow = 'none';
				}}
			/>
			<button
				type="button"
				onClick={() => setShowPassword(v => !v)}
				style={{
					position: 'absolute',
					right: 12, top: '50%',
					transform: 'translateY(-50%)',
					background: 'transparent',
					border: 'none',
					color: tk.textMuted,
					cursor: 'pointer',
					padding: 8,
					display: 'flex', alignItems: 'center', justifyContent: 'center',
					transition: 'color 0.2s',
					fontSize: '1.1rem',
					lineHeight: 1,
				}}
				onMouseOver={e => (e.currentTarget.style.color = tk.textPrimary)}
				onMouseOut={e => (e.currentTarget.style.color = tk.textMuted)}
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				{showPassword ? '🙈' : '👁️'}
			</button>
		</div>
	);
};

export default PasswordInput;