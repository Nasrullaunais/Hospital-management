# Feature: Billing — Member 6

## Assignment
**Member 6** owns `client/features/billing/` and `server/src/modules/billing/`.

## Scope
- Patients: view own invoices with line items, pay via mock payment or bank transfer
- Admins: create invoices with line items, view dashboard stats, filter invoices, verify payments, delete invoices

## Files

| File | Status | Notes |
|---|---|---|
| `services/invoice.service.ts` | ✅ Complete | createInvoice with items, getStats, CRUD |
| `services/payment.service.ts` | ✅ Complete | createPayment, getByInvoice, getById, process |
| `components/InvoiceCard.tsx` | ✅ Complete | Dual-role card with Pay Now, Upload Receipt, Verify, Delete, overdue |
| `components/StatsCard.tsx` | ✅ Complete | Admin dashboard stats with by-status breakdown |
| `components/index.ts` | ✅ Complete | Barrel exports |

## Screens

| Screen | Route | Status |
|---|---|---|
| Admin Billing List | `app/(admin)/billing/index.tsx` | ✅ Stats card + filter chips |
| Admin Create Invoice | `app/(admin)/billing/create.tsx` | ✅ Patient search + line items |
| Patient Billing List | `app/(patient)/billing/index.tsx` | ✅ Navigates to detail on tap |
| Patient Invoice Detail | `app/(patient)/billing/[id].tsx` | ✅ Items table + Pay Now |
| Payment Method | `app/(patient)/billing/pay/[id].tsx` | ✅ Card / Bank Transfer |
| Payment Confirmation | `app/(patient)/billing/pay/confirm/[id].tsx` | ✅ Mock card + bank details |
| Payment Success | `app/(patient)/billing/pay/success/[id].tsx` | ✅ Paid / Pending states |

## Payment Status Flow

```
Unpaid → [Patient taps Pay Now]
    ├── Card Payment (mock) → Completed → Paid
    └── Bank Transfer → Upload Receipt → Pending Verification → [Admin verifies] → Paid
                                                                    → [Auto-detect] → Overdue
```

## Navigation

```
InvoiceCard (Unpaid/Overdue)
  → Press → billing/[id] (detail with items table)
  → Pay Now → billing/pay/[id] (method select)
      → Card → billing/pay/confirm/[id]?method=mock_card → Confirm → success (✅)
      → Bank → billing/pay/confirm/[id]?method=bank_transfer → Upload → success (⏳)
```

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/invoices` | Admin | Create invoice with line items |
| `GET` | `/invoices/stats` | Admin | Dashboard statistics |
| `GET` | `/invoices/my-bills` | Patient | Own invoices |
| `GET` | `/invoices` | Admin | All invoices (filterable) |
| `GET` | `/invoices/:id` | Both | Invoice detail with items |
| `PUT` | `/invoices/:id/pay` | Patient | Upload payment receipt |
| `PUT` | `/invoices/:id/verify` | Admin | Verify + mark paid |
| `DELETE` | `/invoices/:id` | Admin | Delete invoice |
| `POST` | `/payments` | Patient | Create payment (mock_card auto-completes) |
| `GET` | `/payments/invoice/:invoiceId` | Both | Payment history |
| `POST` | `/payments/:id/process` | Both | Process payment (future Stripe) |

## Stripe-Ready Architecture

Payment model uses `method: 'mock_card' | 'bank_transfer' | 'stripe'` with `stripePaymentIntentId` field and `metadata` Map. To integrate Stripe:
1. Add `stripe` method route
2. Create PaymentIntent server-side
3. Pass client_secret to mobile app
4. `processPayment` handles confirmation — no breaking changes needed

