# --- Stage 1: Build the Frontend ---
FROM node:20-slim AS build-stage
WORKDIR /app/frontend

# Copy frontend package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source and build (Vite/React)
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Final Production Image ---
FROM node:20-slim
WORKDIR /app

# Install backend dependencies first (better caching)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy backend source code
COPY backend/ ./backend/

# Copy the static frontend build from Stage 1 into the backend's public folder
# Note: Ensure your server.js points to /app/backend/public
COPY --from=build-stage /app/frontend/dist ./backend/public

# Set environment to production
ENV NODE_ENV=production

# Expose the port your server listens on
EXPOSE 8080

# Start the server
CMD ["node", "backend/src/server.js"]