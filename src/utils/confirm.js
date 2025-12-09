// presensi-frontend/src/utils/confirm.js

export function confirmBox(callbackOk, title = 'Konfirmasi Aksi', message = 'Apakah Anda yakin ingin melanjutkan aksi ini?', okText = 'Ya') {
	// Pastikan hanya ada satu modal
	let existingModal = document.getElementById('confirmBox');
	if (existingModal) existingModal.remove();
	
	const modalHTML = `
		<div id="confirmBox" class="modal-overlay">
			<div class="modal-content">
				<h3 class="modal-title">${title}</h3>
				<p class="modal-message">${message}</p>
				<div class="btnWrapper">
					<button id="confirmCancelBtn" class="btn btn-secondary">Batal</button>
					<button id="confirmOkBtn" class="btn btn-primary">${okText}</button>
				</div>
			</div>
		</div>
	`;
	
	document.body.insertAdjacentHTML('beforeend', modalHTML);
	const modal = document.getElementById('confirmBox');
	
	// Setup event listeners
	const confirmOkBtn = document.getElementById('confirmOkBtn');
	const confirmCancelBtn = document.getElementById('confirmCancelBtn');
	
	// Handle tombol OK
	confirmOkBtn.addEventListener('click', () => {
		modal.remove(); // Tutup modal
		callbackOk(); // Jalankan fungsi callback
	});
	
	// Handle tombol Batal
	confirmCancelBtn.addEventListener('click', () => {
		modal.remove();
	});
	
	modal.style.display = 'flex';
};