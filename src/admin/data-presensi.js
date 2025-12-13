// presensi-frontend/src/admin/data-presensi.js

import '@fortawesome/fontawesome-free/css/all.css';

import { showStatus, cleanOnError, closeStatus } from '../utils/status.js';
import { API_URL, WS_URL } from '../utils/server.js';
import { setupLogout } from '../utils/logout.js';
import { jsonToXlsx, formatTableData } from '../utils/export.js';
import { setupHeader } from '../utils/header.js';

const params = new URLSearchParams(window.location.search);
const idAcara = params.get('acara');

let metadataAcara = {};
let statsAcara = {};
let masterDataPresensi = [];

const PRESENSI_FIELDS = [
	{ label: 'No.', value: (row, index) => index + 1},
	{ label: 'Waktu', value: row => {
		if (!row.waktu) return '';
		const date = new Date(row.waktu);
		return date.toLocaleString('id-ID', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		});
	}},
	{ label: 'Nama', value: 'nama' },
	{ label: 'Organisasi', value: 'nama_subgroup' },
	{ label: 'Jabatan', value: 'jabatan' },
	{ label: 'Jenis Kepegawaian', value: 'jenis_kepegawaian' },
	{ label: 'Gender', value: 'gender' },
	{ label: 'No. HP', value: 'no_hp' },
	{ label: 'Email', value: 'email' },
	{ label: 'Latitude', value: 'latitude' },
	{ label: 'Longitude', value: 'longitude' },
	{ label: 'ID Device', value: 'id_device' },
];

const PRESENSI_COL_WIDTHS = [
	{ wch: 5 },  // 1. Kolom 'No'
	{ wch: 20 }, // 2. Kolom 'Waktu'
	{ wch: 20 }, // 3. Kolom 'Nama'
	{ wch: 18 }, // 4. Kolom 'Organisasi'
	{ wch: 17 }, // 5. Kolom 'Jabatan'
	{ wch: 17 }, // 6. Kolom 'Jenis Kepegawaian'
	{ wch: 17 }, // 7. Kolom 'Gender'
	{ wch: 15 }, // 8. Kolom 'No. HP'
	{ wch: 15 }, // 9. Kolom 'Email'
	{ wch: 10 }, // 10. Kolom 'Latitude'
	{ wch: 10 }, // 11. Kolom 'Longitude'
	{ wch: 15 }  // 12. Kolom 'ID Device'
];

