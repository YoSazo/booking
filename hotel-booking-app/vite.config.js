// In hotel-booking-app/vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- ADD THIS ENTIRE 'server' BLOCK ---
  server: {
    proxy: {
      '/api': {
        target: 'https://www.myhomeplacesuites.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})