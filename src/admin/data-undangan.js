// presensi-frontend/src/admin/data-undangan.js

import '@fortawesome/fontawesome-free/css/all.css';

import * as ExcelJS from 'exceljs';

import { showStatus, cleanOnError, closeStatus } from '../utils/status.js';
import { API_URL, WS_URL } from '../utils/server.js';
import { setupLogout } from '../utils/logout.js';
import { setupHeader } from '../utils/header.js';

const params = new URLSearchParams(window.location.search);
const idAcara = params.get('acara');

let masterGroupData = [];

if (checkAdminAuth()) {
	if (!idAcara || idAcara.trim() === "") {
		const err = "Parameter 'acara' tidak ditemukan atau kosong.";	
		cleanOnError(err);
	} else {
		fetchMasterSubGroups();
		
		const ws = new WebSocket(`${WS_URL}/ws/?acara=${idAcara}`);
		
		let isErrorHandled = false;
		
		ws.onopen = () => {
			console.log("WebSocket connected");
	
			// Format pesan dikirim ke WebSocket
			const payload = {
				type: "get_data_undangan",
			};
			
			ws.send(JSON.stringify(payload));
		};
	
		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			
			if (data.type == "acara_tidak_ditemukan") {
				const err = "Acara tidak ditemukan.";
				cleanOnError(err);
				
				isErrorHandled = true;
				
				return;
			} else if (data.type === "initial_stats") {
				console.log("INITIAL STATS DITERIMA");
				
				const acaraDetails = data.acara;
				
				document.getElementById("namaAcara").style.display = "block";
				document.getElementById("detailWrapper").style.display = "grid";
				document.getElementById("wrapper").style.display = "flex";
				
				document.getElementById("namaAcara").innerHTML = acaraDetails.nama_acara;
				document.getElementById("lokasi").innerHTML = acaraDetails.lokasi;
				document.getElementById("tanggal").innerHTML = acaraDetails.tanggal;
				document.getElementById("jam").innerHTML = acaraDetails.jam;
			} else if (data.type === "data_undangan") {
				console.log("Menerima Data Undangan:", data);
				
				const dataUndangan = data.results;
				
				if (!dataUndangan || dataUndangan.length === 0) {
					showStatus('warning', 'Tidak ada data undangan yang ditemukan.');
					return;
				}
				
				const tabelContainer = document.getElementById("tabelDataUndangan");
				
				while (tabelContainer.children.length > 1) {
					// Hapus semua kecuali header
					tabelContainer.removeChild(tabelContainer.lastChild);
				}
				
				dataUndangan.reverse().forEach((item, index) => {
					const newRow = document.createElement('div');
					newRow.className = 'flex-row';
					
					newRow.innerHTML = `
						<div class="flex-cell col-no" data-label="No"></div>
						<div class="flex-cell" data-label="Organisasi">${item.nama_subgroup}</div>
						<div class="flex-cell" data-label="Kelompok">${item.nama_group}</div>
						<div class="flex-cell" data-label="Aksi"><i class="fa-solid fa-trash iconAksi"></i></div>
					`;
					
					tabelContainer.appendChild(newRow);
				});
				renumberTableRows(tabelContainer);
			} else if (data.type === "realtime_update_undangan") {
				if (data.new_entry) {
					const item = data.new_entry;
					const tabelContainer = document.getElementById("tabelDataUndangan");
					
					const newRow = document.createElement('div');
					newRow.className = 'flex-row kedip';
					
					newRow.innerHTML = `
						<div class="flex-cell col-no" data-label="No"></div>
						<div class="flex-cell" data-label="Organisasi">${item.nama_subgroup}</div>
						<div class="flex-cell" data-label="Kelompok">${item.nama_group}</div>
						<div class="flex-cell" data-label="Aksi"><i class="fa-solid fa-trash iconAksi"></i></div>
					`;
					
					tabelContainer.insertBefore(newRow, tabelContainer.children[1]);
					
					console.log("CLIENT LOG: Menerima Realtime Update Data Undangan");
					
					renumberTableRows(tabelContainer);
					
					setTimeout(() => {
						newRow.classList.remove('kedip');
					}, 3000);
				}
			}
		};
	
		ws.onclose = () => {
			console.log("WebSocket closed");
			
			if (isErrorHandled) {
				return;
			}
		};
	}
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

