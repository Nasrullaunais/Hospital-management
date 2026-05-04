# Feature: Appointments — Member 3

## Assignment
**Member 3** owns `client/features/appointments/` and `server/src/modules/appointments/`.

## Scope
- Book a new appointment with a doctor
- View own upcoming and past appointments
- Cancel a pending appointment
- Doctor / Admin: view doctor's schedule, update appointment status

## Files

| File | Status | Notes |
|---|---|---|
| `services/appointment.service.ts` | ✅ Scaffold | All API calls typed |
| `screens/BookAppointmentScreen.tsx` | ✅ Scaffold | Booking form with basic fields |
| `screens/MyAppointmentsScreen.tsx` | ✅ Scaffold | Patient appointments list with cancel |
| `components/index.ts` | ✅ Scaffold | Add shared components here |

## Screens to Implement

| Screen | Route | Auth Required |
|---|---|---|
| `BookAppointmentScreen` | `/appointments/book` | Yes (patient) |
| `MyAppointmentsScreen` | `/(tabs)/appointments` | Yes (patient) |

## API Endpoints Consumed

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/appointments` | Patient | Book appointment |
| `GET` | `/appointments/my-appointments` | Patient | My appointments |
| `GET` | `/appointments/doctor/:id` | Doctor / Admin | Doctor's schedule |
| `PUT` | `/appointments/:id/status` | Doctor / Admin | Update status |
| `DELETE` | `/appointments/:id` | Patient | Cancel appointment |

## Appointment Status Flow

```
Pending → Confirmed → Completed
         ↘
          Cancelled
```

## Usage

```tsx
import { appointmentService } from '@/features/appointments/services/appointment.service';

// Book an appointment:
const appointment = await appointmentService.bookAppointment({
  doctorId: 'abc123',
  appointmentDate: '2025-08-15T09:00:00.000Z',
  reasonForVisit: 'Routine checkup',
});

// Patient's appointments:
const list = await appointmentService.getMyAppointments();
```

## TODOs

- [ ] Replace Doctor ID text input with a doctor search/picker (integrate with Member 2's DoctorListScreen)
- [ ] Replace date text input with `@react-native-community/datetimepicker`
- [ ] Add referral document upload (use `expo-document-picker`)
- [ ] Add tabs in `MyAppointmentsScreen`: "Upcoming" vs "Past"
- [ ] Build a "Doctor Schedule" screen for doctor role (using `getDoctorSchedule`)
- [ ] Add appointment detail modal / screen
