// presensi-frontend/src/admin/login.js

import '@fortawesome/fontawesome-free/css/all.css';
import { showStatus, cleanOnError, closeStatus } from '../utils/status.js';
import { API_URL, FRONTEND_ORIGIN } from '../utils/server.js';
import { setupHeader } from '../utils/header.js';

const params = new URLSearchParams(window.location.search);
const redirectTarget = params.get('redirect');
const defaultSuccessPath = '/admin/kelola-acara';

console.log(`[DEBUG] redirectTarget dari URL: ${redirectTarget}`);

const response = await fetch(`${API_URL}/api/auth/verify-session`, {
	method: 'GET',
	credentials: 'include',
});
	
if (response.ok) {
	showStatus('info', 'Anda sudah login. Mengalihkan ke halaman Kelola Acara');
	window.location.href = `${FRONTEND_ORIGIN}${defaultSuccessPath}`;
}

document.getElementById("formLogin").addEventListener("submit", async (e) => {
	e.preventDefault();
	
	const username = e.target.username.value.trim();
	const password = e.target.password.value;
	
	if (!username || !password) {
		showStatus('warning', 'Silakan isi username dan password.');
		return;
	}
	
	showStatus('loading', 'Sedang memverifikasi...');
	
	try {
		const payloadRedirect = redirectTarget || defaultSuccessPath;
		console.log(`[DEBUG] Payload Redirect yang Dikirim: ${payloadRedirect}`);
		
		const response = await fetch(`${API_URL}/api/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username,
				password,
				redirect: payloadRedirect
			}),
			credentials: 'include'
		});
		
		const result = await response.json();
		
		console.log('[DEBUG] Response Body (result):', result);
		
		if (response.ok) {
			showStatus('success', 'Login berhasil! Mengalihkan...');
			
			const finalRedirectPath = result.redirect || defaultSuccessPath;
			
			console.log(`[DEBUG] Final Redirect Path: ${finalRedirectPath}`);
			
			// Redirect
			setTimeout(() => {
				window.location.href = `${FRONTEND_ORIGIN}${finalRedirectPath}`;
			}, 1000);
		} else {
			showStatus('warning', result.error || 'Login gagal.');
		}
	} catch (error) {
		console.error("Error:", error);
		showStatus('warning', 'Gagal terhubung ke server.');
	}
});

setupHeader('Login Admin');