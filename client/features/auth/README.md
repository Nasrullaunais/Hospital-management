# Feature: Auth & Patient Profile — Member 1

## Assignment
**Member 1** owns everything inside `client/features/auth/` and the `client/features/auth/` module on the backend (`server/src/modules/auth/`).

## Scope
- Patient self-registration
- Login / logout
- View + edit own profile
- Upload ID document (future: via FormData)

## Files

| File | Status | Notes |
|---|---|---|
| `services/auth.service.ts` | ✅ Scaffold | All API calls typed |
| `screens/LoginScreen.tsx` | ✅ Scaffold | Functional — wire into navigation |
| `screens/RegisterScreen.tsx` | ✅ Scaffold | Functional — wire into navigation |
| `screens/ProfileScreen.tsx` | ✅ Scaffold | Functional — wire into navigation |
| `components/index.ts` | ✅ Scaffold | Add shared components here |

## Screens to Implement

| Screen | Route | Auth Required |
|---|---|---|
| `LoginScreen` | `/login` | No |
| `RegisterScreen` | `/register` | No |
| `ProfileScreen` | `/(tabs)/profile` or `/profile` | Yes |

## API Endpoints Consumed

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Sign in, receive JWT |
| `GET` | `/patients/me` | Fetch own profile |
| `PUT` | `/patients/me` | Update own profile |
| `DELETE` | `/patients/me` | Delete own account |

## Usage

```tsx
// Use the auth service directly in a screen
import { authService } from '@/features/auth/services/auth.service';

// Or use the global AuthContext (preferred for login/logout/user state)
import { useAuth } from '@/shared/context/AuthContext';
const { user, login, logout, isAuthenticated } = useAuth();
```

## TODOs

- [ ] Wire `LoginScreen` and `RegisterScreen` into app navigation (Expo Router)
- [ ] Add an image picker for ID document upload in `ProfileScreen`
- [ ] Add inline field validation messages (instead of Alert dialogs)
- [ ] Add a date picker for `dateOfBirth`
- [ ] Handle forgot-password flow (if backend adds the endpoint later)
