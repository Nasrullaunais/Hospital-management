# Hospital Management System — Agent Guide

USE MGREP instead of GREP.

## Project Layout

- `client/` — Expo React Native app (TypeScript), Expo Router file-based routing in `app/`
- `server/` — Express/TypeScript backend (TypeScript), modular in `src/modules/`

Each has its own `package.json` and `.env`. Run them from their respective directories.

## Package Manager

**Bun is mandatory.** Use `bun install`, `bun run <script>`. Never `npm` or `yarn`.

## Dev Commands

### Server (`server/`)
```bash
bun run dev      # watch mode, port 5000
bun run build   # TypeScript compile
bun run test    # all tests
bun run test:doctors   # single module test
bun run lint
bun run lint:fix
bun run format
```

### Client (`client/`)
```bash
bun start        # Expo dev server, port 8082
bun run dev      # Expo dev with dev-client
```

## API

- Base: `http://localhost:5000/api`
- Health: `GET /api/health`
- All responses: `{ success: true, data?: {...} }` or `{ success: false, message: string }`
- Protected routes require `Authorization: Bearer <token>` header

## Frontend API Client

Use the pre-configured Axios client — do not instantiate raw axios:
```ts
import { apiClient } from '@/shared/api/client';
```
Auth token is auto-attached via AsyncStorage interceptor. Auth token key: `@hospital_auth_token`.

## Routes

### Backend modules
| Route | Module |
|-------|--------|
| `/api/auth/*` | Auth |
| `/api/doctors/*` | Doctors |
| `/api/appointments/*` | Appointments |
| `/api/records/*` | Medical Records |
| `/api/medicines/*` | Pharmacy |
| `/api/invoices/*` | Billing |
| `/api/dispense/*` | Dispensing |

### Frontend route groups (Expo Router)
- `app/(admin)/` — Admin pages
- `app/(doctor)/` — Doctor pages
- `app/(patient)/` — Patient pages
- `app/(pharmacist)/` — Pharmacist pages
- `app/(tabs)/` — Shared tab navigation
- `app/admin/` — Hardcoded admin routes (separate from `(admin)/`)

## Physical Device Testing

Set `EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000/api` in `client/.env` (e.g. `http://192.168.1.42:5000/api`). Do not use `localhost`.

## Key Files

- `client/shared/api/client.ts` — Axios instance with auth interceptor
- `client/shared/constants/Config.ts` — API URL config
- `server/src/shared/middlewares/authMiddleware.ts` — JWT verification
- `server/src/routes/index.ts` — Route aggregator
- `server/src/index.ts` — Server entry point

## Important Notes

- Express 5 is used (note any API differences from Express 4)
- MongoDB via Mongoose; use `mongodb-memory-server` for tests
- Feature modules follow MVC: `*.model.ts`, `*.controller.ts`, `*.routes.ts`
- Client uses React 19.2 / RN 0.83.2 with Expo 55
- Both `.env` files are gitignored; use `.env.example` as template
