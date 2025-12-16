// frontend/src/types/api.ts
/**
 * API request/response types
 */

import { Adventure } from './adventure';

export interface AdventureRequest {
	user_input: string;
	user_address?: string;
	preferences?: Record<string, any>;
}

export interface AdventureResponse {
	success: boolean;
	adventures: Adventure[];
	metadata: Record<string, any>;
	message: string;
}

export interface SystemStatus {
	status: string;
	features: Record<string, boolean>;
	api_keys: Record<string, string>;
	coordinator_ready: boolean;
	timestamp: string;
}

export type LocationStatus =
	| 'default'
	| 'detecting'
	| 'detected'
	| 'denied'
	| 'timeout'
	| 'unavailable'
	| 'failed'
	| 'unsupported'
	| 'manual';

export interface LocationData {
	city: string;
	state: string;
}