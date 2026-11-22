import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config. The dev server runs on http://localhost:5173 by default,
// which matches the backend's CORS_ORIGIN.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
