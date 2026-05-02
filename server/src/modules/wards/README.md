# Module: Wards

**Assigned to:** Member X — Phase 2

---

## Scope

Manage hospital wards with bed tracking. Wards are standalone entities categorized by type (general, private, icu, emergency).

---

## Your Files

### Wards

| File | Purpose |
|------|---------|
| `ward.model.ts` | Mongoose Ward schema |
| `ward.controller.ts` | Route handlers |
| `ward.routes.ts` | Route definitions |
| `ward.validation.ts` | Input validation |

---

## API Endpoints

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
?type=general
?type=private
?type=icu
?type=emergency
?status=available
?status=full
?status=maintenance
```

---

## Ward Schema

```typescript
{
  name: string              // required, max 100 chars
  location: string          // optional, max 200 chars
  phone: string             // optional, max 20 chars
  type: 'general' | 'private' | 'icu' | 'emergency'
  totalBeds: number         // required, min: 1
  currentOccupancy: number  // optional, min: 0, max: totalBeds
  status: 'available' | 'full' | 'maintenance'  // auto-set based on occupancy
}
```

---

## Shared Middleware Used

- `authMiddleware` — required on protected routes
- `requireRole('admin')` — restricts create/update/delete to admins

---

## Edge Cases

1. **Delete ward with patients** — Allows deletion even if currentOccupancy > 0 (warns but proceeds)
2. **Update ward occupancy** — Auto-sets status to 'full' when currentOccupancy >= totalBeds
3. **Auto-status** — Ward status auto-updates: available (occupancy < totalBeds), full (occupancy >= totalBeds), maintenance (manual)
4. **Occupancy validation** — PATCH beds endpoint validates occupancy doesn't exceed total beds
