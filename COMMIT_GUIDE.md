# Commit Guide — Hospital Management System

> Each member clones the `hospital` branch, adds ONLY their files, commits, and pushes.

```bash
git clone https://github.com/Nasrullaunais/Hospital-management.git
cd Hospital-management
git checkout hospital
```

---

## Member 1 — Authentication & Patient Management

**Server** (`server/src/modules/auth/`):
```
auth.controller.ts    auth.routes.ts
auth.model.ts         auth.validation.ts
```

**Client Features** (`client/features/auth/`):
```
services/auth.service.ts
screens/LoginScreen.tsx     screens/RegisterScreen.tsx
screens/ProfileScreen.tsx   screens/DoctorProfileScreen.tsx
components/index.ts
```

**Client Routes** (`client/app/(patient)/`):
```
_layout.tsx    index.tsx    profile.tsx
```

```bash
# After adding your files:
git add -A && git commit -m "feat(member-1): auth and patient management" && git push origin hospital
```

---

## Member 2 (IT24101774) — ALREADY COMMITTED. No action needed.

Your files: `server/src/modules/admin/`, `server/src/modules/doctors/`, `client/features/doctors/`, `client/features/staff/`, `client/app/(admin)/`.

---

## Member 3 — Appointment Booking

**Server** (`server/src/modules/appointments/`):
```
appointment.controller.ts    appointment.routes.ts
appointment.model.ts         appointment.validation.ts
```

**Client Features** (`client/features/appointments/`):
```
services/appointment.service.ts
screens/BookAppointmentScreen.tsx    screens/MyAppointmentsScreen.tsx
components/index.ts
```

**Client Routes**:
```
client/app/(patient)/appointments/index.tsx
client/app/(patient)/appointments/book.tsx
client/app/(patient)/doctors/index.tsx
client/app/(patient)/doctors/[id].tsx
client/app/(doctor)/appointments/index.tsx
```

```bash
git add -A && git commit -m "feat(member-3): appointment booking" && git push origin hospital
```

---

## Member 4 — Medical Records & Lab Reports

**Server**:
```
server/src/modules/records/    (record.controller/model/routes/validation.ts)
server/src/modules/labReports/ (labReport.controller/model/routes/validation.ts)
server/src/modules/reports/    (report.controller.ts, report.routes.ts)
```

**Client Features** (`client/features/records/`):
```
services/record.service.ts    services/labReport.service.ts    services/report.service.ts
screens/RecordListScreen.tsx  screens/RecordDetailScreen.tsx
components/index.ts
```

**Client Routes**:
```
client/app/(doctor)/_layout.tsx    client/app/(doctor)/index.tsx    client/app/(doctor)/profile.tsx
client/app/(doctor)/records/index.tsx    client/app/(doctor)/records/[id].tsx    client/app/(doctor)/records/add-record.tsx
client/app/(doctor)/lab-reports/index.tsx    client/app/(doctor)/lab-reports/[id].tsx    client/app/(doctor)/lab-reports/add.tsx
client/app/(patient)/records/index.tsx    client/app/(patient)/prescriptions/index.tsx    client/app/(patient)/prescriptions/[id].tsx
client/app/(patient)/wards/index.tsx    client/app/(patient)/wards/[id].tsx
```

```bash
git add -A && git commit -m "feat(member-4): medical records and lab reports" && git push origin hospital
```

---

## Member 5 — Pharmacy, Prescriptions & Dispensing

**Server**:
```
server/src/modules/pharmacy/      (medicine.controller/model/routes/validation.ts)
server/src/modules/dispensing/    (dispense.controller/model/routes.ts)
server/src/modules/prescriptions/ (prescription.controller/model/routes.ts)
```

**Client Features**:
```
client/features/pharmacy/       (screens/MedicineListScreen.tsx, screens/MedicineDetailScreen.tsx, services/medicine.service.ts, components/index.ts)
client/features/prescriptions/  (screens/PrescriptionListScreen.tsx, screens/PrescriptionDetailScreen.tsx, services/prescription.service.ts)
client/features/dispensing/     (screens/PendingPrescriptionsScreen.tsx, screens/DispenseScreen.tsx, services/dispensing.service.ts)
```

**Client Routes**:
```
client/app/(pharmacist)/    (all files: _layout, index, profile, pharmacy/*, dispense/*)
client/app/(admin)/pharmacy/ (index.tsx, add-medicine.tsx, edit-medicine.tsx)
```

```bash
git add -A && git commit -m "feat(member-5): pharmacy and inventory" && git push origin hospital
```

---

## Member 6 — Billing & Payments

**Server** (`server/src/modules/billing/`):
```
invoice.controller.ts    invoice.routes.ts    invoice.validation.ts    invoice.model.ts
payment.controller.ts    payment.routes.ts    payment.validation.ts    payment.model.ts
```

**Client Features** (`client/features/billing/`):
```
services/invoice.service.ts    services/payment.service.ts
components/InvoiceCard.tsx     components/StatsCard.tsx     components/index.ts
```

**Client Routes**:
```
client/app/(admin)/billing/index.tsx    client/app/(admin)/billing/create.tsx
client/app/(patient)/billing/index.tsx  client/app/(patient)/billing/[id].tsx
client/app/(patient)/billing/pay/[id].tsx
client/app/(patient)/billing/pay/confirm/[id].tsx
client/app/(patient)/billing/pay/success/[id].tsx
```

```bash
git add -A && git commit -m "feat(member-6): billing and payments" && git push origin hospital
```

---

## Ward Management (Unassigned)

**Server**:
```
server/src/modules/wards/             (ward.controller/model/routes/validation.ts)
server/src/modules/wardAssignments/   (wardAssignment.controller/model/routes/validation.ts)
server/src/modules/wardMedications/   (wardMedication.controller/model/routes/validation.ts)
```

**Client Features**:
```
client/features/wards/              (screens/WardListScreen.tsx, screens/WardDetailScreen.tsx, services/ward.service.ts)
client/features/wardReceptionist/   (services/wardReceptionist.service.ts)
```

**Client Routes**:
```
client/app/(admin)/wards/       (index.tsx, [id].tsx, add.tsx)
client/app/(receptionist)/      (all files: _layout, index, profile, patients/*, beds/*, medications/*, billing/*)
```

```bash
git add -A && git commit -m "feat(ward): ward management" && git push origin hospital
```

---

## Rules

1. **Only add YOUR files.** Use `git add <specific files>` or verify with `git status` before commit.
2. **One commit per member.** Push immediately after committing.
3. **Pull before push** to avoid conflicts: `git pull origin hospital --rebase`
4. **`.gitkeep` files** preserve empty directories. Leave them alone.
