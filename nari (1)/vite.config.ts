import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const NAV_API_TARGET = process.env.VITE_NAV_API_URL ?? 'http://localhost:8000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173, // Use 5173 (Vite default) — port 3000 is occupied by Multica
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Proxy /nav-api/* â†’ FastAPI backend (avoids CORS in dev)
        '/nav-api': {
          target: NAV_API_TARGET,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/nav-api/, ''),
        },
      },
    },
  };
});
