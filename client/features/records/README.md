# Feature: Medical Records — Member 4

## Assignment
**Member 4** owns `client/features/records/` and `server/src/modules/records/`.

## Scope
- Patients: view own medical records list and detail
- Doctors: create records with optional lab report upload
- Admins: delete records

## Files

| File | Status | Notes |
|---|---|---|
| `services/record.service.ts` | ✅ Scaffold | All API calls typed |
| `screens/RecordListScreen.tsx` | ✅ Scaffold | Patient records list |
| `screens/RecordDetailScreen.tsx` | ✅ Scaffold | Full record view, admin delete |
| `components/index.ts` | ✅ Scaffold | Add shared components here |

## Screens to Implement

| Screen | Route | Auth Required |
|---|---|---|
| `RecordListScreen` | `/(tabs)/records` or `/records` | Yes (patient/doctor/admin) |
| `RecordDetailScreen` | `/records/[id]` | Yes |

## API Endpoints Consumed

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/records` | Doctor | Create record |
| `GET` | `/records/patient/:id` | Auth | Patient's records |
| `GET` | `/records/:id` | Auth | Single record |
| `PUT` | `/records/:id` | Doctor | Update record |
| `DELETE` | `/records/:id` | Admin | Delete record |

## Security Notes
- Patients can only access their **own** records (enforced by backend)
- Doctors can access any patient's records
- Admins can delete any record

## Usage

```tsx
import { recordService } from '@/features/records/services/record.service';

// Patient loads their own records:
const records = await recordService.getPatientRecords(user._id);

// Doctor creates a record with lab report:
const formData = new FormData();
formData.append('patientId', patientId);
formData.append('diagnosis', 'Hypertension Stage 1');
formData.append('file', { uri, name: 'lab.pdf', type: 'application/pdf' } as any);
const record = await recordService.createRecord(formData);
```

## TODOs

- [ ] Wire `RecordListScreen` into tab navigator
- [ ] Wire `RecordDetailScreen` into `/records/[id]` dynamic route
- [ ] Doctors: build a "Create Record" modal/screen with file upload
- [ ] Open `labReportUrl` in `expo-web-browser` or `react-native-pdf`
- [ ] Add date range filter in `RecordListScreen`
