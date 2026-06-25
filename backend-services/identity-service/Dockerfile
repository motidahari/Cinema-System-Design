FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY backend-services/identity-service/package.json ./backend-services/identity-service/
COPY backend-services/cinema-service/package.json ./backend-services/cinema-service/
COPY backend-services/libs/core/sdk/package.json ./backend-services/libs/core/sdk/
COPY backend-services/libs/core/shared/package.json ./backend-services/libs/core/shared/
COPY frontend-application/cinema-app/package.json ./frontend-application/cinema-app/
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY backend-services/libs/core/sdk ./backend-services/libs/core/sdk
COPY backend-services/libs/core/shared ./backend-services/libs/core/shared
COPY backend-services/identity-service ./backend-services/identity-service
RUN npm run build --workspace @cinema/internal-sdk
RUN npm run build --workspace @cinema/shared
RUN npm run build --workspace @cinema/identity-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend-services/identity-service/package.json ./backend-services/identity-service/
COPY --from=builder /app/backend-services/cinema-service/package.json ./backend-services/cinema-service/
COPY --from=builder /app/backend-services/libs/core/sdk/package.json ./backend-services/libs/core/sdk/
COPY --from=builder /app/backend-services/libs/core/shared/package.json ./backend-services/libs/core/shared/
COPY --from=builder /app/frontend-application/cinema-app/package.json ./frontend-application/cinema-app/
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/backend-services/identity-service/dist ./backend-services/identity-service/dist
COPY --from=builder /app/backend-services/libs/core/sdk/dist ./backend-services/libs/core/sdk/dist
COPY --from=builder /app/backend-services/libs/core/shared/dist ./backend-services/libs/core/shared/dist
EXPOSE 3001
CMD ["node", "backend-services/identity-service/dist/main.js"]
