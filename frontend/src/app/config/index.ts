
// const DEFAULT_FRONTEND_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://10.17.3.244:3000';
// const DEFAULT_BACKEND_ORIGIN = 'http://10.17.3.244:5555';


const DEFAULT_FRONTEND_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://10.17.3.244:3000';
const DEFAULT_BACKEND_ORIGIN = 'http://localhost:5555';

export const CONFIG = {

    apiUrl: `${DEFAULT_BACKEND_ORIGIN}/api/v1`,

    socketUrl: DEFAULT_BACKEND_ORIGIN,

    imageApi: `${DEFAULT_BACKEND_ORIGIN}/`,

    hashidsSalt: 'change-me',

    allowedBackends: [DEFAULT_BACKEND_ORIGIN],
} as const;

export type AppConfig = typeof CONFIG;


