import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This tells Vite to put the final GUI files in the backend's public folder
    // Adjust this path if your 'backend' folder is at a different relative level
    outDir: '../backend/public',
    emptyOutDir: true,
  },
  server: {
    // This is for local development only
    proxy: {
      '/api': 'http://localhost:8080',
      '/auth': 'http://localhost:8080'
    }
  }
})
