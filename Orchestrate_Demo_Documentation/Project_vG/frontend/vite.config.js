/**
 * frontend/vite.config.js
 * * ==============================================================================
 * ARCHITECTURE: BUILD & DEPLOYMENT LAYER (VITE BUNDLER)
 * ==============================================================================
 * * AI AGENT CONTEXT & DIRECTIVES:
 * This configuration controls how the React frontend is compiled and where it 
 * is placed. It is deeply coupled with `Dockerfile` and `backend/src/server.js`.
 * * * CRITICAL DIRECTIVES FOR AGENTS:
 * 1. ALIAS CONFIGURATION: Do NOT remove the `~@ibm` or `~@carbon` aliases. 
 * The Carbon Design System utilizes legacy Webpack-style tilde imports in its SCSS. 
 * Vite cannot resolve these natively. Without these aliases, the UI styling and 
 * component rendering will permanently break.
 * 2. OUTPUT DIRECTORY (`outDir`): The build is injected directly into the backend's 
 * directory (`../backend/public`). Do not change this to `dist` without also 
 * updating the Dockerfile `COPY` command and the Express static route.
 * 3. LOCAL PROXY: The proxy bypasses CORS during local development. Do not modify 
 * this unless the backend port (8080) changes.
 * ==============================================================================
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // AI AGENT NOTE: SCSS Path Resolution Fixes for Carbon UI
  resolve: {
    alias: {
      // Maps Webpack-style imports in Carbon directly to standard node_modules paths
      '~@ibm': '@ibm',
      '~@carbon': '@carbon'
    }
  },
  
  build: {
    // AI AGENT NOTE: Unified Deployment Target
    // Injects compiled HTML/CSS/JS directly into the backend's serving folder, 
    // eliminating the need for a separate NGINX container.
    outDir: '../backend/public',
    emptyOutDir: true,
  },
  
  // AI AGENT NOTE: Local Development Environment configuration
  server: {
    proxy: {
      // Routes frontend API and Auth calls to the locally running Node.js server
      '/api': 'http://localhost:8080',
      '/auth': 'http://localhost:8080'
    }
  }
})
