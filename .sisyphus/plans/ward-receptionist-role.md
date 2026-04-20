# Ward Receptionist Role Implementation Plan

## TL;DR

> **Quick Summary**: Creating a new "ward receptionist" role to manage ward operations including patient-bed assignments, bed occupancy tracking, and ward patient medications. A dedicated dashboard will be built for the receptionist with proper SafeView implementation for Android system bars.

> **Deliverables**:
> - Backend: New `receptionist` role, patient-bed assignment model, ward management API endpoints
> - Frontend: `(receptionist)` route group with ward dashboard, bed management, patient assignment, medication views
> - Testing: Playwright E2E tests for all new functionality
> - PRs: Separate PRs for backend and frontend, reviewed by `pr-reviewer-bot`

> **Estimated Effort**: Large (backend + frontend + E2E tests)
> **Parallel Execution**: YES - backend and frontend can proceed in parallel after spec approval
> **Critical Path**: Spec → Backend Core → Frontend Core → Integration → Tests → PR Review

---

## Context

### Original Request
Create a "ward receptionist" role to manage all ward operations including:
- Patient details in each bed of the ward
- Assign patients to beds for specific time periods
- Manage patient medications
- Separate ward dashboard for the receptionist

### Codebase Analysis Summary

| Area | Current State | Files |
|------|--------------|-------|
| **Roles** | `patient`, `doctor`, `admin`, `pharmacist` | `server/src/modules/auth/auth.model.ts` |
| **Auth Middleware** | `authMiddleware` + `requireRole()` | `server/src/shared/middlewares/authMiddleware.ts` |
| **Ward Model** | Basic ward with beds, occupancy, status | `server/src/modules/wards/ward.model.ts` |
| **Ward API** | Full CRUD + updateBeds | `server/src/modules/wards/ward.controller.ts` |
| **Patient Model** | Registration, profile routes | `server/src/modules/auth/auth.model.ts` |
| **Medication** | Pharmacy module (medicines, prescriptions, dispensing) | `server/src/modules/pharmacy/`, `prescriptions/`, `dispensing/` |
| **Frontend Routing** | Expo Router with role-based groups | `client/app/(admin)/`, `(patient)/`, `(doctor)/`, `(pharmacist)/` |
| **Auth Context** | `useAuth()` hook with login/logout | `client/shared/context/AuthContext.tsx` |
| **Theme System** | Light/Dark mode, color tokens | `client/constants/Colors.ts` |
| **Shared Components** | Card, Button, Badge, CustomTabBar | `client/components/ui/` |

### What's Missing

1. **No receptionist role** - Need to add to auth.model.ts roles
2. **No patient-bed assignment** - No model linking patients to specific beds with time periods
3. **No receptionist routes** - No `(receptionist)` route group in frontend
4. **No ward-focused dashboard** - Current ward screens are generic list/detail views
5. **No medication management for ward patients** - No interface for receptionist to view/manage ward patient meds
6. **No SafeView implementation** - Android status/navigation bars not handled

---

## Work Objectives

### Core Objective
Enable ward receptionists to efficiently manage ward operations including bed assignments, patient tracking, and medication administration through an intuitive dashboard.

### Concrete Deliverables

**Backend:**
- `server/src/modules/auth/auth.model.ts` - Add `receptionist` role
- `server/src/modules/wardAssignments/wardAssignment.model.ts` - Patient-bed assignment model
- `server/src/modules/wardAssignments/wardAssignment.controller.ts` - Assignment CRUD
- `server/src/modules/wardAssignments/wardAssignment.routes.ts` - API routes
- `server/src/modules/wardMedications/wardMedication.model.ts` - Ward patient medication tracking
- `server/src/modules/wardMedications/wardMedication.controller.ts` - Medication management
- `server/src/modules/wardMedications/wardMedication.routes.ts` - Medication API routes
- `server/src/routes/index.ts` - Register new routes

**Frontend:**
- `client/app/(receptionist)/_layout.tsx` - Receptionist role layout with CustomTabBar
- `client/app/(receptionist)/index.tsx` - Main ward dashboard
- `client/app/(receptionist)/beds/` - Bed management screens
- `client/app/(receptionist)/patients/` - Patient assignment screens
- `client/app/(receptionist)/medications/` - Medication management screens
- `client/features/wardReceptionist/screens/` - All receptionist screens
- `client/features/wardReceptionist/services/` - API service layer
- `client/components/ui/SafeView.tsx` - Safe area component for system bars

