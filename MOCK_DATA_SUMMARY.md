# Hospital Management App - Mock Data & Bug Fixes Summary

## Goal

Populate the MongoDB database with realistic mock data to demo the hospital management app, and fix any bugs discovered during the process.

## Seed Scripts

Two seed scripts exist:

| Script | Method | Use Case |
|--------|--------|----------|
| `server/src/scripts/seed.ts` | Direct Mongoose + raw MongoDB driver | Fast, reliable bulk seeding |
| `server/src/scripts/reseed.ts` | REST API + direct MongoDB (role fix) | API-level seeding, role-correct tokens |

Both use `Password123` for all user accounts. The `reseed.ts` script was fixed (2026-05-02) — it previously used `Admin123` for the admin user, causing a password mismatch.

### Running seed.ts

```bash
cd server
MONGO_URI="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?appName=<app>" bun run src/scripts/seed.ts
```

**Important**: `seed.ts` no longer hardcodes a database name. It uses whatever database the URI resolves to (matching the deployed app behavior). Previously it hardcoded `dbName: 'hospital-management'` which caused data to go to a different database than the deployed app.

### Running reseed.ts

```bash
cd server
MONGO_URI="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?appName=<app>" bun run src/scripts/reseed.ts
```

Requires the API to be running at `http://localhost:5000` (update `API` constant in script if deploying against a remote instance). Uses direct MongoDB access only for role corrections (register endpoint always assigns `patient` role by default).

## Discoveries

1. **Original database had only 1 user** (admin "Nasrulla") - all 10 collections were empty except users
2. **MongoDB MCP inserts strings as-is** - when using `insertMany`, `_id` becomes a plain string instead of ObjectId, and dates are stored as strings instead of ISODate
3. **JavaScript `typeof null === 'object'`** - this caused crashes in TypeScript files when userId/doctorId was null, because the code checked `typeof item.userId === 'object'` which returns true for null
4. **Invoice API response format mismatch** - backend returns `{ success: true, data: { invoices: [...], count: N } }` but client service extracted `res.data.data` (wrapper object) instead of `res.data.data.invoices` (the array)
5. **bcrypt password hashing** - can't hash passwords via MCP directly; had to use Node.js with bcryptjs from the server's node_modules
6. **Appointment schema validator is stale-dated** - the `appointmentDate` validator uses `Date.now()` captured at schema definition time. In Mongoose 9, `insertMany` still triggers validators, and past dates fail even for `Completed`/`Cancelled` appointments. Fix: use raw MongoDB driver for appointment inserts.
7. **Pre-save hook `next()` signature changed in Mongoose 9** - the appointment conflict-check hook used `return next(new Error(...))` but Mongoose 9 passes a `SaveOptions` object instead of a callback. Fix: throw directly instead of calling `next()`.
8. **Deploy database mismatch** (2026-05-02) - Render's `MONGO_URI` had no database name (`mongodb+srv://.../?appName=...`), causing Mongoose to default to `test` database. Seed data was written to a different database (`hospital_db`), so the deployed app showed no data. Fixed by seeding directly into the default database.
9. **Duplicate mongoose indexes** - `Appointment` model had both a regular and unique index on `{ doctorId, appointmentDate }`. `Medicine` model had `unique: true` on the `name` field AND a separate `schema.index({ name: 1 }, { unique: true })`. Both duplicates removed.

## Accomplished

### Phase 1: Initial Mock Data Population

- Analyzed database schema using analyzer agents
- Generated realistic mock data for all collections using multiple agents
- Inserted all data via MCP `insertMany`
- Discovered issues with string IDs and plain-text passwords

### Phase 2: Fix Null Reference Bug

- Fixed `typeof null === 'object'` bug in 6 files:
  - `client/features/doctors/screens/DoctorListScreen.tsx` (line 62)
  - `client/features/doctors/screens/DoctorDetailScreen.tsx` (line 60)
  - `client/features/appointments/screens/MyAppointmentsScreen.tsx` (lines 91, 93)
  - `client/features/prescriptions/screens/PrescriptionListScreen.tsx` (line 62)
  - `client/features/dispensing/screens/PendingPrescriptionsScreen.tsx` (lines 40-41)
  - `client/features/prescriptions/screens/PrescriptionDetailScreen.tsx` (lines 24-25)

