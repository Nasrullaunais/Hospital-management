# Module: Authentication & Patient Management

**Assigned to:** Member 1 — Phase 1

---

## Scope

This module handles all user authentication (register/login) and patient profile management for the Hospital Management System.

---

## Your Files

| File | Purpose |
|------|---------|
| `auth.model.ts` | Mongoose User schema — **DONE** (password hashing pre-hook, comparePassword method) |
| `auth.controller.ts` | Route handlers — **DONE** (register, login, getMyProfile, updateMyProfile, deleteMyProfile) |
| `auth.routes.ts` | Route definitions — **DONE** |
| `auth.validation.ts` | Input validation rules — **DONE** |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, receive JWT |
| GET | `/api/patients/me` | 🔒 Patient | Get my profile |
| PUT | `/api/patients/me` | 🔒 Patient | Update profile + upload ID document |
| DELETE | `/api/patients/me` | 🔒 Patient | Delete account |

### Register — `POST /api/auth/register`
```json
// Request body
{ "name": "Jane Doe", "email": "jane@example.com", "password": "Password1" }

// Response 201
{ "success": true, "data": { "token": "...", "user": { ... } } }
```

### Login — `POST /api/auth/login`
```json
// Request body
{ "email": "jane@example.com", "password": "Password1" }

// Response 200
{ "success": true, "data": { "token": "...", "user": { ... } } }
```

### Update Profile — `PUT /api/patients/me`
```
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields: name, phone, dateOfBirth (YYYY-MM-DD)
File:   idDocument (JPEG/PNG/PDF, max 5MB)
```

---

## User Schema

```typescript
{
  name: string           // required
  email: string          // required, unique
  password: string       // required, hashed (never returned in responses)
  role: 'patient' | 'doctor' | 'admin'  // default: 'patient'
  phone?: string
  dateOfBirth?: Date
  idDocumentUrl?: string // path to uploaded file: /uploads/<filename>
  createdAt: Date
  updatedAt: Date
}
```

---

## Shared Middleware Used

- `authMiddleware` — protects patient routes
- `uploadSingle('idDocument')` — handles ID document file upload

---

## Implementation Notes

- Passwords are hashed with **bcryptjs** (12 salt rounds) via a pre-save hook on the model.
- The `password` field has `select: false` — it is never returned in API responses.
- JWT is signed with `JWT_SECRET` and expires based on `JWT_EXPIRES_IN` env vars.
- File uploads are saved to `server/uploads/` and served at `/uploads/<filename>`.
- Validation is handled by `express-validator` rules in `auth.validation.ts`.

---

## Testing Your Endpoints

Use **Thunder Client** (VS Code extension, already recommended) or curl:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@test.com", "password": "Password1"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "Password1"}'

# Get profile (replace <token> with the token from login response)
curl http://localhost:5000/api/patients/me \
  -H "Authorization: Bearer <token>"
```
