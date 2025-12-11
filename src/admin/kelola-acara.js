// presensi-frontend/src/admin/kelola-acara.js

import '@fortawesome/fontawesome-free/css/all.css';
import { showStatus, cleanOnError, closeStatus } from '../utils/status.js';
import { API_URL, WS_URL } from '../utils/server.js';
import { setupLogout } from '../utils/logout.js';
import { setupHeader } from '../utils/header.js';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import * as GeoSearch from 'leaflet-control-geocoder';

const BATAM_LATLNG = [1.0967, 104.0326];
const batamViewbox = '103.60,0.47,104.50,1.35';
const INITIAL_ZOOM = 12;

let mapInstance = null;
let currentMarker;
let currentCircle;
let koordinatInput;
let currentLatitude;
let currentLongitude;

// Mengatur ulang properti ikon default Leaflet
L.Icon.Default.mergeOptions({
	iconRetinaUrl: markerIcon2x,
	iconUrl: markerIcon,
	shadowUrl: markerShadow,
});

async function initApp() {
	showStatus('loading', 'Memeriksa autentikasi...');
	// Cek auth
	const authenticated = await checkAdminAuth();
	if (!authenticated) return;
	
	showStatus('loading', 'Memuat...');
	
	const ws = new WebSocket(`${WS_URL}/ws/?acara=all`);
	
	let isErrorHandled = false;
	
	ws.onopen = () => {
		console.log("WebSocket connected");
	
		// Format pesan dikirim ke WebSocket
		const payload = {
			type: "get_data_acara",
		};
		
		ws.send(JSON.stringify(payload));
	};
	
	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
		
		if (data.type === "data_acara") {
			// Data acara diterima, maka closeStatus yg lama
			closeStatus();
			
			const dataAcara = data.results;
			
			if (!dataAcara || dataAcara.length === 0) {
				showStatus('warning', 'Tidak ada data acara yang ditemukan.');
				return;
			}
			
			document.getElementById("wrapper").style.display = "flex";
			const tabelContainer = document.getElementById("tabelDataAcara");
			
			while (tabelContainer.children.length > 1) {
				// Hapus semua kecuali header
				tabelContainer.removeChild(tabelContainer.lastChild);
			}
			
			dataAcara.forEach((item) => {
				const newRow = document.createElement('div');
				newRow.className = 'flex-row';
				
				newRow.innerHTML = `
					<div class="flex-cell col-no" data-label="No"></div>
					<div class="flex-cell" data-label="Nama Acara">${item.nama_acara}</div>
					<div class="flex-cell" data-label="Tanggal">${item.tanggal}</div>
					<div class="flex-cell" data-label="Jam Mulai">${item.jam}</div>
					<div class="flex-cell" data-label="Lokasi">${item.lokasi}</div>
					<div class="flex-cell" data-label="Latitude">${item.latitude}</div>
					<div class="flex-cell" data-label="Longitude">${item.longitude}</div>
					<div class="flex-cell" data-label="Radius">${item.radius}</div>
					<div class="flex-cell" data-label="Jml. Peserta">${item.jml_peserta}</div>
					<div class="flex-cell aksiWrapper" data-label="Undangan"><a href="data-undangan?acara=${item.id_acara}"><i class="fa-solid fa-eye iconAksi"></i></a></div>
					<div class="flex-cell aksiWrapper" data-label="Data Presensi"><a href="data-presensi?acara=${item.id_acara}"><i class="fa-solid fa-eye iconAksi"></i></a></div>
					<div class="flex-cell aksiWrapper" data-label="Link Presensi">
						<a href="/?acara=${item.id_acara}"><i class="fa-solid fa-link iconAksi"></i></a>
						<a href="/dashboard?acara=${item.id_acara}"><i class="fa-solid fa-gauge iconAksi"></i></a>
					</div>
					<div class="flex-cell aksiWrapper" data-label="Aksi"><i class="fa-solid fa-edit iconAksi"></i><i class="fa-solid fa-trash iconAksi"></i></div>
				`;
				
				tabelContainer.appendChild(newRow);
			});
			renumberTableRows(tabelContainer);
		} else if (data.type === "realtime_update_acara") {
			if (data.new_acara) {
				const item = data.new_acara;
				const tabelContainer = document.getElementById("tabelDataAcara");
				
				const newRow = document.createElement('div');
				newRow.className = 'flex-row kedip';
				newRow.dataset.idAcara = item.id_acara;
				
				newRow.innerHTML = `
					<div class="flex-cell col-no" data-label="No"></div>
					<div class="flex-cell" data-label="Nama Acara">${item.nama_acara}</div>
					<div class="flex-cell" data-label="Tanggal">${item.tanggal}</div>
					<div class="flex-cell" data-label="Jam Mulai">${item.jam}</div>
					<div class="flex-cell" data-label="Lokasi">${item.lokasi}</div>
					<div class="flex-cell" data-label="Latitude">${item.latitude}</div>
					<div class="flex-cell" data-label="Longitude">${item.longitude}</div>
					<div class="flex-cell" data-label="Radius">${item.radius}</div>
					<div class="flex-cell" data-label="Jml. Peserta">${item.jml_peserta}</div>
					<div class="flex-cell aksiWrapper" data-label="Undangan"><a href="data-undangan?acara=${item.id_acara}"><i class="fa-solid fa-eye iconAksi"></i></a></div>
					<div class="flex-cell aksiWrapper" data-label="Data Presensi"><a href="data-presensi?acara=${item.id_acara}"><i class="fa-solid fa-eye iconAksi"></i></a></div>
					<div class="flex-cell aksiWrapper" data-label="Link Presensi">
						<a href="/?acara=${item.id_acara}"><i class="fa-solid fa-link iconAksi"></i></a>
						<a href="/dashboard?acara=${item.id_acara}"><i class="fa-solid fa-gauge iconAksi"></i></a>
					</div>
					<div class="flex-cell aksiWrapper" data-label="Aksi"><i class="fa-solid fa-edit iconAksi"></i></div>
				`;
				
				tabelContainer.insertBefore(newRow, tabelContainer.children[1]);
				
				console.log("CLIENT LOG: Menerima Realtime Update Acara Baru");
				
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

submitTambahAcara();
function tambahAcara() {
	const tambahAcaraBtn = document.getElementById('btnTambahAcara');
	const wrapperTambahAcara = document.getElementById("wrapperTambahAcara");
	
	if (tambahAcaraBtn && wrapperTambahAcara) {
		tambahAcaraBtn.addEventListener('click', () => {
			wrapperTambahAcara.classList.add("flexShow");
			initMap();
			if (mapInstance) {
				mapInstance.invalidateSize();
			}
		});
	}
}

function submitTambahAcara() {
	document.getElementById("formTambahAcara").addEventListener("submit", async (e) => {
		e.preventDefault();
		
		const namaAcara = e.target.namaAcara.value.trim();
		const tanggal = e.target.tanggal.value;
		const jamMulai = e.target.jamMulai.value;
		const lokasi = e.target.lokasi.value.trim();
		
		const koordinatStr = e.target.koordinatInput.value.trim();
		const radiusStr = e.target.radius.value.trim();
		const jmlPesertaStr = e.target.jmlPeserta.value.trim();
		
		const { lat, lng } = parseCoordinates(koordinatStr);
		const latitude = lat;
		const longitude = lng;
		
		const radius = parseInt(radiusStr, 10);
		const jmlPeserta = parseInt(jmlPesertaStr, 10);
		
		// === VALIDASI INPUT ===
		// Validasi Nama Acara
		if (!namaAcara || namaAcara.length > 100) {
			showStatus('warning', 'Nama Acara wajib diisi dan maksimal 100 karakter.');
			return;
		}
		
		// Validasi Tanggal
		if (!tanggal || !/^\d{4}-\d{2}-\d{2}/.test(tanggal)) {
			showStatus('warning', 'Tanggal wajib diisi dengan format yang benar (YYYY-MM-DD).');
			return;
		}
		
		// Validasi Jam Mulai
		if (!jamMulai || !/^\d{2}:\d{2}/.test(jamMulai)) {
			showStatus('warning', 'Jam Mulai wajib diisi dengan format yang benar (HH:MM).');
			return;
		}
		
		// Validasi Lokasi
		if (!lokasi || lokasi.length > 255) {
			showStatus('warning', 'Lokasi wajib diisi dan maksimal 255 karakter.');
			return;
		}
		
		// Validasi Latitude longitude
		if (koordinatStr === "" || isNaN(latitude) || isNaN(longitude)) {
			showStatus('warning', 'Koordinat (Latitude, Longitude) wajib diisi dengan format yang benar (misal: 1.0967, 104.0326).');
			return;
		}
		
		if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
			showStatus('warning', 'Latitude harus antara -90 dan 90, dan Longitude antara -180 dan 180.');
			return;
		}
		
		// Validasi Radius
		if (radiusStr === "" || isNaN(radius) || radius <= 0 || !Number.isInteger(radius)) {
			showStatus('warning', 'Radius wajib diisi, harus berupa angka bulat, dan lebih besar dari 0.');
			return;
        }
		
		// Validasi Jml. Peserta
		if (jmlPesertaStr === "" || isNaN(jmlPeserta) || jmlPeserta <= 0 || !Number.isInteger(jmlPeserta)) {
			showStatus('warning', 'Jumlah Peserta wajib diisi, harus berupa angka bulat, dan lebih besar dari 0.');
			return;
		}
		
		// === END OF VALIDASI INPUT ===
		
		const payload = {
			namaAcara: namaAcara,
			tanggal: tanggal,
			jamMulai: jamMulai,
			lokasi: lokasi,
			latitude: latitude,
			longitude: longitude,
			radius: radius,
			jmlPeserta: jmlPeserta,
		};

		showStatus('loading', 'Menyimpan data acara...');
		
		try {
			const response = await fetch(`${API_URL}/api/input-acara`, {
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
			
			if (response.ok) {
				showStatus('success', results.message || 'Acara berhasil ditambahkan.');
				
				const closeBtn = e.target.closest('.modal-content').querySelector('.close');
				if (closeBtn) {
					closeFloat(closeBtn);
				}
				
				e.target.reset();
				clearMap();
			} else {
				showStatus('warning', results.error || results.message || 'Gagal menyimpan acara.');
			}
		} catch (error) {
			console.error("Fetch error:", error);
			showStatus('warning', 'Koneksi gagal. Cek jaringan atau server.');
		}
	});
}

// === MAPS ===
function updateCoordinates(lat, lng) {
	const coordString = `${lat}, ${lng}`;
	if (koordinatInput) koordinatInput.value = coordString;
	
	currentLatitude = lat;
	currentLongitude = lng;
}

function parseCoordinates(coordString) {
	// Menghapus spasi ekstra dan memecah berdasarkan koma
	const parts = coordString.trim().split(',').map(part => part.trim());
	
	if (parts.length === 2) {
		const lat = parseFloat(parts[0]);
		const lng = parseFloat(parts[1]);
		
		// Memastikan kedua bagian adalah angka valid
		if (!isNaN(lat) && !isNaN(lng)) {
			// Lakukan validasi batas Lat/Lng yang ketat
			if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
				return { lat: lat, lng: lng };
			}
		}
	}
	
	// Jika format atau nilai tidak valid
	return { lat: NaN, lng: NaN };
}

function pinpointFromInput() {
	if (!koordinatInput || !mapInstance) return;
	
	const { lat, lng } = parseCoordinates(koordinatInput.value);
	
	if (!mapInstance) return;
	
	// Bersihkan marker/circle yang ada
	if (currentMarker) {
		mapInstance.removeLayer(currentMarker);
		currentMarker = null;
	}
	if (currentCircle) {
		mapInstance.removeLayer(currentCircle);
		currentCircle = null;
	}
	
	// Hanya lanjutkan jika Latitude & Longitude terisi dan valid
	if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
		currentLatitude = null;
        currentLongitude = null;
		return; 
	}
	
	const latlng = L.latLng(lat, lng);
	// Perbarui variabel global
	currentLatitude = lat;
	currentLongitude = lng;
	
	// Tambahkan Marker Baru
	currentMarker = L.marker(latlng).addTo(mapInstance).bindPopup("Lokasi Acara").openPopup();
	
	// Pindahkan view peta ke lokasi baru tersebut
	mapInstance.setView(latlng, mapInstance.getZoom() > 14 ? mapInstance.getZoom() : 14);
}

function initMap() {
	if (mapInstance) {
		// Atur ulang peta
		mapInstance.invalidateSize();
		return;
	}
	
	koordinatInput = document.getElementById('koordinatInput');
	if (koordinatInput) {
		koordinatInput.addEventListener('input', pinpointFromInput);
	}
	
	mapInstance = L.map('map', { scrollWheelZoom: false }).setView(BATAM_LATLNG, INITIAL_ZOOM); // Batam
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(mapInstance);
	
	// KONFIGURASI GEOCODER (Batam)
	var geocoder = L.Control.Geocoder.nominatim({
		geocodingQueryParams: {
			viewbox: batamViewbox,
			bounded: 1,
			countrycodes: 'id'
		},
		reverseQueryParams: {
			'accept-language': 'id'
		}
	});
	
	var geocoderControl = L.Control.geocoder({
		position: 'topright',
		defaultMarkGeocode: false,
		collapsed: false,
		placeholder: 'Cari tempat di Batam...',
		geocoder: geocoder
	}).addTo(mapInstance);

	// Ambil koordinat dari pencarian
	geocoderControl.on('markgeocode', function(e) {
		var lat = e.geocode.center.lat;
		var lng = e.geocode.center.lng;
		
		updateCoordinates(lat, lng);
		pinpointFromInput();
	});
	
	// Ambil koordinat dari klik peta
	mapInstance.on('click', function(e) {
		var lat = e.latlng.lat;
		var lng = e.latlng.lng;
		
		// Bersihkan marker lama
		if (currentMarker) {
			mapInstance.removeLayer(currentMarker);
		}
		
		if (currentCircle) {
			mapInstance.removeLayer(currentCircle);
		}
		
		updateCoordinates(lat, lng);
		pinpointFromInput();
	});
	
	// Deteksi lokasi saya
	var locateButton = document.getElementById('btnLokasiSaya');
	locateButton.addEventListener('click', function() {
		showStatus('loading', 'Menemukan lokasi anda...');
		
		mapInstance.locate({
			setView: true,
			maxZoom: 16,
			enableHighAccuracy: true
		});
	});
	
	mapInstance.on('locationfound', function(e) {
		closeStatus();
		
		var lat = e.latlng.lat;
		var lng = e.latlng.lng;
		
		updateCoordinates(lat, lng);
		pinpointFromInput();
	});
	
	mapInstance.on('locationerror', function(e) {
		showStatus('warning', "Gagal menemukan lokasi Anda" + e.message + " | Pastikan izin lokasi diberikan.");
	});
	
	// Batas koordinat (Lng Min, Lat Min, Lng Max, Lat Max)
    const parts = batamViewbox.split(',').map(p => parseFloat(p.trim()));
    
    if (parts.length === 4 && !parts.some(isNaN)) {
        const LngMin = parts[0];
        const LatMin = parts[1];
        const LngMax = parts[2];
        const LatMax = parts[3];
        
        // Definisikan batas Leaflet (format Lat Min, Lng Min -> Lat Max, Lng Max)
        var batamBounds = [
            [LatMin, LngMin], // Sudut SW 
            [LatMax, LngMax]  // Sudut NE
        ];
    
		// Tambahkan rectangle ke peta
		L.rectangle(batamBounds, {
			color: "#ff7800",
			weight: 1,
			fillOpacity: 0.1,
			dashArray: '5, 5'
		}).addTo(mapInstance);
	}
}

function clearMap() {
	if (mapInstance) {
		if (currentMarker) {
			mapInstance.removeLayer(currentMarker);
			currentMarker = null;
		}
		
		if (currentCircle) {
			mapInstance.removeLayer(currentCircle);
			currentCircle = null;
		}
		
		mapInstance.setView(BATAM_LATLNG, INITIAL_ZOOM);
		
		koordinatInput.value = '';
		currentLatitude = null;
		currentLongitude = null;
    }
}

// === END OF MAPS ===

function closeFloat(closeElement) {
	if (closeElement) {
		const wrapperFloat = closeElement.parentElement.parentElement;
		
		if (wrapperFloat &&  wrapperFloat.classList.contains("wrapperFloat")) {
			wrapperFloat.classList.remove("flexShow");
		}
	}
}
window.closeFloat = closeFloat;

setupHeader('Kelola Acara');

// Panggil fungsi tambahAcara() untuk mengaktifkan event listener tombol 'btnTambahAcara'
tambahAcara();

setupLogout('btnLogout');

initApp();