function renumberTableRows(container) {
	for (let i = 1; i < container.children.length; i++) {
		const row = container.children[i];
		
		const noCell = row.querySelector('.col-no');
		if (noCell) {
			noCell.textContent = i;
		}
	}
}

function setupTambahUndangan() {
	const tambahUndanganBtn = document.getElementById('btnTambahUndangan');
	const wrapperTambahUndangan = document.getElementById("wrapperTambahUndangan");
	
	if (tambahUndanganBtn && wrapperTambahUndangan) {
		tambahUndanganBtn.addEventListener('click', () => {
			wrapperTambahUndangan.classList.add("flexShow");
		});
	}
}

function setupSubmitTambahUndangan() {
	document.getElementById("formTambahUndangan").addEventListener("submit", async (e) => {
		e.preventDefault();
		
		const namaSubGroup = e.target.namaSubGroup.value.trim();
		const namaGroup = e.target.namaGroup.value.trim();
		
		// === VALIDASI INPUT ===
		// Validasi Nama SubGroup
		if (!namaSubGroup || namaSubGroup.length > 255) {
			showStatus('warning', 'Nama Organisasi wajib diisi dan maksimal 255 karakter.');
			return;
		}
		
		// Validasi Nama Group
		if (!namaGroup || namaGroup.length > 100) {
			showStatus('warning', 'Nama Kelompok wajib diisi dan maksimal 100 karakter.');
			return;
		}	
		// === END OF VALIDASI INPUT ===
		
		// VALIDASI DUPLIKAT
		const tabelContainer = document.getElementById("tabelDataUndangan");
		const rows =  tabelContainer.children;
		
		let isDuplicate = false;
		
		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			
			const rowSubGroup = row.querySelector('[data-label="Organisasi"]').textContent.trim();
			const rowGroup = row.querySelector('[data-label="Kelompok"]').textContent.trim();
			
			if (rowSubGroup === namaSubGroup && rowGroup === namaGroup) {
				isDuplicate = true;
				break;
			}
		}
		
		if (isDuplicate) {
			showStatus('warning', `Undangan untuk Organisasi: "${namaSubGroup}" dengan Kelompok: "${namaGroup}" sudah ada dalam daftar.`);
			return;
		}
		// END OF VALIDASI DUPLIKAT
		
		
		showStatus('loading', 'Menyimpan data undangan...');
		
		try {
			const results = await addUndanganEntry(namaSubGroup, namaGroup);
			
			showStatus('success', results.message || 'Undangan berhasil ditambahkan.');
			
			const closeBtn = e.target.closest('.modal-content').querySelector('.close');
			if (closeBtn) {
				closeFloat(closeBtn);
			}
		} catch (error) {
			console.error("Proses input undangan error:", error);
			showStatus('warning', error.message || 'Koneksi gagal. Cek jaringan atau server.');
		}
	});
}

function setupImportUndangan() {
	const importUndanganBtn = document.getElementById('btnImportUndangan');
	const wrapperImportUndangan = document.getElementById("wrapperImportUndangan");
	
	if (importUndanganBtn && wrapperImportUndangan) {
		importUndanganBtn.addEventListener('click', () => {
			wrapperImportUndangan.classList.add("flexShow");
		});
	}
}

function setupSubmitImportUndangan() {
	document.getElementById("formImportUndangan").addEventListener("submit", async (e) => {
		e.preventDefault();
		
		// VALIDASI
		const fileInput = e.target.fileExcel.files[0];
		if (fileInput) {
			const allowedExt = /(\.xls|\.xlsx)$/i;
			const allowedMimeTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
			
			if (!allowedExt.exec(fileInput.name) || !allowedMimeTypes.includes(fileInput.type)) {
				showStatus('warning', 'Format file tidak valid. Mohon upload file excel (.xls atau .xlsx)');
				fileInput.value = '';
				return;
			}
		} else {
			showStatus('warning', 'Mohon upload file excel (.xls atau .xlsx)');
			return;
		}
		
		try {
			const parsedData = await readAndParseExcel(fileInput);
			
			await processImportedData(parsedData, e);
		} catch (error) {
			console.error("Error Parsing Lokal:", error);
		}
	});
}

