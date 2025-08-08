import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy API routes
      '/api': {
        target: 'http://api:4001',
        changeOrigin: true,
        secure: false,
      },
      // Proxy headlines directly (no /api prefix)
      '/headlines': {
        target: 'http://api:4001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})