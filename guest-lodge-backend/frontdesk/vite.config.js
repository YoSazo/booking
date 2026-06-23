import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  root: __dirname,
  base: '/frontdesk/',
  build: {
    outDir: path.resolve(__dirname, '../public/frontdesk'),
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.endsWith('settings.js')) return 'settings';
          if (id.endsWith('apps.js')) return 'apps';
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3001',
      '/frontdesk-sw.js': 'http://localhost:3001',
      '/manifest-simple-crm.json': 'http://localhost:3001',
    },
  },
}));