### Phase 3: Proper Re-seeding with Bcrypt Passwords

- Deleted all mock data (keeping original admin user)
- Re-inserted wards, medicines without specifying `_id` (MongoDB generates proper ObjectIds)
- Generated bcrypt hashes via Node.js: `node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('doctor123', 12));"`
- Inserted users with proper bcrypt hashed passwords
- Inserted doctors, medical records, appointments, prescriptions, dispenses, invoices with proper ObjectId references
- Verified all data consistency

### Phase 4: Fix Invoice Display Bug

- Used bugfixworkflow skill with analyzer agent
- Found root cause: `invoice.service.ts` returned `res.data.data` (wrapper object) instead of `res.data.data.invoices` (the array)
- Fixed both `getMyBills()` and `getAllInvoices()` functions in `client/features/billing/services/invoice.service.ts`
- Updated type annotations from `ApiSuccessResponse<Invoice[]>` to `ApiSuccessResponse<{ invoices: Invoice[]; count: number }>`

### Phase 5: Server-Side Bug Fixes (Discovered During Seeding)

#### `appointment.model.ts` — Pre-save hook `next()` signature

**File:** `server/src/modules/appointments/appointment.model.ts` (lines 63–79)

**Problem:** The conflict-check pre-save hook used `return next(new Error(...))` with Mongoose 5/7 callback style. In Mongoose 9, Kareem passes a `SaveOptions` object as the first parameter, not a callback. The hook was crashing with `TypeError: next is not a function`.

**Fix:** Removed `next` parameter and threw directly:
```typescript
// Before (broken in Mongoose 9)
appointmentSchema.pre('save', async function (next) {
  if (conflict) { return next(new Error('slot conflict')); }
  next();
});

// After (works in Mongoose 9)
appointmentSchema.pre('save', async function () {
  if (conflict) { throw new Error('slot conflict'); }
});
```

#### `appointment.model.ts` — Validator stale `Date.now()` capture

**Problem:** The appointment schema's `appointmentDate` field validator captured `Date.now()` at schema definition time. When the server was started in 2025 and the date was April 24, 2026, all appointment dates in the past were being rejected even for `Completed`/`Cancelled` statuses.

**Fix:** Used raw MongoDB driver (`mongoClient.db().collection('appointments').insertMany()`) for appointment inserts in `seed.ts` to bypass all Mongoose validators and hooks. This is appropriate for seeding only.

### Phase 6: Final Seeding Run (seed.ts)

**Script:** `server/src/scripts/seed.ts`

Seeding is done via direct Mongoose access (not the API) for reliability. The script:
1. Wipes all collections
2. Creates users with bcrypt hashed passwords (12 salt rounds)
3. Creates all cross-referenced data in dependency order
4. Uses raw MongoDB insert for appointments to bypass stale validators

### Phase 7: Deploy & Seed Fixes (2026-05-02)

- **`seed.ts`**: Removed hardcoded `dbName: 'hospital-management'` — now uses database from URI
- **`seed.ts`**: Fixed `mongoClient.db('hospital-management')` → `mongoClient.db()` — matches URI database
- **`reseed.ts`**: Fixed admin password `Admin123` → `Password123` to match `seed.ts`
- **`appointment.model.ts`**: Removed duplicate non-unique index on `{ doctorId, appointmentDate }` (unique partial index already covers this)
- **`medicine.model.ts`**: Removed duplicate `unique: true` from `name` field (separate `schema.index` already handles uniqueness)
- **Departments module**: Deleted entirely (replaced by wards module) — no more `/api/departments` endpoint

## Relevant Files

### Files Modified (Bug Fixes):

