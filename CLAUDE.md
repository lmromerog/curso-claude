# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Resttek is a restaurant management platform: an npm-workspaces monorepo (`packages/*`) with one Node/Express API and three Angular apps plus a shared Angular library. Not a git repo. Documentation (in Spanish) lives in `docs/` (`arquitectura/`, `dominio/`, `revisiones/`); `docs/arquitectura/arquitectura-api.md` and `arquitectura-frontend.md` are the detailed references.

| Package | What it is | Port |
| --- | --- | --- |
| `api` (`@resttek/api`) | Express 5 + TypeScript (ESM), SQLite | 3000 |
| `web-admin` | Angular: admin/manager CRUD (restaurants, dishes, ingredients, employees) | 4200 |
| `web-empleados` | Angular: kitchen (`/cocina`), bar (`/barra`), floor (`/salon`) order flow | 4201 |
| `web-clientes` | Angular: customer menu, cart, orders | 4202 |
| `web-shared` | Angular library with no build step (`"main": "src/index.ts"`): auth service/store/guard, interceptors, login/register, base styles | – |

## Commands

Run from the repo root (Node 22+):

```bash
npm install                 # one install for all workspaces
npm run seed                # idempotent (INSERT OR IGNORE); password of every seeded user == its email
npm run dev:api             # tsx watch src/server.ts; GET /health -> {"status":"ok"}
npm run dev:admin           # also dev:empleados, dev:clientes (ng serve with proxy /api -> localhost:3000)
npm test                    # vitest run, API only
```

Single test / watch (frontends have no tests):

```bash
cd packages/api
npx vitest run src/services/order.service.test.ts
npx vitest run -t "test name"
npm run test:watch
```

Frontend production build: `npm run build -w @resttek/web-admin` (no lint script exists anywhere). There is no `.env`; only `PORT`, `JWT_SECRET` and `NODE_ENV` are read.

Changes to `web-shared` are not picked up by a running `ng serve`; restart the dev server.

`npm install` does not run install scripts for `bcrypt`/`sqlite3` by default in this setup (npm warns); if the API fails to load a native module, approve them with `npm install-scripts approve <pkg>`.

## API architecture (`packages/api/src`)

Routes are mounted in `app.ts` under `/api/v1`. Two architectural styles coexist:

- **`contexts/employee` is hexagonal/DDD**: `domain/` (`Employee` entity with private constructor + `create()`, `Email`/`Role` value objects, `IEmployeeRepository`/`IAuthService` ports), `application/` (`LoginUseCase`, `CreateEmployeeUseCase`, `RegisterClientUseCase`), `infrastructure/` (`SqliteEmployeeRepository`, `BcryptAuthService`, HTTP routes). Dependencies are wired manually in `dependencies.ts`. Shared error types (`AppError`, `DomainErrors`) and `errorHandler` live in `contexts/shared`.
- **Everything else is layered**: `routes → controllers → services → repositories → models` (restaurants, ingredients, dishes, orders). Enum validation goes through `normalizeIngredientUnit`, `normalizeDishCategory`, `normalizeOrderStatus`, which throw domain errors.

Path aliases (tsconfig + `vite-tsconfig-paths` for vitest): `@config`, `@errors`, `@shared` (→ `contexts/shared`), `@employee` (→ `contexts/employee`), `@routes`, `@controllers`, `@services`, `@repositories`, `@models`, `@scripts`. Imports use `.js` extensions (nodenext). tsconfig is very strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).

Things that are easy to get wrong:

- **Clients are rows in `employees`** with role `cliente`. Roles: `admin`, `manager`, `camarero`, `cocinero`, `cliente`. JWT payload is `{id, role, restaurantId}` (8h).
- **Order items**: each `order_items` row has quantity 1; `OrderService.create` expands a requested `quantity` into N rows. Status flow: `pendiente → preparando → listo → entregado`. An order is "active" until all items are delivered.
- **DB**: SQLite file `packages/api/resttek.db`, or `:memory:` when `NODE_ENV=test`. Tables are created on startup via `CREATE TABLE IF NOT EXISTS`; there are no migrations, so schema changes need manual handling of the existing `.db` file. `PRAGMA foreign_keys = ON`.
- **Auth**: `authenticate` (Bearer JWT) and `authorize(roles)` middlewares. Order endpoints only require authentication (no role/restaurant checks), and `OrderController` has its own try/catch instead of using `errorHandler`. These are known gaps listed in `docs/revisiones/`.
- **Tests** (Vitest, `globals: true`) are unit tests colocated with sources, using in-memory SQLite and hand-written doubles in `repositories/mocks/` and `application/mocks/`. `supertest` is installed but there are no HTTP integration tests.

## Frontend architecture

All Angular 21, standalone components, signals, lazy `loadComponent` routes, RxJS 7.8. `environment.apiUrl` is `/api/v1`, injected via `API_URL` from `web-shared`; each app's `proxy.conf.json` forwards `/api` to the API.

- `web-admin` and `web-empleados` are organized per feature (`models/`, `services/`, `store/`, `pages/`) with signal-based Stores. `web-empleados`' `OrderStore` polls `GET /orders/active` every 30 s.
- `web-clientes` components call services directly with `.subscribe()`; only `CartStore` exists and it is local-only (no HTTP). It has its own `package-lock.json`.
- Routes in `web-empleados` are guarded by `authGuard` but **not by role**; the shell only hides links.
- Design-system styles are duplicated across the three apps (documented as known).

## Scripts

`scripts/seed-issues.sh` + `scripts/issues.json` create GitHub issues via `gh` and `jq` (labels `type` and `proyecto:<x>`); `issues.json` is also the best list of known bugs.
