// presensi-frontend/src/utils/export.js

import ExcelJS from 'exceljs';

export async function jsonToXlsx(customHeader, tableData, fieldConfig, colWidths = []) {
	// customHeader isinya nama acara, tangal, dll.
	
	if (!tableData || tableData.length === 0) return null;
	
	try {
		const workbook = new ExcelJS.Workbook;
		const ws = workbook.addWorksheet("Export Data");
		
		// Tentukan kolom terakhir (untuk merge judul)
		const numCol = fieldConfig.length;
		// Mencari kolom terakhir (untuk kolom di bawah Z).
        const lastCol = String.fromCharCode(65 + numCol - 1);
		
		// Aplikasikan column widths
		if (colWidths.length > 0) {
			ws.columns = colWidths.map((w, index) => ({ 
				key: `col${index}`,
				width: w.wch
			}));
		}
		
		// customHeader
		customHeader.forEach(rowArr => {
			ws.addRow(rowArr);
		});
		
		// Tambahkan data tabel
		tableData.forEach(rowObj => {
			const rowValues = fieldConfig.map(field => {
				// Ambil nilai dari objek yang sudah diformat oleh formatTableData
				const label = field.label;
				return rowObj[label];
			});
			ws.addRow(rowValues);
		});
		
		// Page Setup A4 Landscape
		ws.pageSetup.paperSize = 9;
		ws.pageSetup.orientation = 'landscape';
		ws.pageSetup.fitToPage = true;
		ws.pageSetup.fitToWidth = 1;
		ws.pageSetup.fitToHeight = 0;
		
		// Baris header tabel adalah baris terakhir dari customHeader
		const headerRowIndex = customHeader.length;
		
		// Merge judul
		ws.mergeCells(`A1:${lastCol}1`);
		
		const border = {
			top: { style: 'thin' },
			left: { style: 'thin' },
			bottom: { style: 'thin' },
			right: { style: 'thin' }
		};
		
		ws.eachRow((row, rowNumber) => {
			row.eachCell((cell, colNumber) => {
				
				// Judul (R=1)
				if (rowNumber === 1) {
					cell.font = { 
						bold: true, 
						size: 14 
					};
					cell.alignment = { 
						horizontal: 'center', 
						vertical: 'middle' 
					};
				}
				
				// Baris Header Tabel
				else if (rowNumber === headerRowIndex) {
					cell.font = { bold: true };
					cell.alignment = { 
						horizontal: 'center', 
						vertical: 'middle', 
						wrapText: true 
					};
					cell.border = border;
				}
				
				// Baris data dan header
				else if (rowNumber > headerRowIndex) {
					cell.border = border;
					cell.alignment = {
						vertical: 'top',
						wrapText: true
					};
					
					// Kolom No.
					if (colNumber === 1) {
						cell.alignment.horizontal = 'center';
						cell.alignment.vertical = 'middle';
					}
				}
			});
		});

		// Konversi ke Blob
		const buffer = await workbook.xlsx.writeBuffer();
		return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
	} catch (err) {
		console.error("Gagal mengkonversi data ke XLSX:", err);
		return null;
	}
}

export function formatTableData(data, fieldConfig) {
	return data.map((row, index) => {
		const newRow = {};
		fieldConfig.forEach(field => {
			const label = field.label;
			let value = (typeof field.value === 'function') ? field.value(row, index) : row[field.value];
			newRow[label] = value;
		});
		
		return newRow;
	});
}