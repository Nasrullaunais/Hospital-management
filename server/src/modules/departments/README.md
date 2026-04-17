# Module: Departments & Wards

**Assigned to:** Member X — Phase 2

---

## Scope

Manage hospital departments and wards, including department details, head doctors, and ward management with bed tracking.

---

## Your Files

### Departments

| File | Purpose |
|------|---------|
| `department.model.ts` | Mongoose Department schema |
| `department.controller.ts` | Route handlers |
| `department.routes.ts` | Route definitions |
| `department.validation.ts` | Input validation |

### Wards

| File | Purpose |
|------|---------|
| `ward.model.ts` | Mongoose Ward schema |
| `ward.controller.ts` | Route handlers |
| `ward.routes.ts` | Route definitions |
| `ward.validation.ts` | Input validation |

---

## API Endpoints

### Departments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/departments` | 🔒 Admin | Create department |
| GET | `/api/departments` | 🔒 Authenticated | List all departments |
| GET | `/api/departments/:id` | 🔒 Authenticated | Get department details |
| PUT | `/api/departments/:id` | 🔒 Admin | Update department |
| DELETE | `/api/departments/:id` | 🔒 Admin | Delete department |

#### Query Filters (GET /api/departments)
```
?status=active
?status=inactive
```

### Wards

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/wards` | 🔒 Admin | Create ward |
| GET | `/api/wards` | 🔒 Authenticated | List all wards |
| GET | `/api/wards/:id` | 🔒 Authenticated | Get ward details |
| PUT | `/api/wards/:id` | 🔒 Admin | Update ward |
| DELETE | `/api/wards/:id` | 🔒 Admin | Delete ward |
| PATCH | `/api/wards/:id/beds` | 🔒 Admin | Update bed occupancy |

#### Query Filters (GET /api/wards)
```
?departmentId=65abc123...
?type=general
?type=private
?type=icu
?type=emergency
?status=available
?status=full
?status=maintenance
```

---

## Department Schema

```typescript
{
  name: string              // required, unique, max 100 chars
  description: string      // required, max 500 chars
  headDoctorId?: ObjectId   // optional, ref: Doctor
  location: string          // required, max 200 chars
  phone: string             // required, max 20 chars
  status: 'active' | 'inactive'  // default: active
}
```

---

## Ward Schema

```typescript
{
  departmentId: ObjectId    // required, ref: Department
  name: string              // required, max 100 chars
  type: 'general' | 'private' | 'icu' | 'emergency'
  totalBeds: number         // required, min: 1
  currentOccupancy: number   // optional, min: 0, max: totalBeds
  status: 'available' | 'full' | 'maintenance'  // auto-set based on occupancy
}
```

---

## Shared Middleware Used

- `authMiddleware` — required on protected routes
- `requireRole('admin')` — restricts create/update/delete to admins

---

## Edge Cases

1. **Delete department with wards** — Returns error if department has associated wards
2. **Update ward occupancy** — Auto-sets status to 'full' when currentOccupancy >= totalBeds
3. **Delete ward with patients** — Allows deletion even if currentOccupancy > 0 (no enforcement)
4. **Auto-status** — Ward status auto-updates: available (occupancy < totalBeds), full (occupancy >= totalBeds), maintenance (manual)
