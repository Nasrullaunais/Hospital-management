# Feature: Pharmacy — Member 5

## Assignment
**Member 5** owns `client/features/pharmacy/` and `server/src/modules/pharmacy/`.

## Scope
- Browse medicine catalog (filterable by category)
- View individual medicine details
- Admin: add, edit, delete medicines with optional image upload

## Files

| File | Status | Notes |
|---|---|---|
| `services/medicine.service.ts` | ✅ Scaffold | All API calls typed |
| `screens/MedicineListScreen.tsx` | ✅ Scaffold | Catalog with image, stock, expiry warnings |
| `screens/MedicineDetailScreen.tsx` | ✅ Scaffold | Detail with admin actions |
| `components/index.ts` | ✅ Scaffold | Add shared components here |

## Screens to Implement

| Screen | Route | Auth Required |
|---|---|---|
| `MedicineListScreen` | `/(tabs)/pharmacy` | Yes |
| `MedicineDetailScreen` | `/pharmacy/[id]` | Yes |

## API Endpoints Consumed

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/medicines` | Auth | List medicines (filterable) |
| `GET` | `/medicines/:id` | Auth | Single medicine |
| `POST` | `/medicines` | Admin | Add medicine |
| `PUT` | `/medicines/:id` | Admin | Update medicine |
| `DELETE` | `/medicines/:id` | Admin | Remove medicine |

## Filters

```
GET /medicines?category=Antibiotic
```

## Usage

```tsx
import { medicineService } from '@/features/pharmacy/services/medicine.service';

// Browse all antibiotics:
const meds = await medicineService.getMedicines({ category: 'Antibiotic' });

// Admin adds a medicine with image:
const formData = new FormData();
formData.append('name', 'Amoxicillin');
formData.append('category', 'Antibiotic');
formData.append('price', '4.99');
formData.append('stockQuantity', '500');
formData.append('expiryDate', '2027-01-01');
formData.append('file', { uri, name: 'amox.jpg', type: 'image/jpeg' } as any);
await medicineService.createMedicine(formData);
```

## TODOs

- [ ] Wire `MedicineListScreen` into tab navigator
- [ ] Wire `MedicineDetailScreen` into `/pharmacy/[id]` dynamic route
- [ ] Replace text category filter with chip selector
- [ ] Admin: build "Add Medicine" form screen with `expo-image-picker` for packaging photo
- [ ] Show expiry warning banner in detail screen (within 30 days)
- [ ] Add low-stock alert for admin dashboard
