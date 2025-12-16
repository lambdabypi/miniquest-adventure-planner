// frontend/src/components/LocationDetector.tsx
/**
 * Location detection and selection component
 */

import React from 'react';
import { LocationStatus } from '../types/api';

interface LocationDetectorProps {
	location: string;
	setLocation: (location: string) => void;
	locationStatus: LocationStatus;
	setLocationStatus: (status: LocationStatus) => void;
	detectUserLocation: () => void;
	getLocationStatusIcon: () => string;
	getLocationStatusText: () => string;
}

const LocationDetector: React.FC<LocationDetectorProps> = ({
	location,
	setLocation,
	locationStatus,
	setLocationStatus,
	detectUserLocation,
	getLocationStatusIcon,
	getLocationStatusText,
}) => {
	const bostonLocations = [
		'Downtown Boston, MA',
		'Harvard Square, Cambridge, MA',
		'Back Bay, Boston, MA',
		'North End, Boston, MA',
		'Fenway Park, Boston, MA',
		'MIT Campus, Cambridge, MA',
	];

	const otherCities = [
		'Times Square, New York, NY',
		'Union Square, San Francisco, CA',
		'Downtown Chicago, IL',
		'Pike Place Market, Seattle, WA',
	];

	return (
		<div style={{ marginBottom: '15px' }}>
			<label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
				Your Location:
			</label>

			{/* Location Input */}
			<div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
				<input
					type="text"
					value={location}
					onChange={(e) => setLocation(e.target.value)}
					placeholder="Enter your starting address: 123 Harvard St, Boston, MA"
					style={{
						flex: 1,
						padding: '12px',
						border: '1px solid #d1d5db',
						borderRadius: '6px',
						fontSize: '1rem',
					}}
				/>
				<button
					onClick={detectUserLocation}
					disabled={locationStatus === 'detecting'}
					style={{
						padding: '12px 16px',
						fontSize: '14px',
						backgroundColor: locationStatus === 'detecting' ? '#94a3b8' : '#059669',
						color: 'white',
						border: 'none',
						borderRadius: '6px',
						fontWeight: 'bold',
						cursor: locationStatus === 'detecting' ? 'not-allowed' : 'pointer',
					}}
				>
					{locationStatus === 'detecting' ? '🌍' : '📍'} Detect
				</button>
			</div>

			{/* Location Status */}
			<div style={{
				fontSize: '12px',
				color: '#64748b',
				display: 'flex',
				alignItems: 'center',
				gap: '4px',
				marginBottom: '8px',
			}}>
				<span>{getLocationStatusIcon()}</span>
				<span>{getLocationStatusText()}</span>
			</div>

			{/* Address Hints */}
			<div style={{
				fontSize: '11px',
				color: '#6b7280',
				marginBottom: '8px',
				lineHeight: '1.4',
			}}>
				💡 For better routing, try specific addresses like:
				<br />
				• "123 Newbury Street, Boston, MA"
				• "Near Fenway Park, Boston"
				• "Downtown Boston, MA"
				• "Harvard Square, Cambridge, MA"
			</div>

			{/* Quick Location Buttons */}
			{['failed', 'denied', 'timeout', 'unavailable'].includes(locationStatus) && (
				<div style={{ marginTop: '8px' }}>
					<div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
						📍 Or select a starting location:
					</div>

					{/* Boston Locations */}
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
						{bostonLocations.map((loc) => (
							<button
								key={loc}
								onClick={() => {
									setLocation(loc);
									setLocationStatus('manual');
								}}
								style={{
									padding: '4px 8px',
									backgroundColor: location === loc ? '#2563eb' : '#e0f2fe',
									color: location === loc ? 'white' : '#0e7490',
									border: '1px solid #0891b2',
									borderRadius: '12px',
									fontSize: '10px',
									cursor: 'pointer',
								}}
							>
								{loc}
							</button>
						))}
					</div>

					{/* Other Cities */}
					<div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.3' }}>
						💡 Or try other cities:
					</div>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
						{otherCities.map((city) => (
							<button
								key={city}
								onClick={() => {
									setLocation(city);
									setLocationStatus('manual');
								}}
								style={{
									padding: '4px 8px',
									backgroundColor: location === city ? '#2563eb' : '#f3f4f6',
									color: location === city ? 'white' : '#374151',
									border: '1px solid #d1d5db',
									borderRadius: '12px',
									fontSize: '10px',
									cursor: 'pointer',
								}}
							>
								{city}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default LocationDetector;