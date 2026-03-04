# Stage 1: Build the Frontend (Using Node 20 for Vite 7 compatibility)
FROM node:20-alpine AS build-stage
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the Backend
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# Ensure the public folder is ready
RUN mkdir -p /backend/public

# Copy the build output from the correct path defined in vite.config.js
# Since Vite puts them in ../backend/public relative to frontend/
COPY --from=build-stage /app/backend/public /app/backend/public

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
