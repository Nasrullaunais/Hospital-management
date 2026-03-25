# Hospital Management — Backend Server

Express 5 + MongoDB REST API built with TypeScript, powered by Bun.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- MongoDB (local or Atlas)

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, etc.

# 3. Start dev server (hot-reload)
bun run dev
# → http://localhost:5000
```

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `bun --watch src/index.ts` | Development with hot-reload |
| `start` | `bun src/index.ts` | Production start |
| `build` | `tsc --noEmit` | TypeScript type-check |
| `lint` | `eslint src/` | Lint source files |
| `lint:fix` | `eslint src/ --fix` | Auto-fix lint issues |
| `format` | `prettier --write src/` | Format source files |

## Project Structure

```
src/
├── config/
│   ├── db.ts           # MongoDB connection (retry + graceful shutdown)
│   └── env.ts          # Env validation — import this, never process.env directly
├── modules/
│   ├── auth/           # Member 1 — User auth & patient profile
│   ├── doctors/        # Member 2 — Doctor listings & management
│   ├── appointments/   # Member 3 — Appointment booking
│   ├── records/        # Member 4 — Medical records
│   ├── pharmacy/       # Member 5 — Medicine inventory
│   └── billing/        # Member 6 — Invoices & payments
├── routes/
│   └── index.ts        # Central route aggregator
├── shared/
│   ├── middlewares/
│   │   ├── authMiddleware.ts     # JWT verify + requireRole()
│   │   ├── errorHandler.ts       # Global error handler (register last)
│   │   └── uploadMiddleware.ts   # Multer (disk → S3 in Phase 6)
│   ├── types/
│   │   └── express.d.ts          # Extends Express.Request with req.user
│   └── utils/
│       └── ApiError.ts           # Custom error class with status factories
└── index.ts            # App entry point
```

## Module Architecture

Each feature module follows the same pattern:

```
modules/<feature>/
├── <feature>.model.ts       # Mongoose schema & model
├── <feature>.controller.ts  # Request handlers
├── <feature>.routes.ts      # Express router
├── <feature>.validation.ts  # express-validator chains
└── README.md                # Member docs + API table
```

## Adding a New Route (team guide)

1. Create the files in `src/modules/<your-feature>/` following the pattern above.
2. Export the router from `<feature>.routes.ts`.
3. Import and mount in `src/routes/index.ts`.
4. Use `authMiddleware` + `requireRole()` for protected routes.
5. Wrap controller logic in `try/catch` and throw `ApiError` for controlled responses.

## API Conventions

- Base URL: `/api`
- Success responses: `{ success: true, data: <T>, message?: string }`
- Error responses: `{ success: false, message: string, errors?: [{ field, message }] }`
- JWT token: passed as `Authorization: Bearer <token>` header

## Health Check

```
GET /api/health
→ { status: "ok", timestamp: "..." }
```

## Environment Variables

See `.env.example` for all required and optional variables.

## AWS Deployment

See `src/modules/billing/README.md` for the full AWS deployment guide.

