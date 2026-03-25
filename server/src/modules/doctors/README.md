# Module: Doctor & Staff Management

**Assigned to:** Member 2 — Phase 2

---

## Scope

Manage doctor profiles, including specializations, consultation fees, availability, and license document uploads.

---

## Your Files

| File | Purpose |
|------|---------|
| `doctor.model.ts` | Mongoose Doctor schema — **DONE** |
| `doctor.controller.ts` | Route handlers — **DONE** |
| `doctor.routes.ts` | Route definitions — **DONE** |
| `doctor.validation.ts` | Input validation — **DONE** |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/doctors` | 🔒 Admin | Create doctor record + upload license |
| GET | `/api/doctors` | Public | List all doctors (filterable) |
| GET | `/api/doctors/:id` | Public | Get doctor details |
| PUT | `/api/doctors/:id` | 🔒 Admin/Doctor | Update availability, fee, etc. |
| DELETE | `/api/doctors/:id` | 🔒 Admin | Delete doctor record |

### Query Filters (GET /api/doctors)
```
?specialization=Cardiology
?availability=Available
```

### Create Doctor — `POST /api/doctors`
```
Content-Type: multipart/form-data
Authorization: Bearer <admin-token>

Fields: userId, specialization, experienceYears, consultationFee
File:   licenseDocument (JPEG/PNG/PDF, max 5MB)
```

---

## Doctor Schema

```typescript
{
  userId: ObjectId          // ref: User (required)
  specialization: string    // required
  experienceYears: number   // required, min: 0
  consultationFee: number   // required, min: 0
  availability: 'Available' | 'Unavailable' | 'On Leave'  // default: Available
  licenseDocumentUrl: string // required, set from file upload
}
```

---

## Shared Middleware Used

- `authMiddleware` — required on protected routes
- `requireRole('admin')` — restricts CREATE and DELETE to admins
- `requireRole('admin', 'doctor')` — restricts UPDATE to admin or doctor
- `uploadSingle('licenseDocument')` — handles license file upload

---

## Notes

- Doctors need an existing User account first (`userId` must reference a valid User).
- The `userId` field has a unique index — one doctor profile per user account.
- License document is required when creating; file is stored at `/uploads/<filename>`.
