# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY frontend-application/cinema-app/package.json ./frontend-application/cinema-app/
# Deterministic install from the lock file — keeps CI reproducible and pins a
# single vite version (avoids vitest pulling a rolldown-based vite 7/8).
RUN npm ci --legacy-peer-deps
COPY frontend-application/cinema-app ./frontend-application/cinema-app
# Build-time API base URLs point at the nginx gateway (same origin → relative)
ENV VITE_IDENTITY_API_URL=/api/v1
ENV VITE_CINEMA_API_URL=/api/v1
ENV VITE_SOCKET_URL=/
RUN npm run build --workspace cinema-app

# ---- runtime ----
FROM nginx:1.27-alpine AS runtime
COPY frontend-application/cinema-app/nginx.spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend-application/cinema-app/dist /usr/share/nginx/html
EXPOSE 80
