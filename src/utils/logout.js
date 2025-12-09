// presensi-frontend/src/utils/logout.js

import { API_URL } from './server.js';
import { showStatus, cleanOnError, closeStatus } from './status.js';
import { confirmBox } from './confirm.js';

export async function doLogout() {	
	showStatus('loading', 'Sedang proses logout...');
	
	try {
		// Panggil API logout yg akan menghapus cookie HttpOnly
		const response = await fetch(`${API_URL}/api/auth/logout`, {
			method: 'POST',
			credentials: 'include',
		});
		
		if (response.ok || response.status === 401) {
			// Berhasil logout atau sesi sudah expired, jadi dianggap logout
			showStatus('success', 'Logout berhasil.');
			setTimeout(() => {
				window.location.href = '/admin/login';
			}, 500);
		} else {
			const errorData = await response.json();
			showStatus('warning', `Logout gagal: ${errorData.error} || 'Server error'`);
		}
	} catch (e) {
		showStatus('warning', 'Gagal terhubung ke server saat logout.');
	}
}

export function setupLogout(buttonId = 'btnLogout') {
	const logoutButton = document.getElementById('btnLogout');
	
	if (logoutButton) {
		logoutButton.addEventListener('click', (e) => {
			e.preventDefault();
			
			confirmBox(
				doLogout,
				'Konfirmasi Logout',
				'Apakah Anda yakin ingin logout?',
				'Ya, Logout'
			);
		});
	}
}