async function insertNewSubGroup(namaSubGroup, namaGroup) {
	try {
		const response = await fetch(`${API_URL}/api/admin/input-subgroup-group`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify({
				namaSubGroup: namaSubGroup,
				namaGroup: namaGroup,
			}),
		});
		
		const results = await response.json();
		
		if (response.ok) {
			masterGroupData.push({
				id_subgroup: results.idSubGroup,
				nama_subgroup: namaSubGroup,
				nama_group: namaGroup,
			});
			
			populateSubGroupDatalist(masterGroupData);
			
			return results.idSubGroup;
		} else {
			throw new Error(results.error || 'Gagal insert subgroup baru ke database.');
		}
	} catch (error) {
		console.error("Kesalahan pembuatan subgroup:", error);
		throw error;
	} finally {
		// Biarkan status loading tetap aktif sampai undangan ditambahkan
	}
}

function closeFloat(closeElement) {
	if (closeElement) {
		const wrapperFloat = closeElement.parentElement.parentElement;
		
		if (wrapperFloat &&  wrapperFloat.classList.contains("wrapperFloat")) {
			wrapperFloat.classList.remove("flexShow");
		}
	}
}
window.closeFloat = closeFloat;

function populateSubGroupDatalist(allGroupData) {
	const datalist = document.getElementById('subgroupList');
	if (!datalist) return;
	
	// Ambil daftar nama_subgroup
	const uniqueSubGroups = new Set(allGroupData.map(item => item.nama_subgroup).filter(Boolean));
	
	datalist.innerHTML = '';
	
	uniqueSubGroups.forEach(subgroup => {
		const option = document.createElement('option');
		option.value = subgroup;
		datalist.appendChild(option);
	});
}

function populateGroupDatalist(selectedSubGroup) {
	const datalist = document.getElementById('groupList');
	if (!datalist) return [];
	
	const isKnownSubGroup = masterGroupData.some(item => item.nama_subgroup === selectedSubGroup);
	
	let groupsToDisplay;
	
	if (isKnownSubGroup) {
		groupsToDisplay = masterGroupData
			.filter(item => item.nama_subgroup === selectedSubGroup)
			.map(item => item.nama_group)
			.filter(Boolean);
	} else {
		groupsToDisplay = masterGroupData
			.map(item => item.nama_group)
			.filter(Boolean);
	}
	
	const uniqueGroups = Array.from(new Set(groupsToDisplay));
	
	datalist.innerHTML = '';
	
	uniqueGroups.forEach(group => {
		const option = document.createElement('option');
		option.value = group;
		datalist.appendChild(option);
	});
	
	if (!isKnownSubGroup) {
		return [];
	}
	
	return uniqueGroups;
}

function setupSubGroupChangeListener() {
	const subgroupInput = document.querySelector('input[name="namaSubGroup"]');
	const groupInput = document.querySelector('input[name="namaGroup"]');
	
	if (subgroupInput && groupInput) {
		subgroupInput.addEventListener('input', (e) => {
			const selectedSubGroup = e.target.value.trim();
			
			// Panggil dan tangkap daftar group yg tersedia
			const availableGroups = populateGroupDatalist(selectedSubGroup);
			
			// Auto select
			if (availableGroups.length === 1) {
				groupInput.value = availableGroups[0];
			} else {
				groupInput.value = '';
			}
		});
	}
}

async function fetchMasterSubGroups() {
	try {
		const response = await fetch(`${API_URL}/api/admin/get-all-subgroups`, {
			method: 'GET',
			credentials: 'include',
		});
		
		if (!response.ok) {
			throw new Error(`Gagal mengambil semua subgroup: ${response.status}`);
		}
		
		const data = await response.json();
		
		if (data.results && Array.isArray(data.results)) {
			masterGroupData = data.results;
			populateSubGroupDatalist(masterGroupData);
			
			setupSubGroupChangeListener();
		} else {
			console.error("Master data subgroup tidak dalam format yang diharapkan.");
		}
	} catch (error) {
		console.error("Kesalahan Fetch Master Subgroup:", error);
	}
}

