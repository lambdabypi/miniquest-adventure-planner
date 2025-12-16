// frontend/src/hooks/useLocationDetection.ts
/**
 * Custom hook for location detection and management
 */

import { useState, useCallback } from 'react';
import { LocationStatus, LocationData } from '../types/api';

export const useLocationDetection = (defaultLocation: string = 'Boston, MA') => {
	const [location, setLocation] = useState(defaultLocation);
	const [locationStatus, setLocationStatus] = useState<LocationStatus>('default');
	const [detectedLocation, setDetectedLocation] = useState('');

	const detectUserLocation = useCallback(async () => {
		if (!navigator.geolocation) {
			setLocationStatus('unsupported');
			return;
		}

		setLocationStatus('detecting');

		try {
			const position = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					timeout: 5000,
					enableHighAccuracy: false,
					maximumAge: 600000,
				});
			});

			const { latitude, longitude } = position.coords;
			console.log('Got coordinates:', latitude, longitude);

			// Try geocoding services
			const locationData = await tryGeocodingServices(latitude, longitude);

			if (locationData?.city && locationData?.state) {
				const detectedLocationStr = `${locationData.city}, ${locationData.state}`;
				setDetectedLocation(detectedLocationStr);
				setLocation(detectedLocationStr);
				setLocationStatus('detected');
				console.log('Location detected:', detectedLocationStr);
			} else {
				setLocationStatus('failed');
			}
		} catch (error: any) {
			handleGeolocationError(error, setLocationStatus);
		}
	}, []);

	const getLocationStatusIcon = (): string => {
		const icons: Record<LocationStatus, string> = {
			detecting: '🌍',
			detected: '✅',
			denied: '🚫',
			timeout: '⏱️',
			unavailable: '❌',
			failed: '❌',
			unsupported: '⚠️',
			manual: '✏️',
			default: '🗺️',
		};
		return icons[locationStatus];
	};

	const getLocationStatusText = (): string => {
		const texts: Record<LocationStatus, string> = {
			detecting: 'Detecting your location...',
			detected: `Detected: ${detectedLocation}`,
			denied: 'Location access denied - using manual entry',
			timeout: 'Location timeout - trying lower accuracy...',
			unavailable: 'Location unavailable - using manual entry',
			failed: 'Location detection failed - using manual entry',
			unsupported: 'Location not supported - using manual entry',
			manual: 'Using manual location',
			default: 'Using default location',
		};
		return texts[locationStatus];
	};

	return {
		location,
		setLocation,
		locationStatus,
		setLocationStatus,
		detectedLocation,
		detectUserLocation,
		getLocationStatusIcon,
		getLocationStatusText,
	};
};

// Helper functions
async function tryGeocodingServices(
	latitude: number,
	longitude: number
): Promise<LocationData | null> {
	const geocodingServices = [
		// BigDataCloud
		async (): Promise<LocationData> => {
			const response = await fetch(
				`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
			);
			if (response.ok) {
				const data = await response.json();
				return {
					city: data.city || data.locality || data.principalSubdivision,
					state: data.principalSubdivisionCode || data.principalSubdivision,
				};
			}
			throw new Error('BigDataCloud failed');
		},

		// Nominatim
		async (): Promise<LocationData> => {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
			);
			if (response.ok) {
				const data = await response.json();
				return {
					city: data.address?.city || data.address?.town || data.address?.municipality,
					state: data.address?.state,
				};
			}
			throw new Error('Nominatim failed');
		},
	];

	for (const service of geocodingServices) {
		try {
			const locationData = await service();
			if (locationData.city && locationData.state) {
				return locationData;
			}
		} catch (error) {
			console.log('Geocoding service failed:', error);
			continue;
		}
	}

	return null;
}

function handleGeolocationError(error: any, setLocationStatus: (status: LocationStatus) => void) {
	console.log('Location detection failed:', error);

	if (error.code === 1) {
		setLocationStatus('denied');
	} else if (error.code === 2) {
		setLocationStatus('unavailable');
	} else if (error.code === 3) {
		setLocationStatus('timeout');
	} else {
		setLocationStatus('failed');
	}
}