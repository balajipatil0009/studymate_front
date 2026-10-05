import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The /v1 API is proxied in dev so the browser talks to same-origin
// (no CORS preflight) while the NestJS server runs on :3000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: process.env.API_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