if (checkAdminAuth()) {
	if (!idAcara || idAcara.trim() === "") {
		const err = "Parameter 'acara' tidak ditemukan atau kosong.";	
		cleanOnError(err);
	} else {		
		const ws = new WebSocket(`${WS_URL}/ws/?acara=${idAcara}`);
		
		let isErrorHandled = false;
		
		ws.onopen = () => {
			console.log("WebSocket connected");
	
			// Format pesan dikirim ke WebSocket
			const payload = {
				type: "get_data_presensi",
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
				
				metadataAcara = {
					namaAcara: acaraDetails.nama_acara,
					tanggal: acaraDetails.tanggal,
					jam: acaraDetails.jam
				};
				
				document.getElementById("namaAcara").style.display = "block";
				document.getElementById("detailWrapper").style.display = "grid";
				document.getElementById("wrapper").style.display = "flex";
				
				document.getElementById("namaAcara").innerHTML = acaraDetails.nama_acara;
				document.getElementById("lokasi").innerHTML = acaraDetails.lokasi;
				document.getElementById("tanggal").innerHTML = acaraDetails.tanggal;
				document.getElementById("jam").innerHTML = acaraDetails.jam;
			} else if (data.type === "data_presensi") {
				// Dipanggil hanya saat pertama kali halaman di-load
				console.log("Menerima Data Presensi:", data);
				
				const dataPresensi = data.results;
				
				if (!dataPresensi || dataPresensi.length === 0) {
					showStatus('warning', 'Tidak ada data presensi yang ditemukan.');
					return;
				}
				
				masterDataPresensi = dataPresensi;
				
				// Perlu di tampilkan dulu elementnya
				document.getElementById("statsWrapper").style.display = "flex";
				updateStats();
				
				const tabelContainer = document.getElementById("tabelDataPresensi");
				
				while (tabelContainer.children.length > 1) {
					// Hapus semua kecuali header
					tabelContainer.removeChild(tabelContainer.lastChild);
				}
				
				dataPresensi.forEach((item, index) => {
					const date = new Date(item.waktu);
					const waktuFormatted = date.toLocaleString('id-ID', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit'
					});
					
					const newRow = document.createElement('div');
					newRow.className = 'flex-row';
					
					newRow.innerHTML = `
						<div class="flex-cell col-no" data-label="No">${index + 1}</div>
						<div class="flex-cell" data-label="Waktu">${waktuFormatted}</div>
						<div class="flex-cell" data-label="Nama">${item.nama}</div>
						<div class="flex-cell" data-label="Organisasi">${item.nama_subgroup}</div>
						<div class="flex-cell" data-label="Jabatan">${item.jabatan}</div>
						<div class="flex-cell" data-label="Jenis Kepegawaian">${item.jenis_kepegawaian}</div>
						<div class="flex-cell" data-label="Gender">${item.gender}</div>
						<div class="flex-cell" data-label="No. HP">${item.no_hp}</div>
						<div class="flex-cell" data-label="Email">${item.email}</div>
						<div class="flex-cell" data-label="Latitude">${item.latitude}</div>
						<div class="flex-cell" data-label="Longitude">${item.longitude}</div>
						<div class="flex-cell" data-label="ID Device">${item.id_device}</div>
					`;
					
					tabelContainer.appendChild(newRow);
				});
				renumberTableRows(tabelContainer);
			} else if (data.type === "realtime_update") {
				// Kalau ada data baru yg masuk
				if (data.new_entry) {
					const item = data.new_entry;
					
					masterDataPresensi.push(item);
					updateStats();
					
					const tabelContainer = document.getElementById("tabelDataPresensi");
					
					const date = new Date(item.waktu);
					const waktuFormatted = date.toLocaleString('id-ID', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit'
					});
					
					const newRow = document.createElement('div');
					newRow.className = 'flex-row kedip';
					
					newRow.innerHTML = `
						<div class="flex-cell col-no" data-label="No"></div>
						<div class="flex-cell" data-label="Waktu">${waktuFormatted}</div>
						<div class="flex-cell" data-label="Nama">${item.nama}</div>
						<div class="flex-cell" data-label="Organisasi">${item.nama_subgroup}</div>
						<div class="flex-cell" data-label="Jabatan">${item.jabatan}</div>
						<div class="flex-cell" data-label="Jenis Kepegawaian">${item.jenis_kepegawaian}</div>
						<div class="flex-cell" data-label="Gender">${item.gender}</div>
						<div class="flex-cell" data-label="No. HP">${item.no_hp}</div>
						<div class="flex-cell" data-label="Email">${item.email}</div>
						<div class="flex-cell" data-label="Latitude">${item.latitude}</div>
						<div class="flex-cell" data-label="Longitude">${item.longitude}</div>
						<div class="flex-cell" data-label="ID Device">${item.id_device}</div>
					`;
					
					tabelContainer.appendChild(newRow);
					
					console.log("CLIENT LOG: Menerima Realtime Update");
					
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

async function exportToXlsx() {
	if (masterDataPresensi.length === 0) {
		showStatus('warning', 'Tidak ada data presensi untuk di-export.');
		return;
	}
	
	showStatus('loading', 'Menyiapkan data presensi dengan format XLSX...');
	
	try {
		const metadata = {
			namaAcara: metadataAcara.namaAcara,
			tanggal: metadataAcara.tanggal,
			jam: metadataAcara.jam
		}
		
		const stats = {
			jmlLaki: statsAcara.totalLaki,
			jmlPerempuan: statsAcara.totalPerempuan,
			jmlPesertaPresensi: statsAcara.totalPesertaPresensi
		}
		
		const formattedTableData = formatTableData(masterDataPresensi, PRESENSI_FIELDS);
		
		const customHeader = [
			['Data Presensi'],
			[],
			['', 'Acara', `: ${metadata.namaAcara}`],
			['', 'Tanggal', `: ${metadata.tanggal}`],
			['', 'Jam Mulai', `: ${metadata.jam}`],
			[],
			['', 'Jml. Laki-laki', `: ${stats.jmlLaki}`],
			['', 'Jml. Perempuan', `: ${stats.jmlPerempuan}`],
			['', 'Jml. Peserta Presensi', `: ${stats.jmlPesertaPresensi}`],
			[],
			['', 'Jml. PNS', `: ${stats.jmlPns}`],
			['', 'Jml. PPPK', `: ${stats.jmlPppk}`],
			['', 'Jml. Non-ASN', `: ${stats.jmlNonAsn}`],
			[],
			PRESENSI_FIELDS.map(f => f.label)
		];
		
		const xlsxBlob = await jsonToXlsx(customHeader, formattedTableData, PRESENSI_FIELDS, PRESENSI_COL_WIDTHS);
		
		if (!xlsxBlob) {
			throw new Error("Gagal konversi data presensi ke XLSX");
		}
		
		const url = URL.createObjectURL(xlsxBlob);
		const link = document.createElement('a');
		link.href = url;
		
		const namaAcara = metadata.namaAcara;
		const fileName = `data-presensi-${namaAcara.toLowerCase().replace(/\s/g, '-')}-generate-${new Date().toISOString().slice(0, 10)}.xlsx`;
		
		link.setAttribute('download', fileName);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		
		link.click();
		
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		
		closeStatus();
		showStatus('success', 'Data presensi berhasil di-export ke Excel.');
	} catch (e) {
		console.error("Export XLSX Error:", e);
		showStatus('warning', 'Gagal export XLSX.');
	}
}

function listenExportXlsx() {
	const btnExportXlsx = document.getElementById("btnExportXlsx");
	
	if (btnExportXlsx) {
		btnExportXlsx.addEventListener('click', () => {
			exportToXlsx();
		});
	}
}

function updateStats() {
	if (!masterDataPresensi) return;
	
	const totalPesertaPresensi = masterDataPresensi.length;
	
	const totalLaki = masterDataPresensi.filter(item => item.gender && item.gender.toLowerCase() === 'laki-laki').length;
	
	const totalPerempuan = masterDataPresensi.filter(item => item.gender && item.gender.toLowerCase() === 'perempuan').length;
	
	const totalPns = masterDataPresensi.filter(item => item.jenis_kepegawaian && item.jenis_kepegawaian.toLowerCase() === 'pns').length;
	
	const totalPppk = masterDataPresensi.filter(item => item.jenis_kepegawaian && item.jenis_kepegawaian.toLowerCase() === 'pppk').length;
	
	const totalNonAsn = masterDataPresensi.filter(item => item.jenis_kepegawaian && item.jenis_kepegawaian.toLowerCase() === 'non-asn').length;
	
	statsAcara = {
		totalLaki,
		totalPerempuan,
		totalPesertaPresensi,
		totalPns,
		totalPppk,
		totalNonAsn
	}
	
	const elJmlLaki = document.getElementById('jmlLaki');
	const elJmlPerempuan = document.getElementById('jmlPerempuan');
	const elJmlPeserta = document.getElementById('jmlPesertaPresensi');
	
	const elJmlPns = document.getElementById('jmlPns');
	const elJmlPppk = document.getElementById('jmlPppk');
	const elJmlNonAsn = document.getElementById('jmlNonAsn');
	
	if (elJmlLaki) elJmlLaki.textContent = totalLaki;
	if (elJmlPerempuan) elJmlPerempuan.textContent = totalPerempuan;
	if (elJmlPeserta) elJmlPeserta.textContent = totalPesertaPresensi;
	
	if (elJmlPns) elJmlPns.textContent = totalPns;
	if (elJmlPppk) elJmlPppk.textContent = totalPppk;
	if (elJmlNonAsn) elJmlNonAsn.textContent = totalNonAsn;
}

setupHeader('Data Presensi');

listenExportXlsx();

setupLogout('btnLogout');