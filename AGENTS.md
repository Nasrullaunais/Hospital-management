# AGENTS.md — Hospital Management System

/caveman full
talk like caveman to save tokens

## Package manager: Bun (mandatory)

All commands use `bun`, never `npm` or `yarn`. Lockfile is `bun.lock` (per package, not root).

```bash
cd server && bun install && bun run dev      # backend starts on :5000
cd client && bun install && bun start         # expo starts on :8082
```

Do **not** add a root-level workspace — `server/` and `client/` are independent packages. Root `package.json` only has playwright.

## Architecture at a glance

| | Server | Client |
|---|---|---|
| Framework | Express 5 + TypeScript (ESM) | Expo SDK 55 (Expo Router) + TypeScript |
| Runtime | Bun (runs TS directly, `noEmit: true`) | Metro bundler via Expo |
| Port | 5000 | 8082 |

**Server**: `src/modules/<feature>/` each contain `{name}.model.ts`, `{name}.controller.ts`, `{name}.routes.ts`, `{name}.validation.ts`. Routes are aggregated in `src/routes/index.ts` — every new module route must be registered there.

**Client**: Expo Router file-based routing in `app/`. Role-based route groups: `(admin)/`, `(doctor)/`, `(patient)/`, `(pharmacist)/`, `(receptionist)/`. Feature screens in `features/<feature>/`.

## Commands

### Server

```bash
bun run dev          # watch mode (bun --watch)
bun run start        # no watch
bun run build        # tsc type-check only (noEmit)
bun run lint         # eslint src/
bun run lint:fix
bun run format       # prettier --write src/
```

### Client

```bash
bun start            # expo start --port 8082
bun run dev          # expo start --dev-client --port 8082
bun run android      # expo start --android --port 8082
bun run ios          # expo start --ios --port 8082
```

## Testing

### Server: Bun test runner

```bash
bun run test                     # all tests (NODE_ENV=test)
bun run test:doctors             # single integration test file
```

Tests use `bun:test` (`describe`/`expect`/`test`), **not** jest or vitest. Vitest is a devDependency but unused — Bun's built-in runner is the real test framework.

Test helper at `server/src/tests/testHelper.ts` attaches factory functions to `globalThis.testHelper`.

Integration tests create per-run MongoDB databases (appending timestamp to DB name) and spin up Express via `supertest`. Set `setDefaultTimeout(20_000)` for DB spin-up.

### Client: Jest + Playwright

```bash
bun run test:ui                  # jest --runInBand
bun run test:ui:watch            # jest --watch
npx playwright test              # E2E tests (e2e/)
```

Jest uses `jest-expo` preset. Playwright config spawns `bun run start` as webServer on port 8082.

## Environment

### Server `.env` (required vars: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`)

`server/src/config/env.ts` validates all required env vars at startup and crashes if missing. **Always import `env` from `config/env.ts`**, never use `process.env` directly.

AWS S3 vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`) are optional in dev, required in production.

### Client `.env`

Set `EXPO_PUBLIC_API_URL` to the backend URL. For physical devices, use the machine's local IP (e.g. `http://192.168.1.x:5000/api`).

## Docker

```bash
docker compose up -d    # starts MongoDB + API server
```

Server hot-reloads via volume mount (`./server/src:/app/server/src`). The Dockerfile installs Chromium for Puppeteer. `client/` is excluded from Docker builds.

## Critical patterns agents will get wrong

### Imports are ESM with `.js` extensions

Server uses `"type": "module"` and `verbatimModuleSyntax: true`. All relative imports must use `.js` extension:

```typescript
import { authMiddleware } from '../../shared/middlewares/authMiddleware.js';  // correct
import { authMiddleware } from '../../shared/middlewares/authMiddleware';     // WRONG - ESM resolution fails
```

### API response shape

```typescript
{ success: true, data: {} }
{ success: false, message: "Error description" }
```

### Error handling

- Use `ApiError` from `shared/utils/ApiError.ts`: `ApiError.unauthorized()`, `ApiError.notFound()`, `ApiError.badRequest()`, `ApiError.forbidden()`, `ApiError.internal()`, `ApiError.conflict()`
- The global `errorHandler.ts` middleware catches Mongoose validation, cast, and duplicate key errors automatically

### Auth middleware pattern

```typescript
router.get('/', authMiddleware, requireRole(ROLES.ADMIN), handler);
```

`ROLES` constants from `shared/constants/roles.ts`. `authMiddleware` populates `req.user` with `{ id, email, role }`.

### Client API calls

Use `apiClient` from `client/shared/api/client.ts`. It auto-attaches JWT from secure storage, handles 401 by clearing session, shows toast errors, and has built-in retry via `apiRequest()`. Do not use raw `fetch` or bare `axios`.

### Logging

Server uses `pino` via `shared/utils/logger.ts`. Logger auto-redacts `authorization`, `token`, `password` fields. Use structured logging: `logger.info({ event: 'thing_happened', ...data }, 'message')`.

### Module registration

When adding a new server module, update `server/src/routes/index.ts` to register the route. Without this step, the module's endpoints won't exist.

## References

- Full API spec & schema: `Docs/Project.md`
- Copilot instructions (bigger context): `copilot-instructions.md`
- Module READMEs per feature in `server/src/modules/*/README.md` and `client/features/*/README.md`
