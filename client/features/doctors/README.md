# Feature: Doctors — Member 2

## Assignment
**Member 2** owns everything inside `client/features/doctors/` and the `server/src/modules/doctors/` backend module.

## Scope
- Browse/search doctor listings (public)
- View individual doctor profile
- Admin: create, update, delete doctor profiles

## Files

| File | Status | Notes |
|---|---|---|
| `services/doctor.service.ts` | ✅ Scaffold | All API calls typed |
| `screens/DoctorListScreen.tsx` | ✅ Scaffold | Filterable list with FlatList |
| `screens/DoctorDetailScreen.tsx` | ✅ Scaffold | Full profile + book button |
| `components/index.ts` | ✅ Scaffold | Add shared components here |

## Screens to Implement

| Screen | Route | Auth Required |
|---|---|---|
| `DoctorListScreen` | `/(tabs)/doctors` | No (read-only) |
| `DoctorDetailScreen` | `/doctors/[id]` | No (read); Yes (admin actions) |

## API Endpoints Consumed

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/doctors` | No | List all doctors (filterable) |
| `GET` | `/doctors/:id` | No | Doctor profile |
| `POST` | `/doctors` | Admin | Create doctor |
| `PUT` | `/doctors/:id` | Admin / Doctor | Update doctor |
| `DELETE` | `/doctors/:id` | Admin | Delete doctor |

## Filters (query params for GET /doctors)

```
?specialization=Cardiology
?availability=Available
```

## Usage

```tsx
import { doctorService } from '@/features/doctors/services/doctor.service';

// In a screen:
const doctors = await doctorService.getDoctors({ availability: 'Available' });
const doctor = await doctorService.getDoctorById('abc123');
```

## TODOs

- [ ] Wire `DoctorListScreen` into tab navigator
- [ ] Wire `DoctorDetailScreen` into Expo Router dynamic route `/doctors/[id]`
- [ ] Connect "Book Appointment" button to navigate to `BookAppointmentScreen` (Member 3)
- [ ] Add specialization filter picker (replace text input)
- [ ] Admin: build edit form in `DoctorDetailScreen`
- [ ] Extract `DoctorCard` into `components/DoctorCard.tsx` for reuse
