# Module: Pharmacy & Inventory Management

**Assigned to:** Member 5 — Phase 5

---

## Scope

Manage the hospital's medication inventory: add medicines, track stock levels, update prices and quantities, and upload packaging images.

---

## Your Files

| File | Purpose |
|------|---------|
| `medicine.model.ts` | Mongoose Medicine schema — **DONE** |
| `medicine.controller.ts` | Route handlers — **DONE** |
| `medicine.routes.ts` | Route definitions — **DONE** |
| `medicine.validation.ts` | Input validation — **DONE** |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/medicines` | 🔒 Admin | Add medicine + upload packaging image |
| GET | `/api/medicines` | 🔒 Any | List all medicines (filterable by category) |
| GET | `/api/medicines/:id` | 🔒 Any | Get medicine details |
| PUT | `/api/medicines/:id` | 🔒 Admin | Update stock, price, expiry |
| DELETE | `/api/medicines/:id` | 🔒 Admin | Remove obsolete medicine |

---

## Medicine Schema

```typescript
{
  name: string             // required
  category: string         // required
  price: number            // required, min: 0
  stockQuantity: number    // required, min: 0
  expiryDate: Date         // required, must be future date
  packagingImageUrl: string // required, from file upload
}
```

---

## Notes

- Packaging image is required on creation (`packagingImage` form field).
- Use `?category=Antibiotic` query param to filter by category.
- Stock updates should use limited field updates (stockQuantity, price, expiryDate only) to prevent data corruption.
