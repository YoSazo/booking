import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    target: 'es2020',
  },
  esbuild: {
    // Strip all console.* and debugger statements in production builds
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    host: true,
    allowedHosts: ['.ngrok-free.app']
  }
}))