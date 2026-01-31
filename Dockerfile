# Force rebuild: 2026-01-31-v2-fix-api-url
# ============================================
# STAGE 1: Build Backend (NestJS)
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /build

# Copy backend package files
COPY backend/package*.json ./

# Install ALL dependencies (needed for build)
RUN npm ci

# Copy backend source
COPY backend/ ./

# Build backend
RUN npm run build

# Verify build output exists
RUN ls -la dist/src/ && ls -la dist/src/main.js

# ============================================
# STAGE 2: Build Frontend (Next.js)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Verify build output exists
RUN ls -la .next/standalone/

# ============================================
# STAGE 3: Production Runtime
# ============================================
FROM node:20-alpine AS production

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Create directories
RUN mkdir -p /app/backend /app/frontend /var/log/supervisor /run/nginx

# ---- Backend Setup ----
WORKDIR /app/backend

# Copy package files and install production deps
COPY --from=backend-builder /build/package*.json ./
RUN npm ci --only=production

# Copy compiled backend
COPY --from=backend-builder /build/dist ./dist

# Verify backend files
RUN ls -la dist/

# ---- Frontend Setup ----
WORKDIR /app/frontend

# Copy frontend standalone build
COPY --from=frontend-builder /build/.next/standalone ./
COPY --from=frontend-builder /build/.next/static ./.next/static
COPY --from=frontend-builder /build/public ./public

# ---- Config files ----
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port (EasyPanel expects 3000)
EXPOSE 3000

# Disable Docker healthcheck - let EasyPanel manage it
HEALTHCHECK NONE

WORKDIR /app

# Start supervisor (runs as root to manage processes)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
