// presensi-frontend/src/form.js

import Choices from 'choices.js';
import 'choices.js/public/assets/styles/choices.css';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { showStatus, cleanOnError, closeStatus } from './utils/status.js';
import { API_URL } from './utils/server.js';
import { setupHeader } from './utils/header.js';
import QRCode from 'qrcode-svg';
import html2canvas from 'html2canvas';

// Mengatur ulang properti ikon default Leaflet
L.Icon.Default.mergeOptions({
	iconRetinaUrl: markerIcon2x,
	iconUrl: markerIcon,
	shadowUrl: markerShadow,
});

import '@fortawesome/fontawesome-free/css/all.css';

let subGroupChoicesInstance = null;
let genderChoicesInstance = null;
let jenisKepegawaianChoicesInstance = null;

const params = new URLSearchParams(window.location.search);
const idAcara = params.get('acara');

let usrLat, usrLng, usrLatLng;
let acaraData = null;

if (!idAcara || idAcara.trim() === "") {
	const err = "Parameter 'acara' tidak ditemukan atau kosong.";
	cleanOnError(err);
} else {
	// Panggil fungsi inisialisasi yang menggunakan HTTP FETCH
	fetchAndInit(idAcara);

	// Handle Submit
	document.getElementById("formPresensi").addEventListener("submit", async (e) => {
		e.preventDefault();
		
		const nama = e.target.nama.value.trim();
		const jabatan = e.target.jabatan.value.trim();
		const noHp = e.target.noHp.value.trim();
		const email = e.target.email.value.trim();
		
		const idDevice = getDeviceId();
		
		let idSubGroup;
		if (subGroupChoicesInstance) {
			idSubGroup = subGroupChoicesInstance.getValue(true) || "";
		}
		
		let idGender;
		if (genderChoicesInstance) {
			idGender = genderChoicesInstance.getValue(true) || "";
		}
		
		let idJenisKepegawaian;
		if (jenisKepegawaianChoicesInstance) {
			idJenisKepegawaian = jenisKepegawaianChoicesInstance.getValue(true) || "";
		}
		
		// === VALIDASI INPUT ===
		// Validasi ID Acara
		if (!idAcara) {
			cleanOnError("ID Acara tidak ditemukan.");
		}
		
		// Validasi Nama
		if (!nama || nama.length > 100) {
			showStatus('warning', 'Nama wajib diisi dan maksimal 100 karakter.');
			return;
		}
		
		// Validasi Jabatan
		if (!jabatan || jabatan.length > 100) {
			showStatus('warning', 'Jabatan wajib diisi dan maksimal 100 karakter.');
			return;
		}
		
		// Validasi No. HP
		if (!noHp || noHp.length > 20) {
			showStatus('warning', 'Nomor HP wajib diisi dan maksimal 20 karakter.');
			return;
		}
		
		if (!/^[0-9+]+$/.test(noHp)) {
			showStatus('warning', 'Nomor HP hanya boleh mengandung angka dan tanda plus (+).');
			return;
		}
		
		// Validasi email
		if (!email || email.length > 100) {
			showStatus('warning', 'Email wajib diisi dan maksimal 100 karakter.');
			return;
		}
		
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
	
		if (!emailRegex.test(email)) {
			showStatus('warning', 'Format email tidak valid.');
			return;
		}
		
		// Validasi Latitude / Longitude
		if (!usrLat || !usrLng) {
			showStatus('warning', 'Gagal mendapatkan lokasi Anda!');
			return;
		}
		
		// Pastikan nilai Lat/Long adalah angka
		if (isNaN(usrLat) || isNaN(usrLng)) {
			showStatus('warning', 'Data lokasi tidak valid.');
			return;
		}
		
		// Validasi ID Device
		if (!idDevice || idDevice.length > 100) {
			cleanOnError("ID Perangkat tidak valid atau lebih dari 100 karakter.");
			return;
		}
		
		// Validasi ID SubGroup (Wajib dipilih)
		if (!idSubGroup) {
			showStatus('warning', 'Organisasi wajib dipilih!');
			return;
		}
		// Pastikan nilainya adalah angka (sebagai ID)
		if (isNaN(parseInt(idSubGroup))) {
			showStatus('warning', 'Organisasi yang dipilih tidak valid.');
			return;
		}
		
		// Validasi idGender (Wajib dipilih)
		if (!idGender) {
			showStatus('warning', 'Gender wajib dipilih!');
			return;
		}
		// Pastikan nilainya adalah angka (sebagai ID)
		if (isNaN(parseInt(idGender))) {
			showStatus('warning', 'Gender yang dipilih tidak valid.');
			return;
		}
		
		// Validasi idJenisKepegawaian (Wajib dipilih)
		if (!idJenisKepegawaian) {
			showStatus('warning', 'Jenis Kepegawaian wajib dipilih!');
			return;
		}
		// Pastikan nilainya adalah angka (sebagai ID)
		if (isNaN(parseInt(idJenisKepegawaian))) {
			showStatus('warning', 'Jenis Kepegawaian yang dipilih tidak valid.');
			return;
		}
		
		// === END OF VALIDASI INPUT ===
		
		// Format pesan dikirim ke HTTP POST
		const payload = {
			idAcara: idAcara,
			nama: nama,
			jabatan: jabatan,
			idJenisKepegawaian: idJenisKepegawaian,  
			idGender: idGender,
			noHp: noHp,
			email: email,
			latitude: usrLat,
			longitude: usrLng,
			idDevice: idDevice,
			idSubGroup: idSubGroup,
		};
		
		// Loading state
        showStatus('loading', 'Menyimpan presensi...');
		
		try {
			const response = await fetch(`${API_URL}/api/input-presensi`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
			
			const contentType = response.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				throw new Error("Respon server tidak valid (bukan JSON)");
			}
			
			const result = await response.json();
			
			if (response.ok) {
				const idPresensiBaru = result.id_presensi;
				const namaAcara = result.nama_acara;
				const namaPeserta = result.nama;
				const namaSubGroup = result.nama_subgroup;
				
				if (idPresensiBaru) {
					const qrCodeContainerId = `qrcode-${Date.now()}`;
					
					const successMsg = `
					<div id="buktiPresensi" style="text-align: left; padding: 10px;">
						<div><b>Presensi berhasil!</b></div>
						<div>ID Presensi: ${idPresensiBaru}</div>
						<div>Acara: ${namaAcara}</div>
						<div>Nama: ${namaPeserta}</div>
						<div>Organisasi: ${namaSubGroup}</div>
						<div id="${qrCodeContainerId}" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; justify-content: center;"></div>
					</div>
					<button id="btnDownloadBuktiPresensi" class="btn">Unduh Bukti Presensi</button>
					`;
					
					showStatus('success', successMsg);
					
					setTimeout(() => {
						const qrContainer = document.getElementById(qrCodeContainerId);
						
						if (qrContainer) {
							const qrcodeSVG = new QRCode({
								content: idPresensiBaru.toString(),
								padding: 4,
								width: 128,
								height: 128,
								color: "#000000",
								background: "#ffffff",
								ecl: "H"
							});
							
							qrContainer.innerHTML = qrcodeSVG.svg();
							
							const downloadBtn = document.getElementById('btnDownloadBuktiPresensi');
							if (downloadBtn) {
								downloadBtn.addEventListener('click', async () => {
									try {
										const input = document.getElementById('buktiPresensi');
										
										const canvas = await html2canvas(input, {
											scale: 2,
											useCORS: true,
											backgroundColor: '#ffffff'
										});
										
										const imgData = canvas.toDataURL('image/png');
										
										const link = document.createElement('a');
										const filename = `bukti-presensi-${idPresensiBaru}-${namaPeserta.replace(/\s/g, '_')}.png`;
										
										link.download = filename;
										link.href = imgData;
										
										document.body.appendChild(link);
										link.click();
										document.body.removeChild(link);		
									} catch (error) {
										console.error("Kesalahan saat generate PNG:", error);
									}
								});
							}
						} else {
							console.error("Container QR code tidak ditemukan.");
						}
					}, 0);
				} else {
					showStatus('info', result.message || 'Presensi berhasil disimpan, namun gagal mengambil ID.');
				}
				
				// Reset input
				e.target.nama.value = "";
				e.target.jabatan.value = "";
				e.target.noHp.value = "";
				e.target.email.value = "";
				
				if (subGroupChoicesInstance) {
					subGroupChoicesInstance.setChoiceByValue('');
				}
				
				if (genderChoicesInstance) {
					genderChoicesInstance.setChoiceByValue('');
				}
				
				if (jenisKepegawaianChoicesInstance) {
					jenisKepegawaianChoicesInstance.setChoiceByValue('');
				}
			} else {
				showStatus('warning', result.error || result.message);
			}
		} catch (error) {
			console.error("Fetch error:", error);
			showStatus('warning', 'Koneksi gagal. Cek jaringan Anda.');
		} 
	});
}

