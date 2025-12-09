// presensi-frontend/vite.config.js

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	root: resolve(__dirname, 'src'),

	build: {
		emptyOutDir: true,
		sourcemap: true,
		outDir: resolve(__dirname, 'dist'),
		chunkSizeWarningLimit: 1200,
		
		rollupOptions: {
			input: {
				main: resolve(process.cwd(), 'src/index.html'),
				dashboard: resolve(process.cwd(), 'src/dashboard.html'),
				'admin/login': resolve(process.cwd(), 'src/admin/login.html'),
				'admin/index': resolve(process.cwd(), 'src/admin/index.html'),
				'admin/data-presensi': resolve(process.cwd(), 'src/admin/data-presensi.html'),
				'admin/data-undangan': resolve(process.cwd(), 'src/admin/data-undangan.html'),
				'admin/kelola-acara': resolve(process.cwd(), 'src/admin/kelola-acara.html'),
			},
			
			output: {
				manualChunks(id) {
					// Cek apakah modul berasal dari direktori node_modules
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				}
			}
		},
	},
});
