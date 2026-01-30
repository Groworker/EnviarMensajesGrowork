# ============================================
# STAGE 1: Build Frontend (Next.js)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# STAGE 2: Build Backend (NestJS)
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend/ ./

# Build backend
RUN npm run build

# ============================================
# STAGE 3: Production Runtime
# ============================================
FROM node:20-alpine AS production

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Create directories
RUN mkdir -p /app/frontend /app/backend /var/log/supervisor /run/nginx

WORKDIR /app

# ---- Backend ----
COPY --from=backend-builder /app/backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production
COPY --from=backend-builder /app/backend/dist ./dist

# ---- Frontend ----
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static

# ---- Nginx config ----
COPY deploy/nginx.conf /etc/nginx/nginx.conf

# ---- Supervisor config ----
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app /var/log/supervisor /run/nginx /var/lib/nginx

# Expose port (nginx)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/api || exit 1

# Start supervisor (manages nginx, backend, frontend)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
