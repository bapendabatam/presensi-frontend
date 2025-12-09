// presensi-frontend/src/admin/index.js

import '@fortawesome/fontawesome-free/css/all.css';
import { showStatus, cleanOnError, closeStatus } from '../utils/status.js';
import { API_URL, WS_URL } from '../utils/server.js';
import { setupLogout } from '../utils/logout.js';
import { setupHeader } from '../utils/header.js';

if (checkAdminAuth()) {
}

async function checkAdminAuth() {
	try {
		const response = await fetch(`${API_URL}/api/auth/verify-session`, {
			method: 'GET',
			credentials: 'include',
		});
		
		if (!response.ok) {
			// Jika 401 (Cookie expired/tidak ada)
			throw new Error("Sesi tidak valid");
		}

		// Sesi valid, biarkan berjalan
		return true;	
	} catch (e) {
		showStatus('warning', 'Akses ditolak. Sesi berakhir, silakan login kembali.');
		
		const currentPath = window.location.pathname + window.location.search;
		
		window.location.href = `login?redirect=${encodeURIComponent(currentPath)}`;
		return false;
	}
}

setupHeader('Dashboard Admin');
setupLogout('btnLogout');