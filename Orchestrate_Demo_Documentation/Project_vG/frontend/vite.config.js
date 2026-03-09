import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // This tells Vite to resolve Webpack-style "~" imports to node_modules
      { find: /^~(.+)/, replacement: '$1' }
    ]
  },
  build: {
    // This tells Vite to put the final GUI files in the backend's public folder
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