// === FUNGSI UNTUK MENGAMBIL DATA AWAL MELALUI HTTP ===
async function fetchAndInit(id) {
	showStatus('loading', 'Memuat data acara...');
	
	try {
		// Panggil endpoint baru di worker utama
		const response = await fetch(`${API_URL}/api/get-initial-data?acara=${id}`, {
			method: 'GET', // GET, karena hanya mengambil data
		});
		
		const result = await response.json();
		
		if (!response.ok) {
			throw new Error(result.error || result.message || "Gagal memuat data awal.");
		}
		
		const detailAcara = result.acara;
		const stats = result.data;
		
		acaraData = {
			namaAcara: detailAcara.nama_acara,
			lokasi: detailAcara.lokasi,
			latitude: detailAcara.latitude,
			longitude: detailAcara.longitude,
			radius: detailAcara.radius,
			tanggal: detailAcara.tanggal,
			jam: detailAcara.jam,
			subGroup: stats.subGroup || [],
			gender: stats.gender || [],
			jenisKepegawaian: stats.jenisKepegawaian || []
		}
		
		document.getElementById("namaAcara").style.display = "block";
		document.getElementById("detailWrapper").style.display = "grid";
		document.getElementById("wrapper").style.display = "flex";
		
		document.getElementById("namaAcara").innerHTML = acaraData.namaAcara;
		document.getElementById("lokasi").innerHTML = acaraData.lokasi;
		document.getElementById("tanggal").innerHTML = acaraData.tanggal;
		document.getElementById("jam").innerHTML = acaraData.jam;
		
		initMap(acaraData);
	
	} catch (error) {
		console.error("Initialization error:", error);
		cleanOnError(error.message || "Gagal memuat data acara.");
	}
}

