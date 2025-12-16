// frontend/src/utils/formatters.ts
/**
 * Formatting utility functions
 */

/**
 * Format duration in minutes to readable string
 */
export const formatDuration = (minutes: number): string => {
	if (minutes < 60) {
		return `${minutes}min`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

/**
 * Format cost to currency string
 */
export const formatCost = (cost: number): string => {
	return `$${cost.toFixed(2)}`;
};

/**
 * Truncate text to max length
 */
export const truncate = (text: string, maxLength: number): string => {
	if (text.length <= maxLength) return text;
	return `${text.substring(0, maxLength)}...`;
};

/**
 * Get confidence color
 */
export const getConfidenceColor = (confidence: number): string => {
	if (confidence > 0.6) return '#16a34a'; // green
	if (confidence > 0.4) return '#f59e0b'; // yellow
	return '#ef4444'; // red
};

/**
 * Get confidence background color
 */
export const getConfidenceBackground = (confidence: number): string => {
	if (confidence > 0.6) return '#dcfce7'; // green
	if (confidence > 0.4) return '#fef3c7'; // yellow
	return '#fee2e2'; // red
};