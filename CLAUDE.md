# Cinema Reservation System

An npm-workspaces monorepo: NestJS + TypeORM + PostgreSQL backend services behind a React + Vite + TypeScript SPA.

---

## Monorepo layout

| Path | What it is |
|---|---|
| [backend-services/identity-service](backend-services/identity-service) | Auth: register / login / refresh / CSRF / lockout (NestJS) |
| `backend-services/cinema-service` | Seats, reservations, realtime, expiry (NestJS) |
| [backend-services/libs/core/sdk](backend-services/libs/core/sdk) | `@cinema/internal-sdk` — logger, env, shared types, identity client |
| [backend-services/libs/core/shared](backend-services/libs/core/shared) | Shared core utilities |
| `frontend-application/cinema-app` | React SPA (Vite + MUI + Zustand + TanStack Query) — *not yet scaffolded* |
| [scripts/](scripts/) | `dev.sh` (local stack), schema init |

**Backend domain layering** (DDD): `domain/entities/` → `<feature>/dao/` → `<feature>/service/` → `<feature>/*.controller.ts`, with `dto/`, `enum/`, `exception/` alongside. Cross-cutting code lives under `src/infrastructure/`.

**Frontend component folder**: each component is its own folder — `index.ts` (barrel) + `<Name>.tsx` + `<Name>.spec.tsx` (views add `<Name>.page.spec.tsx`). Consumers import the folder, never the file.

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
npm run test:cov           # coverage
```

**Frontend** (`frontend-application/cinema-app`, once scaffolded):

```bash
npm run test:unit          # Vitest
npm run test:page          # Playwright page/component
npm run test:e2e           # Playwright e2e
```

---

## Stack reference

- **Backend**: NestJS · TypeORM · PostgreSQL · Jest · class-validator · Zod env · Throttler · helmet · cookie-parser
- **Frontend**: React · Vite · TypeScript · MUI · Zustand · TanStack Query · Vitest · Playwright · react-i18next (Hebrew)
- **Tooling**: ESLint · Prettier · Husky + lint-staged · commitlint (Conventional Commits) · GitHub Actions CI · Node 20

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
