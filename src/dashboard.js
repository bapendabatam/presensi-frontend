// presensi-frontend/src/dashboard.js

import '@fortawesome/fontawesome-free/css/all.css';
import { showStatus, cleanOnError, closeStatus } from './utils/status.js';
import { API_URL, WS_URL } from './utils/server.js';
import { setupHeader } from './utils/header.js';

const params = new URLSearchParams(window.location.search);
const idAcara = params.get('acara');

if (!idAcara || idAcara.trim() === "") {
	const err = "Parameter 'acara' tidak ditemukan atau kosong.";	
	cleanOnError(err);
} else {
	const ws = new WebSocket(`${API_URL}/ws/?acara=${idAcara}`);
	
	let isErrorHandled = false;
	let jmlPeserta;
	let jmlPesertaHadir;
	let jmlSubGroup;
	let jmlSubGroupHadir;
	let jmlSubGroupBelumHadir;
	let subGroupBelumHadir;
	
	ws.onopen = () => {
		console.log("WebSocket connected");
	};

	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
		console.log("DASHBOARD LOG: Menerima Pesan WS Tipe:", data.type);
		
		if (data.type == "acara_tidak_ditemukan") {
			const err = "Acara tidak ditemukan.";
			cleanOnError(err);
			
			isErrorHandled = true;
			
			return;
		} else if (data.type === "initial_stats") {
			console.log("INITIAL STATS DITERIMA");
			
			const stats = data.data;
			const acaraDetails = data.acara;
			
			// Update Global Variables dengan data statistik baru
			if (acaraDetails.jml_peserta !== undefined) {
				jmlPeserta = acaraDetails.jml_peserta;
			}
			
			if (stats.jmlPesertaHadir !== undefined) {
				jmlPesertaHadir = stats.jmlPesertaHadir;
			}
			
			if (stats.jmlSubGroup !== undefined) {
				jmlSubGroup = stats.jmlSubGroup;
			}
			
			if (stats.jmlSubGroupHadir !== undefined) {
				jmlSubGroupHadir = stats.jmlSubGroupHadir;
			}
			
			if (stats.subGroupBelumHadir !== undefined) {
				subGroupBelumHadir = stats.subGroupBelumHadir;
			}
			
			document.getElementById("namaAcara").style.display = "block";
			document.getElementById("detailWrapper").style.display = "grid";
			document.getElementById("wrapperProgress").style.display = "block";
			document.getElementById("wrapper").style.display = "flex";
			
			document.getElementById("namaAcara").innerHTML = acaraDetails.nama_acara;
			document.getElementById("lokasi").innerHTML = acaraDetails.lokasi;
			document.getElementById("tanggal").innerHTML = acaraDetails.tanggal;
			document.getElementById("jam").innerHTML = acaraDetails.jam;
			
			renderPeserta(jmlPeserta, jmlPesertaHadir);
			renderSubGroup(jmlSubGroup, jmlSubGroupHadir);
			
			const subGroupsToRender = subGroupBelumHadir || [];
			
			renderSubGroupBelumHadir(subGroupsToRender);
		} else if (data.type === "realtime_update") {
			console.log("REALTIME UPDATE DITERIMA");
			
			const stats = data.data;
			
			if (stats.jmlPesertaHadir !== undefined) {
				jmlPesertaHadir = stats.jmlPesertaHadir;
			}
			
			if (stats.jmlSubGroupHadir !== undefined) {
				jmlSubGroupHadir = stats.jmlSubGroupHadir;
			}
			
			renderPeserta(jmlPeserta, jmlPesertaHadir);
			renderSubGroup(jmlSubGroup, jmlSubGroupHadir);
			
			// Logika menghapus item dari list subgroup belum hadir
			const subGroupBelumHadirNames = stats.subGroupBelumHadir.map(item => item.nama_subgroup);
			
			const container = document.getElementById('subGroupBlmHadir');
			const allListItems = container.querySelectorAll('li.subGroupItem');

			// Iterasi semua item yang ada di dashboard
			allListItems.forEach(li => {
				const nameOnDashboard = li.textContent.trim();
				
				// Cek Jika item yang ada di dashboard TIDAK ditemukan di list SubGroup Belum Hadir (berarti item itu sudah hadir)
				if (!subGroupBelumHadirNames.includes(nameOnDashboard)) {
					// Animasi kedip dan hapus
					li.classList.add("kedip");
					
					// Cari parent <ol>
					const parentList = li.closest('ol');
					
					setTimeout(() => {
						li.remove();
						
						//Hapus header group jika list subGroup-nya sudah kosong
						if (parentList && parentList.children.length === 0) {
							parentList.closest('.groupWrapper').remove();
						}
					}, 600);
				}
			});
		} else if (data.type === "realtime_update_undangan") {
			console.log("REALTIME UPDATE UNDANGAN DITERIMA");
			
			const stats = data.data;
			const newEntry = data.new_entry;
			
			// Update
			if (stats.jmlSubGroup !== undefined) {
				jmlSubGroup = stats.jmlSubGroup;
			}
			
			if (stats.jmlSubGroupHadir !== undefined) {
				jmlSubGroupHadir = stats.jmlSubGroupHadir;
			}
			
			renderSubGroup(jmlSubGroup, jmlSubGroupHadir);
			
			if (stats.subGroupBelumHadir !== undefined) {
				renderSubGroupBelumHadir(stats.subGroupBelumHadir, newEntry.nama_subgroup);
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

function renderPeserta(jmlPeserta, jmlPesertaHadir) {
	const jmlPesertaBlmHadir = jmlPeserta - jmlPesertaHadir;

	const bar = document.getElementById("progressPesertaBar");
	const text = document.getElementById("progressPesertaText");
	const persenPesertaHadir = ((jmlPesertaHadir / jmlPeserta) * 100).toFixed(1);

	bar.style.width = `${persenPesertaHadir}%`;
	text.textContent = `${jmlPesertaHadir} / ${jmlPeserta} (${persenPesertaHadir}%)`;
}

function renderSubGroup(jmlSubGroup, jmlSubGroupHadir) {
	const jmlSubGroupBlmHadir = jmlSubGroup - jmlSubGroupHadir;

	const bar = document.getElementById("progressSubGroupBar");
	const text = document.getElementById("progressSubGroupText");
	const persenSubGroupHadir = ((jmlSubGroupHadir / jmlSubGroup) * 100).toFixed(1);

	bar.style.width = `${persenSubGroupHadir}%`;
	text.textContent = `${jmlSubGroupHadir} / ${jmlSubGroup} (${persenSubGroupHadir}%)`;
}

function renderSubGroupBelumHadir(subGroupsToRender, highlightSubGroup = null) {
	const groupedData = subGroupsToRender.reduce((accumulator, item) => {
		const key = item.nama_group;
		if (!accumulator[key]) {
			accumulator[key] = [];
		}
		accumulator[key].push(item);
		return accumulator;
	}, {});
	
	const container = document.getElementById('subGroupBlmHadir');
	container.innerHTML = '';
	
	Object.entries(groupedData).forEach(([groupName, subGroups]) => {
		const groupWrapper = document.createElement('div');
		groupWrapper.classList.add('groupWrapper');
		
		const groupHeader = document.createElement('div');
		groupHeader.classList.add('groupHeader');
		groupHeader.textContent = groupName;
		
		const groupList = document.createElement('ol');
		groupList.classList.add('groupList');
		
		subGroups.forEach(subGroup => {
			const subGroupItem = document.createElement('li');
			subGroupItem.classList.add('subGroupItem');
			
			// Masukkan nama subGroup
			subGroupItem.textContent = subGroup.nama_subgroup;
			
			// Tambahkan efek kedip
			if (subGroup.nama_subgroup === highlightSubGroup) {
				subGroupItem.classList.add('kedip');
				setTimeout(() => {
					subGroupItem.classList.remove('kedip');
				}, 3000);
			}
			
			groupList.appendChild(subGroupItem);
		});
		
		groupWrapper.appendChild(groupHeader);
		groupWrapper.appendChild(groupList);
		
		container.appendChild(groupWrapper);
	});
}

setupHeader('Dashboard Presensi');