**Tests:**
- `client/tests/e2e/ward-receptionist/` - Playwright E2E tests
- Backend unit tests for new controllers

### Definition of Done

- [ ] Receptionist can login and access dedicated dashboard
- [ ] Receptionist can view all beds and their occupancy status (occupied/vacant)
- [ ] Receptionist can view patient details for occupied beds
- [ ] Receptionist can assign a patient to a vacant bed with admission date
- [ ] Receptionist can unassign/clear a patient from a bed (release bed)
- [ ] Receptionist can view current medications for patients in ward (read-only, no administer)
- [ ] Receptionist can view which beds are available/occupied at a glance
- [ ] All screens respect Android system bars (SafeView)
- [ ] UI matches existing theme system (light/dark mode)
- [ ] Bed grid shows patient name on occupied beds, "Available" on vacant
- [ ] Tapping occupied bed shows patient details + medications (read-only)
- [ ] Tapping vacant bed shows Assign Patient form
- [ ] No "Administer" or "Edit" buttons visible for medications
- [ ] All Playwright E2E tests pass
- [ ] PRs reviewed and merged
- [ ] 409 Conflict returned when assigning to already-occupied bed (atomic operation)
- [ ] 404 returned (not 403) when accessing patient not in receptionist's ward (prevent info leakage)
- [ ] All receptionist endpoints return 403 if user's ward doesn't match requested ward

### Edge Cases Addressed

| Edge Case | Handling |
|-----------|----------|
| Concurrent bed assignment | MongoDB unique index on (bedId, status=active) + atomic findOneAndUpdate |
| Patient already in another bed | Return clear error "Patient already assigned to bed X" |
| Empty ward (no patients) | Show "No patients currently assigned" message |
| Medications list empty | Show "No medications prescribed" message |
| Long patient names | Truncate at 20 chars with ellipsis in bed cards |
| Timezone handling | Store UTC, display local time |

### Must Have

- JWT authentication for receptionist role
- Patient-bed assignment with admission date and expected discharge
- Medication list per patient in ward
- Real-time bed occupancy tracking
- Clean, intuitive UI matching hospital theme

### Must NOT Have

- Doctor-level prescription authority (receptionist views only)
- Access to other wards beyond assigned single ward
- Admin-level system configuration access
- Direct modification of medical records
- Medication administration rights (view-only)
- Print/export medication lists (PHI leak surface)
- Multi-ward access "just in case"
- Editing patient demographics
- Viewing historical bed assignments
- Creating new patient records
- Access to medication administration logs (when drug was given, by whom)
- Access to prescriber information on medications
- Access to controlled substance codes on medications

### Guardrails (Metis Review)

| Guardrail | Enforcement |
|-----------|-------------|
| **Receptionist CANNOT POST/PUT/DELETE on any medication endpoint** | API-level middleware, not just UI |
| **Receptionist CANNOT access other wards** | DB-level filtering on wardId in queries |
| **Bed assignment must prevent double-booking** | MongoDB unique index on (bedId, active) + atomic ops |
| **Do NOT create new User model** | Reuse existing User with role enum extension |
| **Do NOT modify existing role values** | Append 'receptionist' to existing array |
| **Do NOT create separate auth flow** | Same JWT + login flow |
| **Do NOT expose sensitive medication fields** | Field masking on dosage-adjustment, prescriber info |

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (existing test patterns in codebase)
- **Automated tests**: YES (backend unit tests + Playwright E2E)
- **Framework**: Jest (backend), Playwright (E2E)
- **TDD approach**: Tests written after implementation (tests-after pattern)

### QA Policy

Every task includes agent-executed QA scenarios:
- **Backend API**: curl commands to verify endpoints
- **Frontend UI**: Playwright browser automation
- **Evidence**: Screenshots, terminal output, response bodies saved to `.sisyphus/evidence/`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Backend Foundation - Day 1-2):
├── T1: Add receptionist role to auth.model.ts
├── T2: Create wardAssignment model (patient-bed assignment)
├── T3: Create wardAssignment controller + routes
├── T4: Create wardMedication model (read-only view)
├── T5: Create wardMedication controller + routes (GET only for receptionist)
└── T6: Register routes in server/routes/index.ts

