
// const DEFAULT_FRONTEND_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://10.17.3.244:3000';
// const DEFAULT_BACKEND_ORIGIN = 'http://10.17.3.244:5555';


const DEFAULT_FRONTEND_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'http://10.17.3.244:3000';
const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
const ENV_BACKEND_ORIGIN = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
const DEFAULT_BACKEND_ORIGIN = ENV_BACKEND_ORIGIN || `${protocol}//${hostname}:5555`;

export const CONFIG = {

    apiUrl: `${DEFAULT_BACKEND_ORIGIN}/api/v1`,

    socketUrl: DEFAULT_BACKEND_ORIGIN,

    imageApi: `${DEFAULT_BACKEND_ORIGIN}/`,

    hashidsSalt: 'change-me',

    allowedBackends: [DEFAULT_BACKEND_ORIGIN],
} as const;

export type AppConfig = typeof CONFIG;


