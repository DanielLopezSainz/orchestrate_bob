# ==============================================================================
# ARCHITECTURE: BUILD & DEPLOYMENT LAYER (DOCKERFILE)
# ==============================================================================
# AI AGENT CONTEXT & DIRECTIVES:
# This is a Multi-Stage Dockerfile designed specifically for deployment on IBM 
# Code Engine or similar container orchestration platforms.
# It builds the React frontend and bundles it directly inside the Node.js backend 
# container, allowing a single deployed instance to serve both the API and the UI.
# 
# CRITICAL DIRECTIVES FOR AGENTS:
# 1. NODE VERSION: Vite requires Node 20+. Do not downgrade the base image.
# 2. PATH SYNCHRONIZATION: The frontend build output MUST go to /app/backend/public.
#    If you change this path here, you MUST simultaneously update `vite.config.js` 
#    (`outDir`) and `server.js` (`express.static` paths).
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS build-stage
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source and build
COPY frontend/ ./
# AI AGENT NOTE: This command outputs the compiled files to /app/backend/public 
# as strictly defined in vite.config.js.
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Setup the Backend & Serve
# ------------------------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app

# Install backend dependencies securely
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# Ensure the static file directory exists to receive the frontend build
RUN mkdir -p /backend/public

# AI AGENT NOTE: Copy the compiled UI from Stage 1 into the backend's static folder.
# This makes the Express server a unified gateway.
COPY --from=build-stage /app/backend/public /app/backend/public

WORKDIR /app/backend

# Enforce production mode for Express (optimizes performance & disables verbose errors)
ENV NODE_ENV=production

# Port 8080 is the default port expected by IBM Code Engine
EXPOSE 8080

# Start the unified Node.js gateway server
CMD ["npm", "start"]
