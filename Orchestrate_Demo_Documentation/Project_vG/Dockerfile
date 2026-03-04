FROM node:18-alpine AS build-stage
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine
WORKDIR /app
# Install backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# FORCE CLEAN: Ensure the public folder is empty before copying new build
RUN rm -rf /app/backend/public && mkdir -p /app/backend/public

# Copy FROM the frontend WORKDIR to the backend public folder
COPY --from=build-stage /app/backend/public /app/backend/public

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
