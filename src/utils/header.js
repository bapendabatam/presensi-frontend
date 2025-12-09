// presensi-frontend/src/utils/header.js

export function setupHeader(namaHalaman) {
	const currentPath = window.location.pathname;
	const logo = "logo-bapenda-batam-h-100.png";
	const logoSrc = `/img/${logo}`;
	const header = document.getElementById("header");
	
	const isAdminArea = currentPath.startsWith('/admin/');
	const isAdminLoginPage = currentPath.includes('/admin/login');
	
	let menuWrapper = null;
	
	if (header) {
		// Logo
		const logoDiv = document.createElement('div');
		logoDiv.id = 'logo';
		
		const logoImg = document.createElement('img');
		logoImg.classList.add('logo');
		logoImg.src = logoSrc;
		logoDiv.appendChild(logoImg);
		
		// Judul Halaman
		const judulHalaman = document.createElement('div');
		judulHalaman.id = 'judulHalaman';
		judulHalaman.textContent = namaHalaman;

		if (isAdminArea) {
			// Menu
			menuWrapper = document.createElement('div');
			menuWrapper.id = 'menuWrapper';
			
			// Menu Kelola Acara
			if (namaHalaman !== 'Kelola Acara') {
				const menuKelolaAcara = document.createElement('a');
				menuKelolaAcara.classList.add('menuItem');
				menuKelolaAcara.href = '/admin/kelola-acara';
				menuKelolaAcara.innerHTML = '<i class="fa-solid fa-calendar"></i>Kelola Acara';
				
				menuWrapper.appendChild(menuKelolaAcara);
			}
		}
		
		header.appendChild(logoDiv);
		header.appendChild(judulHalaman);
		if (menuWrapper) header.appendChild(menuWrapper);
		
		// Tombol Logout
		if (isAdminArea && !isAdminLoginPage) {
			const btnLogout = document.createElement('button');
			btnLogout.classList.add('btn');
			btnLogout.id = 'btnLogout';
			btnLogout.type = 'button';
			btnLogout.innerHTML = '<i class="fa-solid fa-sign-out"></i>Logout';
			header.appendChild(btnLogout);
		}
	}
}