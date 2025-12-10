// presensi-frontend/src/utils/server.js

//const WORKER_DOMAIN = '192.168.101.72:8787';
//const WORKER_DOMAIN = '192.168.0.20:8787';
const WORKER_DOMAIN = 'presensi-backend.bapendabatam.workers.dev';

//export const FRONTEND_ORIGIN = `https://192.168.101.72:8788`;
//export const FRONTEND_ORIGIN = `https://192.168.0.20:8788`;
export const FRONTEND_ORIGIN = `presensi-acara-bapendabatam.pages.dev`;

export const API_URL = `https://${WORKER_DOMAIN}`;
export const WS_URL = `wss://${WORKER_DOMAIN}`;