# Module: Appointment Booking

**Assigned to:** Member 3 — Phase 3

---

## Scope

Allows patients to book appointments with doctors, upload referral documents, view appointment history, and allows doctors/admins to update appointment status.

---

## Your Files

| File | Purpose |
|------|---------|
| `appointment.model.ts` | Mongoose Appointment schema — **DONE** |
| `appointment.controller.ts` | Route handlers — **DONE** |
| `appointment.routes.ts` | Route definitions — **DONE** |
| `appointment.validation.ts` | Input validation — **DONE** |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/appointments` | 🔒 Any | Book appointment + optional referral upload |
| GET | `/api/appointments/my-appointments` | 🔒 Patient | Patient's appointment history |
| GET | `/api/appointments/doctor/:doctorId` | 🔒 Doctor/Admin | Doctor's schedule |
| PUT | `/api/appointments/:id/status` | 🔒 Doctor/Admin | Update status |
| DELETE | `/api/appointments/:id` | 🔒 Patient | Cancel appointment |

---

## Appointment Schema

```typescript
{
  patientId: ObjectId         // ref: User (set from JWT, not from body)
  doctorId: ObjectId          // ref: Doctor
  appointmentDate: Date       // must be in the future
  reasonForVisit?: string     // max 500 chars
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'  // default: Pending
  referralDocumentUrl?: string
}
```

---

## Notes

- `patientId` is set server-side from `req.user.id` — never trust the client to send it.
- Only the patient who booked can cancel (enforced by querying with both `_id` and `patientId`).
- Status updates are restricted to Doctor/Admin roles only.
