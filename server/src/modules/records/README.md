# Module: Medical Records & Lab Reports

**Assigned to:** Member 4 — Phase 4

---

## Scope

Allows doctors to create and manage patient medical records including diagnoses, prescriptions, and lab report uploads. Patients can read their own records.

---

## Your Files

| File | Purpose |
|------|---------|
| `record.model.ts` | Mongoose MedicalRecord schema — **DONE** |
| `record.controller.ts` | Route handlers — **DONE** |
| `record.routes.ts` | Route definitions — **DONE** |
| `record.validation.ts` | Input validation — **DONE** |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/records` | 🔒 Doctor | Create medical record + optional lab report |
| GET | `/api/records/patient/:patientId` | 🔒 Any | Get patient records (patients see only their own) |
| GET | `/api/records/:id` | 🔒 Any | Get single record |
| PUT | `/api/records/:id` | 🔒 Doctor | Update diagnosis / prescription |
| DELETE | `/api/records/:id` | 🔒 Admin | Delete erroneous record |

---

## MedicalRecord Schema

```typescript
{
  patientId: ObjectId    // ref: User
  doctorId: ObjectId     // ref: Doctor (set from JWT, not from client)
  diagnosis: string      // required
  prescription?: string
  dateRecorded: Date     // default: now
  labReportUrl?: string  // from file upload
}
```

---

## Notes

- `doctorId` is set server-side from `req.user.id` — not trusted from the client body.
- Patient role can only access records where `patientId === req.user.id`.
- Lab reports are stored in `/uploads/` via the shared `uploadSingle('labReport')` middleware.
