// Centralized frontend configuration (no ENV). Edit values here only.

// Frontend runs at 3000; Backend runs at 5555. Configure both origins explicitly.
const DEFAULT_FRONTEND_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://10.17.3.244:3000';
const DEFAULT_BACKEND_ORIGIN = 'http://10.17.3.244:5555';

export const CONFIG = {
    // Base REST API (backend)
    apiUrl: `${DEFAULT_BACKEND_ORIGIN}/api/v1`,
    // Socket.io endpoint (backend)
    socketUrl: DEFAULT_BACKEND_ORIGIN,
    // Public images base (backend)
    imageApi: `${DEFAULT_BACKEND_ORIGIN}/uploads/images/`,
    // Hashids
    hashidsSalt: 'change-me',
    // CORS/backend allow list (used by client-only logic)
    allowedBackends: [DEFAULT_BACKEND_ORIGIN],
} as const;

export type AppConfig = typeof CONFIG;


