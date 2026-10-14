import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev, call the local API through the same origin (no CORS setup needed).
    proxy: { '/api': 'http://localhost:4000' },
  },
})