// Inisiasi map
function initMap(acara) {
	showStatus('loading', 'Inisiasi map...');
	
	const acrLatLng = [acara.latitude, acara.longitude];
	const radius = acara.radius;
	
	// 19 = bangunan, 15 = kota, 0 = seluruh dunia.
	const zoom = 17;
	
	const  map = L.map('map', {
		scrollWheelZoom: false,
	}).setView(acrLatLng, zoom);

	// Layer dari OpenStreetMap
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
	}).addTo(map);
	
	// Tambahkan marker lokasi acara
	const marker = L.marker(acrLatLng).addTo(map)
		.bindPopup('<b>Lokasi Acara</b>')
		.openPopup();
	
	L.circle(acrLatLng, {
		radius: radius,
		color: 'blue',
		fillColor: '#3f9df5',
		fillOpacity: 0.2
	}).addTo(map)
	.bindPopup(`Radius ${radius} meter`);
	
	// Deteksi lokasi pengguna
	map.locate({
		setView: true,
		maxZoom: 17,
		enableHighAccuracy: true
	});
	
	// Custom user pin
	const userPin = L.divIcon({
		html: '<i class="fa-solid fa-location-dot userPin"></i>',
		iconSize: [32, 32],
		className: 'user-marker'
	});
	
	// Jika lokasi tidak ditemukan
	map.on('locationerror', onLocationNotFound);
	
	function onLocationNotFound(e) {
		showStatus('warning', e.message);
	
		throw new Error("Proses dihentikan karena gagal deteksi lokasi!");
	}
	
	// Daftarkan event listener
	map.on('locationfound', onLocationFound); 
	
	function onLocationFound(e) {
		usrLatLng = e.latlng;
		usrLat = e.latlng.lat;
		usrLng = e.latlng.lng;
	
		// Marker posisi pengguna
		L.marker(usrLatLng, { icon:userPin })
			.addTo(map)
			.bindPopup('Lokasi anda')
			.openPopup();
		
		// Cek jarak		
		showStatus('loading', 'Menghitung jarak...');

		const jarak = map.distance(usrLatLng, acrLatLng);

		if (jarak > radius) {
			showStatus('warning', 'Anda berada diluar area!');
			return;
		} else {
			tampilForm(acaraData).catch(console.error);
		}
	}
}

