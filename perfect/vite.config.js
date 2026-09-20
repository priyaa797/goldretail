import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
import proxyOptions from './proxyOptions.js';
import fs from "fs/promises"; // using promises for await fs.readFile
import svgr from "vite-plugin-svgr";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react({
			include: /\.(jsx|js|tsx|ts)$/,
		}),
		svgr()
	],
	server: {
		port: 8080,
		host: '0.0.0.0',
		proxy: proxyOptions
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'src': path.resolve(__dirname, 'src')
		}
	},
	build: {
		outDir: '../goldretail/public/perfect',
		emptyOutDir: true,
		target: 'es2015',
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'index.html')
			}
		}
	},
});
