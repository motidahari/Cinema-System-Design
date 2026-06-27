# Cinema Reservation System

A production-grade cinema seat-reservation web application: an **npm-workspaces monorepo**
of NestJS + TypeORM + PostgreSQL backend services behind a React + Vite + TypeScript SPA,
with realtime seat updates over Socket.io and cookie-based auth (rotating refresh tokens).

---

## Architecture

```
┌──────────┐      ┌─────────────────────────────────────────────┐
│ Browser  │──────│ nginx :80  (reverse proxy + SPA static host) │
└──────────┘      └───────┬───────────────┬─────────────┬────────┘
                          │ /api/v1/auth  │ /api/v1/*   │ /socket.io
                          ▼               ▼             ▼
                 ┌────────────────┐ ┌──────────────────────────┐
                 │ identity-svc   │ │ cinema-service           │
                 │ :3001          │ │ :3002 (HTTP + Socket.io)  │
                 │ auth/JWT/CSRF  │ │ seats/reservations/expiry│
                 └───────┬────────┘ └────────────┬─────────────┘
                         └──────────┬────────────┘
                                    ▼
                            ┌───────────────┐
                            │ PostgreSQL 15 │
                            └───────────────┘
```

| Service | Port | Responsibility |
|---|---|---|
| `cinema-app` | 80 (prod via nginx) · 5173 (dev) | React 18 SPA (MUI · Zustand · TanStack Query) |
| `identity-service` | 3001 | Register / login / refresh / logout / CSRF / lockout |
| `cinema-service` | 3002 | Seats, reservations, realtime broadcasts, expiry cron |
| `nginx` | 80 | Reverse proxy + SPA host |
| `postgres` | 5432 | PostgreSQL 15 |

`@cinema/internal-sdk` (`backend-services/libs/core/sdk`) carries the shared logger, env
detection, domain types, and identity client used by both services.

---

## Prerequisites

- **Node 20+** (`.nvmrc` pins the version)
- **Docker** + Docker Compose v2 (for the one-command run and the Postgres test DB)

---

## Quick start (one command)

```bash
cp .env.example .env          # then set DB_PASSWORD and JWT_SECRET
docker compose up --build
```

The app is served at **http://localhost**. Postgres schemas are created on first boot from
`scripts/init-schemas.sql`, and the 115-seat map is seeded automatically by `cinema-service`.

> `docker-compose.override.yml` is picked up automatically and swaps the frontend to the
> Vite dev server with hot reload for local development.

---

## Local development

Runs the services on the host (ts-node watch + Vite) with Postgres in a Docker container.
Requires Docker running and a populated `.env` — `dev.sh` reads the same file as Docker and
exits if `DB_PASSWORD` is unset.

```bash
cp .env.example .env          # if not already done — set DB_PASSWORD and JWT_SECRET
npm install                   # install all workspaces
npm run dev                   # start the full local stack (scripts/dev.sh)
npm run dev:logs              # tail stack logs
npm run dev:stop              # stop the stack
```

The dev stack listens on **identity-service** http://localhost:3001, **cinema-service**
http://localhost:3002, and the **Vite dev server** http://localhost:5173.

Root scripts run across every workspace:

```bash
npm run lint        # eslint over .ts/.tsx          npm run lint:fix
npm run format      # prettier --write              npm run format:check
npm run typecheck   # tsc --noEmit per workspace
npm run test        # test per workspace
npm run build       # build per workspace
```

---

## Horizontal scaling (optional · ADR-10)

The default run is single-instance and needs no Redis. To run multiple `cinema-service`
replicas, layer the scaling overlay — it adds Redis (Socket.io pub/sub fan-out across
replicas) and scales the service to 3 instances; the expiry cron stays single-runner via
a Postgres advisory lock:

```bash
docker compose -f docker-compose.yml -f docker-compose.scale.yml up --build
```

---

## Testing

| Scope | Command (per backend service) | Notes |
|---|---|---|
| Unit | `npm run test:unit` | Mocked repos (Jest) |
| Integration | `npm run test:integration` | Needs the Postgres test DB |
| API | `npm run test:api` | supertest against the app + DB |
| Coverage | `npm run test:cov` | |

Frontend (`frontend-application/cinema-app`):

```bash
npm run test:unit     # Vitest + @testing-library/react
npm run test:page     # Playwright page tests (network mocked — no live backend)
npm run test:e2e      # Playwright page tests (CI alias)
npm run test:e2e:live # OPTIONAL live smoke against a running stack (see below)
```

**Optional live smoke** — drives a real register → login → reserve → confirm flow against
a running stack (it self-skips if the stack isn't reachable, so it never breaks CI):

```bash
docker compose up --build                       # in one terminal
E2E_BASE_URL=http://localhost \
  npm --workspace cinema-app run test:e2e:live   # in another
```

**Load / contention** — k6 fires N parallel reservers at the same seats and asserts exactly
one winner (ADR-1/ADR-2):

```bash
BASE_URL=http://localhost VUS=50 k6 run scripts/load/reserve-contention.js
```

---

## Continuous integration

`.github/workflows/ci.yml` runs on every PR: **install → lint → typecheck → unit →
integration & API (Postgres service) → E2E & page tests → coverage gate → docker build**.
Dependabot and GitGuardian secret scanning are enabled. Branches merge into `main` only
once CI is green.

---

## Repository layout

```
backend-services/
├── identity-service/     # auth (NestJS)
├── cinema-service/       # seats, reservations, realtime, expiry (NestJS)
└── libs/core/            # @cinema/internal-sdk + shared utilities
frontend-application/
└── cinema-app/           # React 18 + Vite SPA
nginx/                    # reverse-proxy config (prod + dev)
scripts/                  # dev.sh, init-schemas.sql, load/ (k6)
design-packages/          # architecture, API contract, DB, security, tests, roadmap
docker-compose*.yml       # base + dev override + scaling overlay
```

---

## Deliverables checklist

- [x] npm-workspaces monorepo + tooling (ESLint · Prettier · Husky · commitlint)
- [x] GitHub Actions CI with a Postgres service and a coverage gate
- [x] `@cinema/internal-sdk` shared library
- [x] identity-service — cookie auth, rotating refresh tokens, CSRF, brute-force lockout
- [x] cinema-service — seats, atomic reservations, seat-selection rules, realtime, expiry, idempotency
- [x] React SPA — auth + seating map + reservation flow, i18n (English + Hebrew, RTL-ready)
- [x] One-command `docker compose up` for the whole stack
- [x] Optional horizontal-scaling overlay (Redis adapter + replicas) and k6 contention test
- [x] Tests at every layer (unit · integration · API · page · optional live e2e)

---

## Documentation

Full design specs live in [design-packages/](design-packages/): architecture, API contract,
database design, security, test strategy, the decision log (`DECISIONS.md`), and the
implementation roadmap (`ROADMAP.md`).