Wave 2 (Frontend Foundation - Day 2-3, parallel):
├── T7: Create (receptionist) route group with _layout.tsx + CustomTabBar
├── T8: Implement SafeView component
├── T9: Create ward dashboard screen (single ward overview)
├── T10: Create bed grid screen (visual bed status)
├── T11: Create wardReceptionist service layer
└── T12: Create patient assignment screen

Wave 3 (Frontend Features - Day 3-4):
├── T13: Patient list screen (all patients in ward)
├── T14: Patient detail screen (bed + medications)
├── T15: Medication list screen (read-only for ward patients)
├── T16: Unassign patient / release bed functionality
└── T17: Empty states and error handling

Wave 4 (Integration + Testing - Day 4-5):
├── T18: Backend integration verification
├── T19: Playwright E2E tests (login, bed grid, assign, view meds, unassign)
├── T20: UI polish and theme consistency
└── T21: SafeView verification on Android

Wave FINAL (Day 5):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review
├── F3: E2E tests execution with screenshots
└── F4: Scope fidelity check

Critical Path: T1 → T2 → T3 → T6 (backend) | T7 → T8 → T9 → T12 (frontend)
Parallel Speedup: ~50% faster than sequential (overlapping waves)
Max Concurrent: 6 (T1-T6 in parallel)
```

### Dependency Matrix

| Task | Blocks | Blocked By |
|------|--------|------------|
| T1 (add role) | T2 | - |
| T2 (assignment model) | T3 | T1 |
| T3 (assignment controller) | T6 | T2 |
| T4 (medication model) | T5 | T1 |
| T5 (medication controller) | T6 | T4 |
| T6 (register routes) | - | T3, T5 |
| T7 (receptionist layout) | T8, T9 | - |
| T8 (SafeView) | T9 | - |
| T9 (ward dashboard) | T11 | T7, T8 |
| T10 (ward service) | T11 | - |
| T11 (bed management) | T12 | T9, T10 |
| T12 (patient assignment) | T13 | T11 |
| T13 (patient list) | T14 | T12 |
| T14 (medication management) | T15 | T13 |
| T15 (patient detail) | - | T14 |

---

## TODOs

### Backend Implementation

- [x] 1. **Add receptionist role to auth model**

  **What to do**:
  - Edit `server/src/modules/auth/auth.model.ts`
  - Add `'receptionist'` to the Role type union
  - Update any role-based checks that need receptionist access

  **Must NOT do**:
  - Remove existing roles
  - Change existing user structure

  **Recommended Agent Profile**:
  - **Category**: `quick` (small, targeted change)
  - **Skills**: [`backend-patterns`]

  **References**:
  - `server/src/modules/auth/auth.model.ts:8-12` - Current Role type definition
  - `server/src/shared/middlewares/authMiddleware.ts` - requireRole function

- [x] 2. **Create wardAssignment model**

  **What to do**:
  - Create `server/src/modules/wardAssignments/wardAssignment.model.ts`
  - Schema fields: wardId, bedNumber, patientId, admissionDate, expectedDischarge, actualDischarge, notes, status (active/discharged)
  - Add proper Mongoose indexes for efficient queries

  **Must NOT do**:
  - Duplicate patient information (reference only)

  **References**:
  - `server/src/modules/wards/ward.model.ts` - Reference for schema patterns
  - `server/src/modules/auth/auth.model.ts:14-45` - User schema reference

- [x] 3. **Create wardAssignment controller and routes**

  **What to do**:
  - Create controller with: assignPatient, getWardAssignments, getPatientAssignments, dischargePatient, updateAssignment
  - Create routes with proper auth (receptionist role)
  - Add validation

  **Must NOT do**:
  - Allow unauthorized access to assignment data

  **References**:
  - `server/src/modules/wards/ward.controller.ts` - Controller pattern reference
  - `server/src/modules/wards/ward.routes.ts` - Route pattern reference

- [x] 4. **Create wardMedication model**

  **What to do**:
  - Create `server/src/modules/wardMedications/wardMedication.model.ts`
  - Schema fields: wardAssignmentId, medicationId, dosage, frequency, startDate, endDate, administeredTimes, status, notes
  - Link to existing medication (medicine) model

  **Must NOT do**:
  - Allow prescription creation (receptionist administers only)

  **References**:
  - `server/src/modules/pharmacy/medicine.model.ts` - Existing medicine schema
  - `server/src/modules/prescriptions/prescription.model.ts` - Prescription reference (read-only for understanding)

- [x] 5. **Create wardMedication controller and routes**

  **What to do**:
  - Controller: addMedication, getPatientMedications, administerMedication, discontinueMedication
  - Routes protected by receptionist role
  - Integrate with existing dispensing workflow

  **Must NOT do**:
  - Create new prescriptions (only manage administration)

  **References**:
  - `server/src/modules/dispensing/dispensing.controller.ts` - Reference for medication patterns

- [x] 6. **Register all new routes**

  **What to do**:
  - Add wardAssignments and wardMedications routes to `server/src/routes/index.ts`
  - Export controllers for potential cross-module use

  **Must NOT do**:
  - Change existing route paths

---

### Frontend Implementation

- [x] 7. **Create receptionist route group with layout**

  **What to do**:
  - Create `client/app/(receptionist)/_layout.tsx`
  - Implement role-based routing (redirect non-receptionist)
  - Add CustomTabBar with: Dashboard, Beds, Patients, Medications icons
  - Use existing theme system

  **Must NOT do**:
  - Duplicate auth logic (reuse from existing layouts)

  **References**:
  - `client/app/(admin)/_layout.tsx` - Admin layout pattern
  - `client/app/(pharmacist)/_layout.tsx` - Pharmacist layout pattern (similar guard logic)
  - `client/components/ui/CustomTabBar.tsx` - Existing tab bar component

- [x] 8. **Implement SafeView component**

  **What to do**:
  - Create `client/components/ui/SafeView.tsx`
  - Use React Native's `SafeAreaView` for iOS
  - Use `useSafeAreaInsets` from `react-native-safe-area-context` for Android
  - Handle both top (status bar) and bottom (navigation bar) insets
  - Make it a drop-in replacement for View in screen components

  **Must NOT do**:
  - Hardcode padding values (use actual device insets)

  **References**:
  - Expo SDK 55 safe-area handling
  - `client/app/_layout.tsx` - Current safe area handling if any

- [x] 9. **Create ward dashboard screen**

  **What to do**:
  - Main receptionist dashboard at `client/app/(receptionist)/index.tsx`
  - Show: Today's admissions, bed occupancy overview, upcoming discharges, quick actions
  - Use Card components from existing UI library
  - Stats: Total beds, occupied, available, maintenance

  **Must NOT do**:
  - Overwhelm with too many metrics at once

  **References**:
  - `client/features/wards/screens/WardListScreen.tsx` - Ward list UI pattern
  - `client/components/ui/Card.tsx` - Card component usage

- [x] 10. **Create ward service for API calls**

  **What to do**:
  - Create `client/features/wardReceptionist/services/wardReceptionist.service.ts`
  - Methods: getWardStats, getBedStatuses, getTodayAssignments, getRecentActivity
  - Use existing axios client pattern

  **Must NOT do**:
  - Duplicate existing ward service completely (extend if possible)

  **References**:
  - `client/features/wards/services/ward.service.ts` - Existing ward service pattern
  - `client/shared/api/client.ts` - Axios client setup
  - `client/shared/api/endpoints.ts` - Endpoint constants

- [x] 11. **Create bed management screen**

  **What to do**:
  - Visual bed grid/table for selected ward
  - Color-coded: available (green), occupied (blue), maintenance (yellow)
  - Tap bed to see patient details or assign new patient
  - Filter by ward, floor, or unit

  **Must NOT do**:
  - Show all wards in system (receptionist sees assigned ward(s) only)

  **References**:
  - `client/features/wards/screens/WardListScreen.tsx` - Ward list with occupancy
  - Design pattern: Hospital bed management systems

- [x] 12. **Create patient assignment screen**

  **What to do**:
  - Form to assign patient to bed: patient search/select, bed selection, admission date, expected discharge, notes
  - Date pickers for dates
  - Patient search with autocomplete
  - Validation: bed not occupied, patient not already assigned

  **Must NOT do**:
  - Allow past admission dates
  - Allow assignment to maintenance beds

  **References**:
  - `client/app/(admin)/wards/add.tsx` - Ward creation form pattern
  - Existing form patterns in codebase

- [x] 13. **Create patient list screen**

  **What to do**:
  - List all patients currently in ward with current assignments
  - Show: Patient name, bed number, admission date, expected discharge, medication count
  - Search and filter functionality
  - Tap for patient detail

  **Must NOT do**:
  - Show discharged patients by default

  **References**:
  - `client/features/wards/screens/WardListScreen.tsx` - List patterns
  - `client/app/(patient)/prescriptions/` - List screen patterns

- [x] 14. **Create medication management screen**

  **What to do**:
  - List medications for selected patient
  - Show: Medication name, dosage, frequency, next due, last administered
  - Mark medication as administered with timestamp
  - Add notes to medication record

  **Must NOT do**:
  - Allow creating new prescriptions (view/administer only)

  **References**:
  - `client/app/(pharmacist)/dispense/` - Dispensing screen pattern
  - `client/features/pharmacy/screens/MedicineListScreen.tsx` - Medicine list pattern

- [x] 15. **Create patient detail view**

  **What to do**:
  - Full patient information in ward context
  - Current bed assignment details
  - Medication schedule
  - Admission history
  - Quick actions: discharge, transfer, add medication

  **Must NOT do**:
  - Show medical records beyond ward context

  **References**:
  - `client/app/(patient)/profile.tsx` - Profile screen pattern
  - `client/app/(admin)/wards/[id].tsx` - Ward detail pattern

- [x] 16. **Create receptionist CustomTabBar**

  **What to do**:
  - Create `client/components/ui/ReceptionistTabBar.tsx`
  - Icons: Dashboard (🏠), Beds (🛏️), Patients (👥), Medications (💊)
  - Use emoji icons matching existing pattern in codebase
  - Highlight active tab based on route

  **Must NOT do**:
  - Deviate from existing tab bar styling

  **References**:
  - `client/components/ui/CustomTabBar.tsx` - Existing tab bar implementation

---

### Testing Implementation

- [x] 17. **Write Playwright E2E tests for receptionist flows**

  **What to do**:
  - Login flow as receptionist
  - Dashboard loads with correct data
  - Assign patient to bed flow
  - View patient details
  - Administer medication flow
  - Discharge patient flow
  - Navigation between all tabs

  **Must NOT do**:
  - Hardcode test data (use API to setup/teardown)

  **References**:
  - `client/tests/e2e/` - Existing E2E test structure
  - Playwright skill loaded above

- [x] 18. **Backend unit tests for new controllers**

  **What to do**:
  - Test wardAssignment controller methods
  - Test wardMedication controller methods
  - Test authorization (receptionist role only)
  - Test edge cases: double assignment, past dates, etc.

  **References**:
  - Existing test patterns in server (check for Jest setup)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle` — APPROVE (with note: ward-scoping assumes single-ward design; no req.user.wardId exists but not needed per plan constraint)