async function tampilForm(data) {
	document.getElementById("formPresensi").style.display = 'flex';
	closeStatus();
	
	initSubGroupChoices(data.subGroup);
	initJenisKepegawaianChoices(data.jenisKepegawaian);
	initGenderChoices(data.gender);
}

function initSubGroupChoices(subGroup) {
	const selectElement = document.getElementById("subGroup");
	
	selectElement.innerHTML = '';
	if (subGroupChoicesInstance) {
		subGroupChoicesInstance.destroy();
		selectElement.innerHTML = '';
	}
	
	const safeSubGroup = Array.isArray(subGroup) ? subGroup : [];

	const choicesOptions = safeSubGroup.map((row) => ({
		value: row.id_subgroup.toString(),
		label: row.nama_subgroup,
		selected: false,
		disabled: false,
	}));
	
	choicesOptions.unshift({
		value: '',
		label: 'Pilih Organisasi',
		selected: true,
		disabled: true,
	});
	
	subGroupChoicesInstance = new Choices(selectElement, {
		shouldSort: false,
		allowHTML: false,
		placeholder: true,
		itemSelectText: '',
		choices: choicesOptions,
	});
}

function initJenisKepegawaianChoices(jenisKepegawaian) {
	const selectElement = document.getElementById("jenisKepegawaian");

	selectElement.innerHTML = '';
	if (jenisKepegawaianChoicesInstance) {
		jenisKepegawaianChoicesInstance.destroy();
		selectElement.innerHTML = '';
	}
	
	const safeJenisKepegawaian = Array.isArray(jenisKepegawaian) ? jenisKepegawaian : [];

	const choicesOptions = safeJenisKepegawaian.map((row) => ({
		value: row.id_jenis_kepegawaian.toString(),
		label: row.jenis_kepegawaian,
		selected: false,
		disabled: false,
	}));
	
	choicesOptions.unshift({
		value: '',
		label: 'Pilih Jenis Kepegawaian',
		selected: true,
		disabled: true,
	});
	
	jenisKepegawaianChoicesInstance = new Choices(selectElement, {
		shouldSort: false,
		allowHTML: false,
		placeholder: true,
		itemSelectText: '',
		choices: choicesOptions,
	});
}

function initGenderChoices(gender) {
	const selectElement = document.getElementById("gender");

	selectElement.innerHTML = '';
	if (genderChoicesInstance) {
		genderChoicesInstance.destroy();
		selectElement.innerHTML = '';
	}
	
	const safeGender = Array.isArray(gender) ? gender : [];

	const choicesOptions = safeGender.map((row) => ({
		value: row.id_gender.toString(),
		label: row.gender,
		selected: false,
		disabled: false,
	}));
	
	choicesOptions.unshift({
		value: '',
		label: 'Pilih Gender',
		selected: true,
		disabled: true,
	});
	
	genderChoicesInstance = new Choices(selectElement, {
		shouldSort: false,
		allowHTML: false,
		placeholder: true,
		itemSelectText: '',
		choices: choicesOptions,
	});
}

function getDeviceId() {
	let deviceId = localStorage.getItem("deviceId");
	
	if (!deviceId) {
		deviceId = crypto.randomUUID();
		localStorage.setItem("deviceId", deviceId);
	}
	
	return deviceId;
}

setupHeader('Form Presensi');