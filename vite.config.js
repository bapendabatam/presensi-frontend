// presensi-frontend/vite.config.js

import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_');
	
	const envForDefine = Object.keys(env).reduce((res, key) => {
		res[`import.meta.env.${key}`] = JSON.stringify(env[key]);
		return res;
	}, {});
	
	const serverConfig = {};
	if (mode === 'dev') {
		serverConfig.host = '0.0.0.0';
		serverConfig.port = 8788;
		serverConfig.https = true;
	}
	
	return {
		root: resolve(__dirname, 'src'),

		plugins: [
			basicSsl()
		],
        
        server: serverConfig,

		define: envForDefine,

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
	};
});
