# Hospital Management App — Mock Data & Bug Fixes Summary

## Goal

Populate the MongoDB database with realistic mock data to demo the hospital management app, and fix any bugs discovered during the process.

## Seed Scripts

Three seed scripts exist:

| Script | Method | Use Case |
|--------|--------|----------|
| `server/src/scripts/seed.ts` | Direct Mongoose + raw MongoDB driver | Fast, reliable bulk seeding |
| `server/src/scripts/reseed.ts` | REST API + direct MongoDB (role fix) | API-level seeding (original) |
| `server/src/scripts/reseed-v2.ts` | API-first + MongoDB for roles/users/appointments | Rate-limit-aware hybrid (current) |

### Running reseed-v2.ts (Current Seed Script)

```bash
cd server
bun run src/scripts/reseed-v2.ts
```

Credentials are hardcoded:
- **API**: `https://hospital-management-l5lc.onrender.com`
- **MongoDB**: `mongodb+srv://it24101774_db_user:hospital123@hospital-management-clu.0v47ubw.mongodb.net/hospital_db`

Strategy: MongoDB for users (bypasses auth rate limit of 10/15min), appointments (bypasses future-date + schedule validators). API for all other entities. Total API calls: ~91 (under global 100/15min limit). 2s delays between calls.

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
10. **Rate limiting** (2026-05-03) - Render deployment has two rate limiters: auth limiter (10 requests/15min per IP for login/register) and global limiter (100 requests/15min per IP). Seeding purely via API hits both limits. Fix: MongoDB direct insert for users, logins, and appointments; API for remaining entities with 2s delays.
11. **API response `id` vs `_id` inconsistency** - Deployed API returns `id` (not `_id`) for some entities (wards, medicines) while others use `_id`. Seed script uses `getEid()` helper to normalize.
12. **API response wrapping varies** - Some endpoints return `data: { entity }` (doctor, ward, medicine, record, invoice, assignment), others return `data: entity` directly (prescription, dispense). Seed script handles both.

## Bug Fixes Applied

### Phase 1-7: Previous Fixes (See commit history)

- Null reference bugs in 6 client files
- Invoice display bug in `invoice.service.ts`
- Mongoose 9 pre-save hook in `appointment.model.ts`
- Removed duplicate indexes in `appointment.model.ts` and `medicine.model.ts`
- Removed hardcoded database name from `seed.ts`
- Fixed admin password mismatch in `reseed.ts`
- Deleted entire Departments module (replaced by wards)

### Phase 8: Seed Script v2 (2026-05-03)

- Created `server/src/scripts/reseed-v2.ts` — rate-limit-aware hybrid seeder
- MongoDB: users (bcrypt hashed, correct roles), appointments
- API: wards, doctors, schedules, records, medicines, prescriptions, invoices, assignments, ward medications
- Fix: `apiPost`/`apiPostForm` return `j.data` (unwrap success wrapper)
- Fix: `getEid()` normalizes `_id` vs `id` from API responses
- Fix: Variable shadowing in seedRecords loop
- Fix: Client update to handle both `id` and `_id` from API responses

## Current Seed Data (seeded 2026-05-03)

All data created by `reseed-v2.ts` via the deployed API at `hospital-management-l5lc.onrender.com`.

### Users (19 total)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hospital.com` | `Admin123!` |
| Doctor | `sarah.mitchell@hospital.com` | `Doctor123!` |
| Doctor | `james.chen@hospital.com` | `Doctor123!` |
| Doctor | `maria.rodriguez@hospital.com` | `Doctor123!` |
| Doctor | `emily.thompson@hospital.com` | `Doctor123!` |
| Doctor | `robert.williams@hospital.com` | `Doctor123!` |
| Doctor | `priya.patel@hospital.com` | `Doctor123!` |
| Pharmacist | `pharmacist@hospital.com` | `Pharmacy123!` |
| Receptionist | `reception@hospital.com` | `Reception123!` |
| Patient | `john.anderson@email.com` | `Patient123!` |
| Patient | `emma.wilson@email.com` | `Patient123!` |
| Patient | `michael.brown@email.com` | `Patient123!` |
| Patient | `sophia.martinez@email.com` | `Patient123!` |
| Patient | `william.taylor@email.com` | `Patient123!` |
| Patient | `olivia.johnson@email.com` | `Patient123!` |
| Patient | `benjamin.lee@email.com` | `Patient123!` |
| Patient | `isabella.garcia@email.com` | `Patient123!` |
| Patient | `lucas.davis@email.com` | `Patient123!` |
| Patient | `mia.thompson@email.com` | `Patient123!` |