function readAndParseExcel(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
	
		reader.onload = async (event) => {
			try {
				const buffer = event.target.result;
				const workbook = new ExcelJS.Workbook();
				await workbook.xlsx.load(buffer);
				
				const worksheet = workbook.getWorksheet(1); 
				const results = [];
	
				worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
					
					// Lewati 7 baris pertama (metadata + header kolom)
					if (rowNumber <= 7) return; 
	
					// Ambil data dari Kolom B (index 2) dan Kolom C (index 3)
					const namaSubGroup = String(row.getCell(2).value || '').trim(); // Kolom B: Organisasi
					const namaGroup = String(row.getCell(3).value || '').trim();    // Kolom C: Kelompok
	
					if (namaSubGroup && namaGroup) {
						results.push({
							namaSubGroup: namaSubGroup,
							namaGroup: namaGroup
						});
					}
				});
	
				resolve(results);
			} catch (e) {
				// Tangani kasus di mana file tidak valid (misalnya corrupted)
				reject(new Error(`Gagal membaca struktur file Excel. Pastikan format file benar: ${e.message}`));
			}
		};
	
		reader.onerror = (error) => {
			reject(new Error("Gagal membaca file lokal menggunakan FileReader."));
		};
	
		reader.readAsArrayBuffer(file);
	});
}

// FUNGSI INTI UNTUK MENAMBAH SATU ENTRI UNDANGAN (DAPAT DIGUNAKAN KEMBALI)
async function addUndanganEntry(namaSubGroup, namaGroup) {
	let idSubGroup;
	
	// Cari atau buat entri subgroup/group baru
	let foundGroup = masterGroupData.find(item => item.nama_subgroup === namaSubGroup && item.nama_group === namaGroup);
	
	if (!foundGroup) {
		idSubGroup = await insertNewSubGroup(namaSubGroup, namaGroup);
		
		if (!idSubGroup) {
			throw new Error('Gagal mendapatkan ID Organisasi baru.');
		}
	} else {
		idSubGroup = foundGroup.id_subgroup;
	}
	
	if (!idSubGroup) {
		throw new Error('ID Organisasi tidak tersedia setelah pengecekan.');
	}
	
	// Tambahkan undangan ke acara
	const payload = {
		idAcara: idAcara,
		idSubGroup: idSubGroup,
	};
	
	const response = await fetch(`${API_URL}/api/input-undangan`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		credentials: 'include',
		body: JSON.stringify(payload),
	});
	
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		throw new Error("Respon server tidak valid (bukan JSON)");
	}
	
	const results = await response.json();
	
	if (!response.ok) {
		throw new Error(results.error || results.message || 'Gagal menyimpan undangan.');
	}
	
	return results;
}

