// presensi-frontend/src/utils/server.js

const API_URL_RAW = import.meta.env.VITE_API_URL;
const WS_URL_RAW = import.meta.env.VITE_WS_URL;
const FRONTEND_ORIGIN_RAW = import.meta.env.VITE_FRONTEND_ORIGIN;

console.log(`[DEBUG SERVER] VITE_API_URL: ${API_URL_RAW}`);
console.log(`[DEBUG SERVER] VITE_FRONTEND_ORIGIN: ${FRONTEND_ORIGIN_RAW}`);

export const API_URL = API_URL_RAW;
export const WS_URL = WS_URL_RAW;
export const FRONTEND_ORIGIN = FRONTEND_ORIGIN_RAW;