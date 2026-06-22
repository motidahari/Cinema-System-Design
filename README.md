# Cinema Reservation System

A production-grade cinema seat reservation web application.

## Structure

```
Cinema-System-Design/
├── backend-services/
│   ├── identity-service/     # NestJS auth service (port 3001)
│   ├── cinema-service/       # NestJS cinema service (port 3002)
│   └── libs/core/sdk/        # @cinema/internal-sdk
├── frontend-application/
│   └── cinema-app/           # React 18 + Vite SPA
├── nginx/                    # Reverse proxy config
├── scripts/                  # DB init scripts
└── design-packages/          # Architecture & design docs
```

## Quick Start

```bash
# Requires Node 20+ and Docker
cp .env.example .env
docker compose up --build
```

The app will be available at `http://localhost`.

## Services

| Service | Port | Description |
|---|---|---|
| cinema-app | 5173 (dev) | React SPA |
| identity-service | 3001 | Auth, JWT, cookies |
| cinema-service | 3002 | Seats, reservations, Socket.io |
| nginx | 80 | Reverse proxy |
| postgres | 5432 | PostgreSQL 15 |

## Documentation

See [design-packages/](design-packages/) for full architecture and design docs.
