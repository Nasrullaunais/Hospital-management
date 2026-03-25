# Feature: Billing — Member 6

## Assignment
**Member 6** owns `client/features/billing/` and `server/src/modules/billing/`.

## Scope
- Patients: view own invoices and upload payment receipts
- Admins: view all invoices, create invoices, verify payments, delete invoices

## Files

| File | Status | Notes |
|---|---|---|
| `services/invoice.service.ts` | ✅ Scaffold | All API calls typed |
| `screens/InvoiceListScreen.tsx` | ✅ Scaffold | Patient-/admin-aware list |
| `screens/PaymentScreen.tsx` | ✅ Scaffold | Receipt upload form |
| `components/index.ts` | ✅ Scaffold | Add shared components here |

## Screens to Implement

| Screen | Route | Auth Required |
|---|---|---|
| `InvoiceListScreen` | `/(tabs)/billing` | Yes (patient / admin) |
| `PaymentScreen` | `/billing/pay/[id]` | Yes (patient) |

## API Endpoints Consumed

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/invoices` | Admin | Create invoice |
| `GET` | `/invoices/my-bills` | Patient | Own invoices |
| `GET` | `/invoices` | Admin | All invoices |
| `PUT` | `/invoices/:id/pay` | Patient | Upload receipt |
| `PUT` | `/invoices/:id/verify` | Admin | Verify + mark paid |
| `DELETE` | `/invoices/:id` | Admin | Delete invoice |

## Payment Status Flow

```
Unpaid → (patient uploads receipt) → Pending Verification → (admin verifies) → Paid
```

## Usage

```tsx
import { invoiceService } from '@/features/billing/services/invoice.service';

// Patient loads own bills:
const bills = await invoiceService.getMyBills();

// Patient uploads receipt:
const formData = new FormData();
formData.append('file', { uri, name: 'receipt.jpg', type: 'image/jpeg' } as any);
await invoiceService.uploadPaymentReceipt(invoiceId, formData);

// Admin verifies:
await invoiceService.verifyPayment(invoiceId);
```

## TODOs

- [ ] Wire `InvoiceListScreen` into tab navigator
- [ ] Wire `PaymentScreen` into `/billing/pay/[id]` dynamic route
- [ ] Integrate `expo-document-picker` into `PaymentScreen` for real file selection
- [ ] Show receipt preview image before uploading
- [ ] Admin: add create invoice form
- [ ] Admin: add filter controls in `InvoiceListScreen` (by status / patient)
- [ ] Add summary stats card at top of admin view (total unpaid, pending, paid)

## AWS Deployment Notes

See `server/src/modules/billing/README.md` for the complete AWS deployment guide including:
- EC2 setup with pm2
- RDS / DocumentDB options
- S3 for receipt file storage
- CloudFront CDN
- Nginx reverse proxy + SSL
