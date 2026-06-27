# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Cinema Reservation System

An npm-workspaces monorepo: NestJS + TypeORM + PostgreSQL backend services behind a React + Vite + TypeScript SPA.

---

## Monorepo layout

| Path | What it is |
|---|---|
| [backend-services/identity-service](backend-services/identity-service) | Auth: register / login / refresh / CSRF / lockout (NestJS, port 3001) |
| [backend-services/cinema-service](backend-services/cinema-service) | Seats, reservations, realtime, expiry (NestJS, port 3002) |
| [backend-services/libs/core/sdk](backend-services/libs/core/sdk) | `@cinema/internal-sdk` — logger, env, shared types, identity client, `BaseDao`, `TransactionManager`, `BaseCronJob` |
| [backend-services/libs/core/shared](backend-services/libs/core/shared) | `@cinema/shared` — `Logger`, validators (`isValidUuid`, `isValidDate`, `isValidEnum`), `ValidationException` |
| [frontend-application/cinema-app](frontend-application/cinema-app) | React SPA (Vite + MUI + Zustand + TanStack Query) |
| [scripts/](scripts/) | `dev.sh` (local stack), `init-schemas.sql`, k6 load script |

---

## Commands

**Root** (runs across all workspaces):

```bash
npm run lint            # eslint over .ts/.tsx        npm run lint:fix
npm run format          # prettier --write            npm run format:check
npm run typecheck       # tsc --noEmit per workspace
npm run test            # test per workspace
npm run build           # build per workspace
npm run dev             # local stack (scripts/dev.sh) · dev:stop · dev:logs
```

**Per backend service** (run inside the service directory):

```bash
npm run start:dev          # ts-node watch
npm run build / typecheck  # tsc / tsc --noEmit
npm run test:unit          # Jest unit (mocked repos)
npm run test:integration   # Jest integration — needs PostgreSQL test DB
npm run test:api           # Jest API via supertest — needs PostgreSQL test DB
npm run test:cov           # coverage (lines + functions ≥ 80%)
```

Run a single test file:

```bash
# from inside the service directory:
npx jest --config jest.config.js tests/unit/reservations.service.spec.ts
```

**Frontend** (`frontend-application/cinema-app`):

```bash
npm run test:unit          # Vitest
npm run test:page          # Playwright page/component (network-mocked, no live backend)
npm run test:e2e           # Playwright e2e (CI alias)
npm run test:e2e:live      # Live smoke against a running stack (self-skips if stack down)
```

---

## Stack reference

- **Backend**: NestJS · TypeORM · PostgreSQL · Jest · class-validator · Zod env · Throttler · helmet · cookie-parser
- **Frontend**: React 18 · Vite · TypeScript · MUI · Zustand · TanStack Query · Vitest · Playwright · react-i18next (English + Hebrew)
- **Tooling**: ESLint · Prettier · Husky + lint-staged · commitlint (Conventional Commits) · GitHub Actions CI · Node 20

---

## Architecture

```
Browser (React SPA)
    │  REST (axios)   →  nginx :80  →  identity-service :3001
    │  REST (axios)   →  nginx :80  →  cinema-service   :3002
    │  Socket.io      →  nginx :80  →  cinema-service   :3002
    └──────────────────────── Both services → PostgreSQL :5432
```

**nginx routing**: `/api/v1/auth/*` → identity-service · `/api/v1/seats*` + `/api/v1/reservations*` → cinema-service · `/socket.io/*` → cinema-service · `/` → cinema-app.

**DB schemas**: identity-service owns `identity` schema (`users`, `refresh_tokens`, `login_attempts`). Cinema-service owns `cinema` schema (`seats`, `reservations`, `reservation_seats`, `idempotency_keys`). The `reservations.user_id → identity.users.id` reference is a soft FK (validated via `IdentityClient`, no DB-level constraint).

---

## Backend domain layering (DDD)

Each feature follows: `domain/entities/` → `<feature>/dao/` → `<feature>/service/` → `<feature>/*.controller.ts`, with `dto/`, `enum/`, `exception/`, and optionally `domain-model/` alongside. Cross-cutting code lives under `src/infrastructure/`.

**Domain model pattern** — every DAO bridges entities and domain models:
- `BaseDao<TEntity, TDomain>` (from `@cinema/internal-sdk`) defines `toDomain()` and `toEntity()` abstract methods.
- Domain models (`SeatModel`, `ReservationModel`) hold validated private fields with getter/setter pairs that throw `ValidationException` on bad input. They expose `toJSON()` — **controllers return `toJSON()` directly, never a response DTO class**.
- DAO `findBy*` methods return `null` when not found; `getBy*` methods throw a domain exception.

