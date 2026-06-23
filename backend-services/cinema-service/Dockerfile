FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY backend-services/libs/core/sdk/package.json ./backend-services/libs/core/sdk/
COPY backend-services/libs/core/shared/package.json ./backend-services/libs/core/shared/
COPY backend-services/cinema-service/package.json ./backend-services/cinema-service/
RUN npm ci --workspace @cinema/cinema-service --workspace @cinema/internal-sdk --workspace @cinema/shared --ignore-scripts
COPY tsconfig.base.json ./
COPY backend-services/libs/core/sdk ./backend-services/libs/core/sdk
COPY backend-services/libs/core/shared ./backend-services/libs/core/shared
COPY backend-services/cinema-service ./backend-services/cinema-service
RUN npm run build --workspace @cinema/internal-sdk
RUN npm run build --workspace @cinema/shared
RUN npm run build --workspace @cinema/cinema-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend-services/cinema-service/package.json ./backend-services/cinema-service/
COPY --from=builder /app/backend-services/libs/core/sdk/package.json ./backend-services/libs/core/sdk/
COPY --from=builder /app/backend-services/libs/core/shared/package.json ./backend-services/libs/core/shared/
RUN npm ci --workspace @cinema/cinema-service --workspace @cinema/internal-sdk --workspace @cinema/shared --omit=dev --ignore-scripts
COPY --from=builder /app/backend-services/cinema-service/dist ./backend-services/cinema-service/dist
COPY --from=builder /app/backend-services/libs/core/sdk/dist ./backend-services/libs/core/sdk/dist
COPY --from=builder /app/backend-services/libs/core/shared/dist ./backend-services/libs/core/shared/dist
EXPOSE 3002
CMD ["node", "backend-services/cinema-service/dist/main.js"]
