import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs separately on :4000; in production the server serves this build itself.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