All passwords meet the backend requirement: `/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/` + min 8 chars.

### Database Collection Summary

| Collection | Count | Method | Notes |
|-----------|-------|--------|-------|
| users | 19 | MongoDB | 1 admin, 6 doctors, 1 pharmacist, 1 receptionist, 10 patients |
| doctors | 6 | API | Specializations: Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology, General Medicine |
| doctorschedules | 6 | API | Weekly slots with 30min/45min durations |
| appointments | 15 | MongoDB | 10 past (Completed), 5 future (Pending/Confirmed) |
| medicalrecords | 15 | API | Linked to appointments and doctors |
| medicines | 20 | API | 11 categories: Antibiotic, Cardiovascular, Gastrointestinal, Diabetes, Analgesic, Dermatological, Antihistamine, Corticosteroid, Respiratory, Supplements, Thyroid |
| prescriptions | 12 | API | Linked to patients, doctors, medical records, and medicines |
| invoices | 8 | API | All created as Unpaid (payment flow not executed to stay under rate limits) |
| wards | 13 | API | Types: icu, private, general, emergency |
| wardassignments | 6 | API | Linked to patients and wards |
| wardmedications | 7 | API | Linked to ward assignments and medicines |
| dispenses | 0 | — | Not seeded (requires pharmacist + prescription flow) |
| labreports | 0 | — | Not seeded (requires doctor auth for specific patients) |
| payments | 0 | — | Not seeded (payment flow skipped to stay under rate limits) |
| tokenblacklists | 0 | — | Runtime-managed |

### Doctors & Fees

| Doctor | Specialization | Fee | Experience |
|--------|---------------|-----|------------|
| Dr. Sarah Mitchell | Cardiology | $350 | 12 years |
| Dr. James Chen | Neurology | $400 | 8 years |
| Dr. Maria Rodriguez | Orthopedics | $300 | 15 years |
| Dr. Emily Thompson | Pediatrics | $250 | 10 years |
| Dr. Robert Williams | Dermatology | $280 | 7 years |
| Dr. Priya Patel | General Medicine | $200 | 20 years |

### Wards

| Ward | Type | Beds |
|------|------|------|
| Cardiac ICU | icu | 8 |
| Cardiac Ward A | private | 20 |
| Neuro ICU | icu | 6 |
| Neuro Ward | general | 24 |
| Ortho Ward 1 | general | 30 |
| Ortho Private | private | 12 |
| Pediatric Ward | general | 25 |
| NICU | icu | 10 |
| Derma Ward | general | 15 |
| General Ward A | general | 40 |
| Private Rooms B | private | 20 |
| Emergency Beds | emergency | 30 |
| Critical Care | icu | 10 |

### Appointments

10 past appointments (Completed status) and 5 future appointments (Pending/Confirmed). Past appointments span 1-10 days ago. Future appointments span 1-5 days ahead. Dates computed relative to seed execution time.

## Current Data Limitations

- **Invoices**: All are "Unpaid" — payment flow not executed to stay under global rate limit (100 requests/15min). Use the app to process payments.
- **Dispenses**: Not seeded — requires pharmacist login + prescription dispensing flow via app.
- **Lab Reports**: Not seeded — requires doctor auth for specific patient records.
- **File URLs**: All `licenseDocumentUrl` and `packagingImageUrl` fields use placeholder local paths or S3 URLs generated by the API during upload.
- **Patient dateOfBirth**: Not set (requires profile update via app).

## Demo Credentials (All with bcrypt hashed passwords — 12 salt rounds)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hospital.com` | `Admin123!` |
| Doctor | `sarah.mitchell@hospital.com` | `Doctor123!` |
| Pharmacist | `pharmacist@hospital.com` | `Pharmacy123!` |
| Receptionist | `reception@hospital.com` | `Reception123!` |
| Patient | `john.anderson@email.com` | `Patient123!` |
