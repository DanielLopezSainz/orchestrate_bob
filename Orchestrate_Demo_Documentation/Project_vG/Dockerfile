# ==========================================
# STAGE 1: Build the React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source code and build it
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Setup the Express Backend
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy backend source code
COPY backend/src ./backend/src

# Copy the compiled React files from Stage 1 into the backend's 'public' directory
COPY --from=frontend-builder /app/frontend/dist ./backend/public

# Set standard environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the Node.js server
CMD ["node", "backend/src/server.js"]