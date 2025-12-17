// frontend/src/components/common/PasswordStrengthIndicator.tsx
/**
 * Visual password strength indicator with detailed validation feedback
 */

import React from 'react';

interface PasswordStrengthIndicatorProps {
	password: string;
	checks: {
		length: boolean;
		uppercase: boolean;
		lowercase: boolean;
		number: boolean;
		special: boolean;
	};
	strength: 'weak' | 'fair' | 'good' | 'strong';
	score: number;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
	password,
	checks,
	strength,
	score,
}) => {
	if (!password) return null;

	const strengthColors = {
		weak: '#ef4444',
		fair: '#f59e0b',
		good: '#3b82f6',
		strong: '#10b981',
	};

	const strengthLabels = {
		weak: 'Weak',
		fair: 'Fair',
		good: 'Good',
		strong: 'Strong',
	};

	const requirements = [
		{ key: 'length', label: 'At least 8 characters' },
		{ key: 'uppercase', label: 'One uppercase letter (A-Z)' },
		{ key: 'lowercase', label: 'One lowercase letter (a-z)' },
		{ key: 'number', label: 'One number (0-9)' },
		{ key: 'special', label: 'One special character (!@#$...)' },
	];

	return (
		<div style={{ marginTop: '12px', fontSize: '0.85rem' }}>
			{/* Strength Bar */}
			<div
				style={{
					display: 'flex',
					gap: '4px',
					marginBottom: '12px',
					height: '4px',
				}}
			>
				{[1, 2, 3, 4, 5].map((level) => (
					<div
						key={level}
						style={{
							flex: 1,
							background:
								level <= score
									? strengthColors[strength]
									: 'rgba(255, 255, 255, 0.1)',
							borderRadius: '2px',
							transition: 'all 0.3s ease',
						}}
					/>
				))}
			</div>

			{/* Strength Label */}
			<div
				style={{
					color: strengthColors[strength],
					fontWeight: '600',
					marginBottom: '10px',
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
				}}
			>
				<span>Password Strength: {strengthLabels[strength]}</span>
				{score >= 4 && <span>✓</span>}
			</div>

			{/* Requirements Checklist */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '6px',
					padding: '12px',
					background: 'rgba(255, 255, 255, 0.03)',
					borderRadius: '10px',
					border: '1px solid rgba(255, 255, 255, 0.05)',
				}}
			>
				{requirements.map(({ key, label }) => {
					const isValid = checks[key as keyof typeof checks];
					return (
						<div
							key={key}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								color: isValid
									? '#10b981'
									: 'rgba(255, 255, 255, 0.5)',
								transition: 'color 0.2s ease',
							}}
						>
							<span
								style={{
									fontSize: '1rem',
									fontWeight: 'bold',
								}}
							>
								{isValid ? '✓' : '○'}
							</span>
							<span>{label}</span>
						</div>
					);
				})}
			</div>

			{/* Minimum requirement notice */}
			{score < 4 && (
				<div
					style={{
						marginTop: '10px',
						padding: '8px 12px',
						background: 'rgba(245, 158, 11, 0.1)',
						border: '1px solid rgba(245, 158, 11, 0.2)',
						borderRadius: '8px',
						color: '#fbbf24',
						fontSize: '0.8rem',
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
					}}
				>
					<span>ℹ️</span>
					<span>Must meet at least 4 criteria to continue</span>
				</div>
			)}
		</div>
	);
};

export default PasswordStrengthIndicator;