// frontend/src/components/AdventureForm.tsx
/**
 * Adventure generation form component
 */

import React from 'react';

interface AdventureFormProps {
	query: string;
	setQuery: (query: string) => void;
	onGenerate: () => void;
	onTest: () => void;
	loading: boolean;
}

const AdventureForm: React.FC<AdventureFormProps> = ({
	query,
	setQuery,
	onGenerate,
	onTest,
	loading,
}) => {
	return (
		<div style={{ marginBottom: '20px' }}>
			<label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
				Adventure Query:
			</label>
			<textarea
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder="Examples with smart routing AND live research:
- 'Coffee shops and parks near me' (uses your detected location + gets live info)
- 'Museums in New York' (overrides location + researches current exhibitions)
- 'Romantic restaurants in San Francisco' (cross-city routing + menu research)
- 'Art galleries with current shows' (local routing + exhibition research)"
				style={{
					width: '100%',
					padding: '12px',
					border: '1px solid #d1d5db',
					borderRadius: '6px',
					fontSize: '1rem',
					minHeight: '100px',
					resize: 'vertical',
				}}
			/>
			<div style={{
				fontSize: '12px',
				color: '#16a34a',
				marginTop: '4px',
				fontWeight: '600',
			}}>
				🔍 Get live research on hours, menus, current events, and visitor tips + smart routing!
			</div>

			<div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
				<button
					onClick={onGenerate}
					disabled={loading}
					style={{
						flex: 1,
						padding: '12px 20px',
						border: 'none',
						borderRadius: '6px',
						fontSize: '1rem',
						fontWeight: 'bold',
						color: 'white',
						backgroundColor: loading ? '#94a3b8' : '#2563eb',
						cursor: loading ? 'not-allowed' : 'pointer',
					}}
				>
					{loading ? '🔍 Researching Live Data...' : '🚀 Generate Adventures with Research'}
				</button>

				<button
					onClick={onTest}
					style={{
						padding: '12px 20px',
						border: 'none',
						borderRadius: '6px',
						fontSize: '1rem',
						fontWeight: 'bold',
						color: 'white',
						backgroundColor: '#059669',
						cursor: 'pointer',
					}}
				>
					🧪 Test
				</button>
			</div>
		</div>
	);
};

export default AdventureForm;