- `client/features/doctors/screens/DoctorListScreen.tsx` — null check fix for `typeof userId === 'object'`
- `client/features/doctors/screens/DoctorDetailScreen.tsx` — null check fix
- `client/features/appointments/screens/MyAppointmentsScreen.tsx` — null check fix (lines 91, 93)
- `client/features/prescriptions/screens/PrescriptionListScreen.tsx` — null check fix (line 62)
- `client/features/dispensing/screens/PendingPrescriptionsScreen.tsx` — null check fix (lines 40-41)
- `client/features/prescriptions/screens/PrescriptionDetailScreen.tsx` — null check fix (lines 24-25)
- `client/features/billing/services/invoice.service.ts` — fixed `getMyBills()` and `getAllInvoices()` to return `res.data.data.invoices` instead of `res.data.data`
- `server/src/modules/appointments/appointment.model.ts` — fixed pre-save hook `next()` → throw; removed duplicate index
- `server/src/modules/pharmacy/medicine.model.ts` — removed duplicate `unique: true` on name field
- `server/src/scripts/seed.ts` — removed hardcoded database name; uses URI default
- `server/src/scripts/reseed.ts` — fixed admin password mismatch

### Reference Files:

- `server/src/modules/auth/auth.model.ts` — User model with bcrypt pre-save hook
- `server/src/modules/auth/auth.controller.ts` — register/login controllers
- `server/src/modules/billing/invoice.controller.ts` — invoice API response format
- `server/src/modules/doctors/doctor.controller.ts` — doctor API with populate
- `client/shared/types/index.ts` — TypeScript interfaces

## Demo Credentials (All with bcrypt hashed passwords — 12 salt rounds)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hospital.com` | `Password123` |
| Pharmacist | `pharmacist@hospital.com` | `Password123` |
| Receptionist | `receptionist@hospital.com` | `Password123` |
| Doctor | `dr.petrov@hospital.com` | `Password123` |
| Doctor | `dr.sharma@hospital.com` | `Password123` |
| Doctor | `dr.thompson@hospital.com` | `Password123` |
| Doctor | `dr.okafor@hospital.com` | `Password123` |
| Doctor | `dr.mendes@hospital.com` | `Password123` |
| Patient | `robert.w@example.com` | `Password123` |
| Patient | `jennifer.m@example.com` | `Password123` |
| Patient | `david.kim@example.com` | `Password123` |
| Patient | `fatima.ah@example.com` | `Password123` |
| Patient | `thomas.ob@example.com` | `Password123` |
| Patient | `sofia.and@example.com` | `Password123` |
| Patient | `marcus.j@example.com` | `Password123` |
| Patient | `layla.ib@example.com` | `Password123` |

## Database State (After seed.ts Run)

All 13 collections populated with proper MongoDB ObjectIds and referential integrity:

| Collection | Count | Notes |
|-----------|-------|-------|
| users | 16 | 1 admin, 1 pharmacist, 1 receptionist, 5 doctors, 8 patients |
| doctors | 5 | Linked to user accounts; specializations: Cardiology, Pediatrics, Orthopedic Surgery, Neurology, Internal Medicine |
| wards | 9 | ICU, private, general, emergency types; independent (no department linking) |
| medicines | 25 | 11 categories: Antibiotic, Analgesic, Cardiovascular, Gastrointestinal, Respiratory, Neurological, Orthopedic, Mental Health, Controlled, Endocrine, Supplements |
| appointments | 12 | Mix of future (Pending/Confirmed), past (Completed), and Cancelled |
| medicalrecords | 6 | Linked to appointments and doctors |
| labreports | 8 | Hematology, radiology, biochemistry, microbiology, serology types; statuses: completed, reviewed |
| prescriptions | 6 | Mix of active, fulfilled, and cancelled |
| invoices | 7 | Paid, Pending Verification, Overdue, Unpaid; includes itemized billing with items[], discount, invoiceNumber |
| payments | 5 | Methods: bank_transfer, mock_card; statuses: completed, processing, pending |
| wardassignments | 5 | 3 active admissions, 2 discharged |
| wardmedications | 8 | Active, completed, and discontinued; linked to ward assignments |
| dispenses | 3 | Fulfilled prescriptions by pharmacist |

## Current Data Limitations

- All `*Url` fields (`licenseDocumentUrl`, `packagingImageUrl`, `labReportUrl`, `paymentReceiptUrl`) use placeholder paths like `/uploads/dr_petrov_license.pdf` — no actual files
- `idDocumentUrl` on patient profiles is null
- Ward occupancy was manually synced in the seed script — the `PATCH /api/wards/:id/beds` endpoint would do this automatically in production use
- **No departments collection** — the departments module was deleted (commit `3bd5478`). Wards are now independent entities with `location` and `phone` fields instead of a `departmentId` reference.
