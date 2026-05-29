import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/rack3d/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3002,
    proxy: {
      '/api': { target: 'http://api:3001', changeOrigin: true },
    },
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