**`@cinema/internal-sdk` key exports**: `IdentityClient`, `TransactionManager`, `BaseDao`, `BaseCronJob`, `SeatStatus`, `ReservationStatus`, and shared domain types (`UserProfile`, `Seat`, `Reservation`).

**`@cinema/shared` key exports**: `Logger`, `BaseDao`, `SortOrder`, validators (`isValidUuid`, `isValidDate`, `isValidEnum`), `ValidationException`.

---

## Key business rules

- **No double-booking**: `SeatDao.lockForUpdate(seatIds)` issues `SELECT … FOR UPDATE` (`pessimistic_write`). Concurrent requests block, re-read `RESERVED` status, and fail `409`. A partial unique index `reservation_seats(seat_id) WHERE is_active` is the DB-level backstop.
- **Seat-selection rules**: seats must be in the same row, consecutive (no gap), and selecting them must not leave a single isolated seat at either boundary.
- **One active reservation per user**: a user with an existing `PENDING` reservation gets `409` on a second reserve attempt.
- **Expiry**: a `@Cron('* * * * *')` task expires `PENDING` reservations older than 15 minutes → seats back to `AVAILABLE` → emits `seat:released` via Socket.io.
- **Idempotency**: `POST /api/v1/reservations` accepts an `Idempotency-Key` header; duplicate keys within TTL return the cached response.

---

## Auth model

Tokens are **httpOnly cookies** — never `localStorage`. Three cookies are set on login/register:

| Cookie | Contents | Path |
|---|---|---|
| `access_token` | JWT (15 min) | `/` |
| `refresh_token` | opaque (7 days, rotating, sha256-hashed in DB) | `/api/v1/auth` |
| `csrf_token` | readable random | `/` |

**CSRF**: every mutating request (`POST`/`PUT`/`PATCH`/`DELETE`) must echo `csrf_token` in the `X-CSRF-Token` header — identity and cinema services both enforce this via `CsrfGuard`.

Cinema-service authenticates via `RemoteAuthGuard` → calls `GET /api/v1/auth/validate` on identity-service (forwarding the cookie) → sets `req.user`. Socket.io auth uses the same cookie via a WS handshake middleware.

---

## Real-time (Socket.io)

Cinema-service hosts the gateway at `namespace: '/'`. Events:

| Event | Emitted when |
|---|---|
| `seat:reserved` | A reservation is created (`PENDING`) |
| `seat:booked` | A reservation is confirmed (`CONFIRMED`) |
| `seat:released` | The expiry cron marks seats `AVAILABLE` again |

The React app connects with `withCredentials: true` (cookie transport). `useSocket` hook subscribes and updates the Zustand cinema store.

---

## Frontend structure

```
src/
├── core/          # Router, guards (RequireAuth), config, base HTTP service
├── features/
│   ├── auth/      # components/, hooks/, services/, stores/, views/
│   └── cinema/    # components/, hooks/, models/, services/, stores/, views/
├── shared/        # Reusable components (Button, Input, Toast), hooks, layouts, stores
├── locales/       # i18n JSON (English + Hebrew)
└── styles/        # Global SCSS
```

**Frontend component folder**: each component is its own folder — `index.ts` (barrel) + `<Name>.tsx` + `<Name>.spec.tsx` (views add `<Name>.page.spec.tsx`). Consumers import the folder, never the file directly.

**Frontend domain models**: `features/cinema/models/` contains `Seat.ts` and `Reservation.ts` — plain classes that hydrate raw API responses. Services return instances of these models, never raw DTOs. Store actions and the service methods they call share the same name and take a DTO argument.

---

## Agents

Load **only** the agents relevant to the layer you're working in. Each agent carries its own layer's conventions, quality gate, and coverage rules — they load only when that agent runs, so this file stays thin.

| Agent | Layer |
|---|---|
| `backend-developer` | NestJS entities / services / controllers / modules |
| `frontend-developer` | React components / hooks / stores / services |
| `backend-qa-tester` | backend unit / integration / API tests |
| `frontend-qa-tester` | Vitest + Playwright tests |
| `backend-code-standards-reviewer` | backend review before PR |
| `frontend-code-standards-reviewer` | frontend review before PR |
