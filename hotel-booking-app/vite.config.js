import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Keep this - it's good practice for network access
    
    // --- ADD THIS ---
    // This explicitly tells Vite to trust requests from any ngrok free domain
    allowedHosts: ['.ngrok-free.app']
  }
})