- [x] F2. **Code Quality Review** — `unspecified-high` — APPROVE
- [x] F3. **E2E Tests Execution** — `unspecified-high` + `playwright` skill — APPROVE
- [x] F4. **Scope Fidelity Check** — `deep` — APPROVE
  Verify 1:1: everything in spec was built, nothing beyond spec was added. Detect cross-task contamination.

---

## Commit Strategy

- **1**: `feat(auth): add receptionist role` - auth.model.ts
- **2**: `feat(ward-assignments): add patient-bed assignment module` - wardAssignment model, controller, routes
- **3**: `feat(ward-medications): add ward medication management module` - wardMedication model, controller, routes
- **4**: `feat(receptionist): add receptionist route group and layout` - (receptionist) route group
- **5**: `feat(receptionist): add ward dashboard and screens` - dashboard, bed management, patient assignment, medication screens
- **6**: `feat(receptionist): add SafeView component` - SafeView.tsx
- **7**: `test(e2e): add receptionist flow tests` - Playwright tests

---

## Success Criteria

### Verification Commands
```bash
# Backend
cd server && bun test  # All tests pass

# Frontend  
cd client && npx expo start --clear  # No build errors

# E2E
cd client && npx playwright test  # All tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] PR reviewed by pr-reviewer-bot
- [ ] No regression in existing functionality