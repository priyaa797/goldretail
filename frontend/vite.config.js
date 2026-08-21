import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/assets/goldretail/frontend/',
  build: {
    outDir: '../goldretail/public/frontend',
    emptyOutDir: true,
  },
  server: {
    port: 8080,
    proxy: {
      '^/(api|assets|files)': {
        target: 'http://newgoldmfg.com:8000',
        changeOrigin: true,
      },
    },
  },
})
