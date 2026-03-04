# Stage 1: Build the Frontend
FROM node:18-alpine AS build-stage
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# This command creates the files in ../backend/public because of your vite.config.js
RUN npm run build

# Stage 2: Setup the Backend
FROM node:18-alpine
WORKDIR /app
# Copy backend package files and install
COPY backend/package*.json ./backend/
RUN cd backend && npm install
# Copy backend source code
COPY backend/ ./backend/

# --- THE FIX IS HERE ---
# Instead of looking for /frontend/dist, we grab from where Vite actually put them
COPY --from=build-stage /app/backend/public ./backend/public

# Set working directory to the backend for the start command
WORKDIR /app/backend
EXPOSE 8080

# Ensure we are in production mode
ENV NODE_ENV=production

CMD ["npm", "start"]
