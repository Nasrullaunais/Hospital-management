# Hospital Management — Mobile App

Expo + React Native mobile app with TypeScript and Expo Router.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- [Node.js](https://nodejs.org) ≥ 18 (required by Expo tooling)
- iOS Simulator (macOS) or Android emulator, **or** the [Expo Go](https://expo.dev/go) app on a physical device

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# For physical device: set EXPO_PUBLIC_API_URL to your machine's local IP, e.g.
# EXPO_PUBLIC_API_URL=http://192.168.1.42:5000/api

# 3. Start the development server
bun run start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan the QR code with Expo Go on your phone

## Available Scripts

| Script | Description |
|---|---|
| `bun run start` | Start Expo dev server |
| `bun run android` | Start on Android emulator |
| `bun run ios` | Start on iOS simulator |
| `bun run web` | Start in browser |
| `bun run lint` | Run ESLint |
| `bun run reset-project` | Reset to blank Expo project |

## Project Structure

```
app/                      # Expo Router — file-based routing
├── (tabs)/               # Bottom tab navigation screens
│   ├── index.tsx         # Home / Dashboard
│   ├── explore.tsx       # Explore tab (replace with feature screens)
│   └── _layout.tsx       # Tab bar layout config
└── _layout.tsx           # Root layout (wrap providers here)

shared/                   # Shared code for all members
├── api/
│   ├── client.ts         # Axios instance + auth interceptors
│   └── endpoints.ts      # All API endpoint constants — import from here
├── constants/
│   └── Config.ts         # App config (API_URL, timeouts)
├── context/
│   └── AuthContext.tsx   # useAuth() hook + AuthProvider
└── types/
    └── index.ts          # Shared TypeScript interfaces

features/                 # Per-member feature modules
├── auth/                 # Member 1
├── doctors/              # Member 2
├── appointments/         # Member 3
├── records/              # Member 4
├── pharmacy/             # Member 5
└── billing/              # Member 6
```

## Feature Module Structure

Each member works inside their own folder:

```
features/<feature>/
├── screens/             # React Native screen components
├── components/          # Reusable UI components for this feature
├── services/            # API service functions (typed, uses apiClient)
└── README.md            # Member docs, TODOs, endpoint table
```

## Wiring Screens into Navigation

Screens are scaffolded but not yet inserted into the Expo Router navigation tree. Each member should:

1. Create a route file in `app/` (or `app/(tabs)/`) for their screens.
2. Import their screen component and render it.
3. Use `useLocalSearchParams()` for dynamic routes (e.g., `/doctors/[id]`).

**Example** — adding the Doctors tab:
```tsx
// app/(tabs)/doctors.tsx
import DoctorListScreen from '@/features/doctors/screens/DoctorListScreen';
export default DoctorListScreen;
```

## Auth Context

All screens can access the current user and auth actions via:

```tsx
import { useAuth } from '@/shared/context/AuthContext';

const { user, token, isAuthenticated, login, logout, isLoading } = useAuth();
```

`AuthProvider` must wrap the root layout in `app/_layout.tsx`.

## Environment Variables

| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:5000/api` | Use machine IP for physical device |

Expo only exposes env vars prefixed with `EXPO_PUBLIC_` to the client bundle.

## Path Aliases

`@/` maps to the project root (`client/`). Examples:
- `@/shared/api/client` → `client/shared/api/client.ts`
- `@/features/auth/screens/LoginScreen` → `client/features/auth/screens/LoginScreen.tsx`
