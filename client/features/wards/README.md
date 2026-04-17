# Feature: Wards

**Module:** Departments & Wards

---

## Overview

Manage hospital wards including ward details, bed tracking, occupancy status, and type classification (general, private, ICU, emergency).

---

## Files

| File | Purpose |
|------|---------|
| `services/ward.service.ts` | API service for ward operations |
| `screens/WardListScreen.tsx` | List view of all wards with filters |
| `screens/WardDetailScreen.tsx` | Ward detail view with occupancy management |

---

## Services

### wardService

```typescript
getWards(filters?: WardFilters): Promise<Ward[]>
getWardById(id: string): Promise<Ward>
createWard(payload: CreateWardPayload): Promise<Ward>
updateWard(id: string, payload: UpdateWardPayload): Promise<Ward>
deleteWard(id: string): Promise<void>
updateBeds(id: string, payload: UpdateBedsPayload): Promise<Ward>
```

### Types

```typescript
interface WardFilters {
  departmentId?: string;
  type?: 'general' | 'private' | 'icu' | 'emergency';
  status?: 'available' | 'full' | 'maintenance';
}

interface CreateWardPayload {
  departmentId: string;
  name: string;
  type: 'general' | 'private' | 'icu' | 'emergency';
  totalBeds: number;
  currentOccupancy?: number;
}

interface UpdateWardPayload {
  departmentId?: string;
  name?: string;
  type?: 'general' | 'private' | 'icu' | 'emergency';
  totalBeds?: number;
  currentOccupancy?: number;
  status?: 'available' | 'full' | 'maintenance';
}

interface UpdateBedsPayload {
  currentOccupancy: number;
}
```

---

## Usage

```typescript
import { wardService } from '../services/ward.service';

// List all wards
const wards = await wardService.getWards();

// Filter wards
const icuWards = await wardService.getWards({ type: 'icu' });
const availableWards = await wardService.getWards({ status: 'available' });

// Get single ward
const ward = await wardService.getWardById(id);

// Create ward (Admin)
const newWard = await wardService.createWard({
  departmentId: '65abc123...',
  name: 'ICU Bay 1',
  type: 'icu',
  totalBeds: 10,
});

// Update ward (Admin)
await wardService.updateWard(id, { status: 'maintenance' });

// Update bed occupancy (Admin)
await wardService.updateBeds(id, { currentOccupancy: 8 });

// Delete ward (Admin)
await wardService.deleteWard(id);
```

---

## Screens

### WardListScreen

- Displays all wards in a scrollable list
- Search functionality by ward name
- Visual progress bar showing bed occupancy
- Color-coded status badges (available=green, full=red, maintenance=yellow)
- Admin: Shows "Add Ward" button

### WardDetailScreen

- Shows full ward information including department
- Bed availability breakdown with visual progress bar
- Admin: Edit, Update Bed Occupancy, and Delete action buttons
- Quick bed occupancy update via Alert.prompt

---

## Auto-Status Logic

Ward status is automatically set based on occupancy:
- **available**: currentOccupancy < totalBeds
- **full**: currentOccupancy >= totalBeds
- **maintenance**: manually set by admin (preserved on occupancy updates)
