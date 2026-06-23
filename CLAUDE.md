# Cinema Reservation System — Claude Guidelines

Source of truth: [design-packages/ROADMAP.md](design-packages/ROADMAP.md)

---

## Branch & PR conventions

| Topic | Rule |
|---|---|
| Base branch | `main`. Every feature branch is cut from `main` and merged back via PR. |
| Branch naming | `chore/…`, `ci/…`, `feat/…`, `test/…`, `docs/…` (Conventional Commits style). |
| PR size limit | **≤ 10 files** changed. If a unit naturally exceeds 10, split by layer first (entity → service → controller), then by sub-feature. |
| Commit footer | `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` |
| Merge strategy | Always `--merge`. Never `--squash` or `--rebase`. |
| Tests must pass | **All tests must pass before every `git push`** — unit, integration, API, page, and e2e. Never push a branch with failing tests. |
| CI must pass before merge | **Wait for CI to pass (green) before merging into `main`.** Never merge while CI is running or failing. |

**Split rule**: when a logical unit > 10 files, split by layer (entity/model/dao → service/controller → tests) or by sub-feature (access-token → refresh-token → csrf/lockout).

---

## Pre-implementation read (mandatory)

**Before touching a single file**, read the design docs listed under "Design docs" for that branch in ROADMAP.md. Do **not** read the entire `design-packages/` directory — read only what is listed. Implementation decisions must be derived from the spec, not assumed.

---

## Definition of Done

A branch is done when:
1. `tsc` compiles with no errors.
2. `npm run lint` passes clean.
3. Its own tests pass.
4. It does **not** break previously-merged branches.

---

## Testing (non-negotiable)

- Tests ship **in the same branch** as the code, **always** — even when that pushes the branch past 10 files. Untested code is not done. The 10-file limit is **never** a reason to defer tests.
- **Backend coverage**: every **endpoint** ships an API test (happy path + each documented error); every **DAO** ships an integration test against the real DB; service/domain logic is unit-tested.
- **Frontend coverage**: every **component** has a co-located unit test; every **view** also has a Playwright page test with mocked responses; every store/service/hook has a co-located `.spec`.
- **Component-folder + barrel**: each component is its own folder — `index.ts` (barrel) + `<Name>.tsx` + `<Name>.spec.tsx` (views add `<Name>.page.spec.tsx`). Consumers import the folder, never the file.

---

## Agent legend

Load only the agents listed for the current branch — they carry the skills and context relevant to that layer.

| Code | Agent | When to invoke |
|---|---|---|
| `be-dev` | `backend-developer` | Implementing NestJS entities, services, controllers, modules |
| `fe-dev` | `frontend-developer` | Implementing React components, hooks, stores, services |
| `be-qa` | `backend-qa-tester` | Writing/running unit, integration, or API tests for backend |
| `fe-qa` | `frontend-qa-tester` | Writing/running Vitest unit tests or Playwright page tests |
| `be-rev` | `backend-code-standards-reviewer` | Reviewing any backend code before PR is opened |
| `fe-rev` | `frontend-code-standards-reviewer` | Reviewing any frontend code before PR is opened |
