# Hospital Management System

A full-stack Hospital Management System built with **React Native (Expo)** and **Node.js/Express**, backed by **MongoDB Atlas**, with **AWS** deployment.

---

## Team Assignment

| Member | Phase | Module | Folder |
|--------|-------|--------|--------|
| (Common) | — | Authentication | `server/src/modules/auth/` · `client/shared/context/AuthContext.tsx` |
| Member 1 | Phase 1 | Ward Management | `server/src/modules/departments/` · `server/src/modules/wards/` · `server/src/modules/wardAssignments/` · `server/src/modules/wardMedications/` · `client/features/wards/` · `client/features/wardReceptionist/` |
| Member 2 | Phase 2 | Doctor & Staff Management | `server/src/modules/doctors/` · `client/features/doctors/` |
| Member 3 | Phase 3 | Appointment Booking | `server/src/modules/appointments/` · `client/features/appointments/` |
| Member 4 | Phase 4 | Medical Records & Lab Reports | `server/src/modules/records/` · `client/features/records/` |
| Member 5 | Phase 5 | Pharmacy & Inventory | `server/src/modules/pharmacy/` · `client/features/pharmacy/` |
| Member 6 | Phase 6 | Billing & Deployment | `server/src/modules/billing/` · `client/features/billing/` |

> **Authentication** is a shared/common module used by all members. It provides JWT-based user registration, login, and role-based access control (`patient`, `doctor`, `admin`, `pharmacist`, `receptionist`). Every member integrates auth middleware into their protected routes — see `server/src/shared/middlewares/authMiddleware.ts` and `client/shared/context/AuthContext.tsx`.

---

## Prerequisites

- **[Bun](https://bun.sh/) ≥ 1.1** — package manager & runtime (`curl -fsSL https://bun.sh/install | bash`)
- **Node.js ≥ 18** — required by Expo tooling
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier URI
- **Expo Go** app on your phone, or an Android/iOS emulator

---

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd Hospital-management
```

### 2. Start the Backend

```bash
cd server
bun install
cp .env.example .env          # then fill in your values
bun run dev
```

Server starts at `http://localhost:5000`. Health check: `GET /api/health`

### 3. Start the Mobile App

```bash
cd client
bun install
cp .env.example .env          # then fill in your values
bun start
```

Scan the QR code with **Expo Go**, or press `a` for Android / `i` for iOS emulator.

> **Physical device**: Change `EXPO_PUBLIC_API_URL` in `client/.env` to your machine's local IP address, e.g. `http://192.168.1.x:5000/api`

---

## Project Structure

```
Hospital-management/
├── Docs/
│   └── Project.md          — Full project blueprint & API spec
├── server/                 — Node.js + Express backend (TypeScript)
│   └── src/
│       ├── modules/        — One folder per team member (feature modules)
│       ├── shared/         — Shared middlewares, utils, types
│       ├── config/         — DB connection, env validation
│       └── routes/         — Central route aggregator
└── client/                 — Expo React Native app (TypeScript)
    ├── features/           — One folder per team member (feature screens)
    ├── shared/             — Shared API client, auth context, types
    └── app/                — Expo Router file-based routing
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native, Expo (Expo Router), TypeScript |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB via Mongoose |
| Auth | JWT + Bcrypt |
| File Uploads | Multer (local dev) → AWS S3 (production) |
| Deployment | AWS (EC2/ECS) + MongoDB Atlas |
| Package Manager | **Bun** (all commands must use `bun`, not `npm` or `yarn`) |

---

## Environment Variables

Each package has a `.env.example` file. **Copy it to `.env` and fill in your values before running.**

- `server/.env.example` — backend configuration
- `client/.env.example` — mobile app configuration

> ⚠️ Never commit `.env` files. They are gitignored.

---

## Development Workflow (for all team members)

1. Pick up the `README.md` inside your module folder — it describes your scope, schema, and API endpoints.
2. Implement your Mongoose model, controller, validation, and routes in `server/src/modules/<your-module>/`.
3. Implement your screens and API service calls in `client/features/<your-feature>/`.
4. All modules share the middlewares in `server/src/shared/` — use `authMiddleware` for protected routes and `uploadMiddleware` for file uploads.
5. The Axios client in `client/shared/api/client.ts` automatically attaches the auth token — use it in your service files.

---

## API Conventions

- Base URL: `http://localhost:5000/api`
- All responses follow the shape:
  ```json
  { "success": true, "data": {} }
  { "success": false, "message": "Error description" }
  ```
- Protected routes require `Authorization: Bearer <token>` header (handled automatically by the Axios client in the mobile app).
- File upload endpoints use `multipart/form-data`.

---

## Deployment (Phase 6 — Member 6)

Refer to `server/src/modules/billing/README.md` for the full AWS deployment guide.

Summary:
- **Backend**: AWS EC2 or ECS
- **Database**: MongoDB Atlas (connected via `MONGO_URI`)
- **File Storage**: AWS S3 (switch `uploadMiddleware.ts` from local disk to S3)
- **SSL**: AWS Certificate Manager
- **Secrets**: AWS Systems Manager Parameter Store
