// frontend/src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL: string;
	readonly VITE_OBSERVABILITY_ENABLED: string;
	// Add other env variables here as needed
	// readonly VITE_ANOTHER_VAR: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}