import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The study server (tutor, uploads, chat) runs alongside on port 8787; /api/* is forwarded to it.
const api = { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: api },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: api }
});