// FUNGSI UNTUK MEMPROSES DATA IMPORT SECARA MASSAL
async function processImportedData(data, e) {
	showStatus('loading', `Memulai proses import ${data.length} baris data...`);
	
	const tabelContainer = document.getElementById("tabelDataUndangan");
	const existingEntries = new Set();
	
	// Kumpulkan entri yg sudah ada di tabel utk pengecekan duplikat
	for (let i = 1; i < tabelContainer.children.length; i++) {
		const row = tabelContainer.children[i];
		const rowSubGroup = row.querySelector('[data-label="Organisasi"]').textContent.trim();
		const rowGroup = row.querySelector('[data-label="Kelompok"]').textContent.trim();
		existingEntries.add(`${rowSubGroup}|${rowGroup}`);
	}
	
	const importedEntries = new Set();
	const entriesToProcess = [];
	const problemEntries = [];
	
	let duplicateCountInFile = 0;
	let existingCount = 0;
	let invalidCount = 0;
	
	// Validasi dan filter duplikat
	for (const item of data) {
		const namaSubGroup = item.namaSubGroup;
		const namaGroup = item.namaGroup;
		const key = `${namaSubGroup}|${namaGroup}`;
		
		// Validasi karakter
		const isInvalid = !namaSubGroup || namaSubGroup.length > 255 || !namaGroup || namaGroup.length > 100;
		
		if (isInvalid) {
			invalidCount++;
			problemEntries.push({ 
				namaSubGroup: namaSubGroup || '[KOSONG]', 
				namaGroup: namaGroup || '[KOSONG]', 
				reason: 'Invalid' 
			});
			continue;
		}
		
		// Cek duplikat terhadap data yang sudah ada di tabel
		if (existingEntries.has(key)) {
			existingCount++;
			problemEntries.push({ ...item, reason: 'Sudah Ada' });
			continue;
		}
		
		// Cek duplikat di dalam file import itu sendiri
		if (importedEntries.has(key)) {
			duplicateCountInFile++;
			problemEntries.push({ ...item, reason: 'Duplikat dalam File Excel' });
			continue;
		}
		
		importedEntries.add(key);
		entriesToProcess.push(item);
	}
	
	const totalToProcess = entriesToProcess.length;
	let successCount = 0;
	let failureCount = 0;
	const totalSkipped = existingCount + duplicateCountInFile + invalidCount;
	
	// Jika tidak ada data unik/valid yang diproses, tampilkan warning
	if (totalToProcess === 0) {
		let msg = 'Tidak ada data unik atau valid yang dapat di-import.';
		if (totalSkipped > 0) {
             msg += ` <br>Sudah Ada: ${existingCount} <br>Duplikat dalam File Excel: ${duplicateCountInFile} <br>Invalid: ${invalidCount}`;
        }
		
		if (problemEntries.length > 0) {
			const problemNames = problemEntries.map(item => {
				const name = `${item.namaSubGroup} (${item.namaGroup})`;
				const reason = item.reason;
				return `${name} [${reason}]`;
			}).join('<br>');
			
			msg += `<br><br>Detail Masalah:<br>${problemNames}`;
		}
		
		showStatus('warning', msg);
		return;
	}
	
	// Panggil API utk setiap entri unik
	for (let i = 0; i < totalToProcess; i++) {
		const item = entriesToProcess[i];
		showStatus('loading', `Memproses ${i + 1}/${totalToProcess}: ${item.namaSubGroup} - ${item.namaGroup}...`);
		
		try {
			await addUndanganEntry(item.namaSubGroup, item.namaGroup);
			successCount++;
		} catch (error) {
			console.error(`Gagal memproses baris ${i + 1} (${item.namaSubGroup} - ${item.namaGroup}):`, error);
			failureCount++;
			// Tambahkan item yang gagal ke daftar problemEntries
			problemEntries.push({ ...item, reason: 'Gagal API', error: error.message || 'Error Server' });
		}
	}
	
	// Status akhir dan penutup
	closeStatus();
	
	let finalMessage = `Proses import selesai. <br>Berhasil: ${successCount}`;
	
	if (failureCount > 0) {
		finalMessage += ` <br>Gagal: ${failureCount}.`;
	}
	
	if (totalSkipped > 0) {
		finalMessage += ` <br>Sudah Ada: ${existingCount} <br>Duplikat File: ${duplicateCountInFile} <br>Invalid: ${invalidCount}`;
	}
		
	// Tambahkan daftar nama entri yang bermasalah
	if (problemEntries.length > 0) {
		const problemNames = problemEntries.map(item => {
			const name = `${item.namaSubGroup} (${item.namaGroup})`;
			const reason = item.reason;
			const detail = item.reason === 'Gagal API' && item.error ? ` - ${item.error}` : ''; 
			return `${name} [${reason}]${detail}`;
		}).join('<br>');
		
		finalMessage += `.<br><br><b>Detail yang bermasalah:</b><br>${problemNames}`;
	}
	
	// Tentukan status yang ditampilkan
	if (failureCount > 0) {
		// Prioritas tertinggi: Ada kegagalan API
		if (successCount > 0) {
			// Sebagian gagal, sebagian berhasil
			showStatus('info', finalMessage);
		} else {
			// Semua gagal (0 sukses, kegagalan API)
			showStatus('warning', finalMessage);
		}
	} else if (totalSkipped > 0) {
		// Prioritas kedua: Semua sukses API, tapi ada Data Tidak Diproses (Duplikat/Sudah Ada/Invalid)
		showStatus('info', finalMessage);
	} else {
		// Prioritas terendah: Semua sempurna (SuccessCount > 0, FailureCount = 0, Skipped = 0)
		showStatus('success', finalMessage);
	}
	
	// Tutup modal dan bersihkan input jika ada yg berhasil diimport
	if (successCount > 0) {
		e.target.fileExcel.value = '';
		const closeBtn = e.target.closest('.modal-content').querySelector('.close');
		if (closeBtn) {
			closeFloat(closeBtn);
		}
	}
}

setupHeader('Data Undangan');
setupTambahUndangan();
setupSubmitTambahUndangan();
setupImportUndangan();
setupSubmitImportUndangan();
setupLogout('btnLogout');