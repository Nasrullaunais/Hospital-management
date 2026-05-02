# Member 6 — Billing & Payments

> **Your Job**: Everything related to hospital billing — generating invoices with line items, collecting payments (mock card + bank transfer), verifying receipts, and providing financial dashboards. Billing is handled by **receptionists** (day-to-day) and **admins** (oversight). The payment module is built Stripe-ready so a real payment gateway can be plugged in later without breaking anything.

---

## 1. When Does Payment Come in the Customer's Flow?

Payment happens **after** the hospital provides a service. Here's the complete patient journey:

```
Patient visits hospital
  → Receptionist registers / Doctor creates appointment (Members 2, 3)
  → Doctor examines patient, creates medical record (Member 4)
  → Doctor prescribes medicine or orders lab tests (Members 4, 5)
  → ADMIN or RECEPTIONIST creates an INVOICE with line items for the services rendered  ← MEMBER 6
  → PATIENT receives the invoice (status: Unpaid)
  → PATIENT chooses how to pay:
      ├── "Card Payment" (mock) → instant confirmation → Invoice marked Paid
      └── "Bank Transfer" → uploads receipt → Invoice marked "Pending Verification"
  → STAFF reviews the receipt → verifies → Invoice marked Paid
  → If patient doesn't pay by due date → Invoice auto-marked Overdue
```

**Key insight**: The invoice is created **by receptionist or admin** after services are rendered. The patient **then** pays. This mirrors real hospital workflows where billing happens at discharge (or after a consultation).

Payment is NOT a prerequisite for receiving care — it's a settlement step that happens after.

---

## 2. What You Own (Your Files)

Your code has three parts: **invoices** (billing), **payments** (collecting money), and **staff dashboard** (financial overview).

### Part A — Invoices (Billing Core)

Invoices track what a patient owes. Each invoice has **line items** so it can bill for consultations, medicines, lab tests, ward stays, procedures — anything the hospital charges for.

| File | What It Does |
|------|-------------|
| `server/src/modules/billing/invoice.model.ts` | Defines the Invoice schema — line items array, virtual totalAmount, payment status |
| `server/src/modules/billing/invoice.controller.ts` | Create, read, update, delete invoices + stats aggregation |
| `server/src/modules/billing/invoice.routes.ts` | Maps `/api/invoices` URLs to controller functions |
| `server/src/modules/billing/invoice.validation.ts` | Validates incoming invoice data (items, patient, discount) |
| `client/features/billing/services/invoice.service.ts` | Typed API calls for all invoice operations + `formatCurrency()` |
| `client/features/billing/components/InvoiceCard.tsx` | Reusable card showing amount, status badge, action buttons |
| `client/app/(admin)/billing/index.tsx` | Admin billing list with stats + filter chips |
| `client/app/(admin)/billing/create.tsx` | Admin form: patient search + dynamic line items + discount |
| `client/app/(receptionist)/billing/index.tsx` | Receptionist billing list with stats + filter chips |
| `client/app/(receptionist)/billing/create.tsx` | Receptionist form: patient search + dynamic line items + discount |
| `client/app/(patient)/billing/index.tsx` | Patient's invoice list (tappable → detail) |
| `client/app/(patient)/billing/[id].tsx` | Patient invoice detail with items table + Pay Now button |

### Part B — Payments (Collecting Money)

The Payment module is separate from Invoices. One invoice can have multiple payment attempts (if the first fails). The model is designed so Stripe can be plugged in later by adding `method: 'stripe'` — no other code changes needed.

| File | What It Does |
|------|-------------|
| `server/src/modules/billing/payment.model.ts` | Payment schema — method enum (mock_card, bank_transfer, stripe), Stripe-ready fields |
| `server/src/modules/billing/payment.controller.ts` | Create payment, process payment, list by invoice |
| `server/src/modules/billing/payment.routes.ts` | Maps `/api/payments` URLs to controller functions |
| `server/src/modules/billing/payment.validation.ts` | Validates payment creation (invoiceId, method) |
| `client/features/billing/services/payment.service.ts` | Typed API calls for payment operations |
| `client/app/(patient)/billing/pay/[id].tsx` | Payment method selection screen (Card vs Bank Transfer) |
| `client/app/(patient)/billing/pay/confirm/[id].tsx` | Confirmation: mock card form OR bank details + receipt upload |
| `client/app/(patient)/billing/pay/success/[id].tsx` | Success screen (✅ paid) or pending verification (⏳) |

### Part C — Staff Dashboard

| File | What It Does |
|------|-------------|
| `client/features/billing/components/StatsCard.tsx` | Stats chips: Total, Unpaid, Pending, Paid, This Month — with counts + amounts |

### Part D — Shared Changes (for other members to be aware of)

| File | What Was Changed |
|------|-----------------|
| `client/shared/types/index.ts` | Added `InvoiceItem`, `InvoiceStats`, `InvoiceStatsByStatus`, `Payment` types |
| `client/shared/api/endpoints.ts` | Added `INVOICES.STATS`, `PATIENTS.SEARCH`, `PAYMENTS` group |
| `client/shared/utils/statusStyles.ts` | Added `Overdue` case (solid red bg, white text) |
| `server/src/shared/constants/billing.ts` | `INVOICE_PREFIX='INV'`, `MAX_INVOICE_AMOUNT=1_000_000` |
| `server/src/routes/index.ts` | Registered `/api/payments` route group |

### Part E — Documentation

| File | What It Does |
|------|-------------|
| `server/src/modules/billing/README.md` | Module docs + schema + API table + AWS deployment guide |
| `client/features/billing/README.md` | Client-side docs + navigation map + endpoint table |
| `Docs/Member-6-Billing-and-Payments.md` | This file — comprehensive reference |

---

## 3. How It All Works (The Logic)

### Creating an Invoice (Receptionist or Admin)

```
1. Staff member (receptionist or admin) logs in
2. Admin navigates to Finance tab → taps "Create Invoice"
3. Admin searches for a patient (auto-complete dropdown)
4. Admin adds line items:
   - Description: e.g. "Consultation Fee"
   - Category: consultation / medicine / lab_test / ward / procedure / other
   - Quantity: e.g. 1
   - Unit Price: e.g. Rs. 2,500.00
5. Admin can add multiple items (tap "Add Item")
6. Optional: discount amount, notes
7. Total = sum(all items × quantity × unitPrice) - discount
8. Taps "Create Invoice" → POST /api/invoices
9. Server:
   a. Validates patient exists
   b. Generates invoice number: INV-2026-0001 (auto-incrementing)
   c. Sets due date = now + 30 days
   d. Sets paymentStatus = "Unpaid"
   e. Saves to MongoDB
10. Patient can now see the invoice in their billing list
```

Invoice Status Flow:
```
Unpaid → (patient pays) → Pending Verification or Paid
       → (due date passes) → Overdue (auto-detected on GET)
```

### Mock Card Payment (Patient)

```
1. Patient logs in, sees invoice with "Pay Now" button (red for Overdue, accent for Unpaid)
2. Taps "Pay Now" → Payment Method screen
3. Selects "Card Payment"
4. Taps "Continue" → Confirmation screen
5. Sees a decorative card form (card number, expiry, CVV — purely visual)
6. Taps "Confirm Payment" → POST /api/payments { invoiceId, method: 'mock_card' }
7. Server:
   a. Finds the invoice, verifies it belongs to this patient
   b. Creates a Payment record with status "completed"
   c. Sets completedAt = now
   d. Updates invoice.paymentStatus = "Paid"
   e. Returns payment details
8. Patient sees ✅ success screen with:
   - Green checkmark
   - "Payment Successful!" heading
   - Invoice number, amount paid
   - "View Invoice" and "Back to Bills" buttons
```

### Bank Transfer Payment (Patient)

```
1. Same flow as card payment, but selects "Bank Transfer"
2. Confirmation screen shows:
   - Bank details (hardcoded hospital account info)
   - Reference number: INV-YYYY-XXXX
   - "Upload Transfer Receipt" button (uses expo-document-picker)
3. Patient uploads JPG/PNG/PDF receipt
4. Taps "Submit" →
   a. POST /api/payments { invoiceId, method: 'bank_transfer' } → creates pending payment
   b. PUT /api/invoices/:id/pay → uploads receipt, status → "Pending Verification"
5. Patient sees ⏳ "Receipt Submitted" screen:
   - Clock icon
   - "Your payment is being verified. This usually takes 24-48 hours."
6. Admin later reviews and verifies → status changes to "Paid"
```

### Admin Verifies a Bank Transfer

```
1. Admin opens Finance tab → sees invoice with "Pending Verification" status
2. Taps "Verify Payment" on the invoice card
3. Confirms in the alert dialog
4. Server sets invoice.paymentStatus = "Paid"
5. The invoice disappears from the pending filter
6. Stats dashboard updates automatically on next refresh
```

### Auto-Overdue Detection

```
Whenever invoices are fetched (GET /api/invoices or GET /api/invoices/my-bills):
  - Server checks each invoice: is dueDate in the past AND status is "Unpaid"?
  - If yes → auto-updates status to "Overdue"
  - Uses a 5-minute cache TTL to avoid repeated DB writes
  - Overdue invoices show red accent bar + ⚠️ icon in the UI
```

### Data Flow Between Modules

```
  [User (Patient)] ─────────┐
  [Appointment] ────────────┤──> Invoice
  [Pharmacy/Medicines] ─────┤       ├── items[] (line items: what was charged)
  [Lab Reports] ────────────┤       ├── discount
  [Ward Stay] ──────────────┘       ├── totalAmount (virtual: items sum - discount)
                             │       ├── paymentStatus (Unpaid → Paid → Overdue)
                             │       └── patientId (ref to User)
                             │
                             └──> Payment (NEW)
                                      ├── invoiceId (ref to Invoice)
                                      ├── method (mock_card | bank_transfer | stripe)
                                      ├── status (pending → completed → refunded)
                                      └── stripePaymentIntentId (future Stripe)
```

---

## 4. Complete API Reference

### Invoices API (`/api/invoices`)

| Method | URL | Who Can Use | What It Does |
|--------|-----|-------------|-------------|
| `POST` | `/api/invoices` | Receptionist, Admin | Create invoice with line items |
| `GET` | `/api/invoices/stats` | Receptionist, Admin | Dashboard: total invoices, by-status breakdown, this month |
| `GET` | `/api/invoices/my-bills` | Patient | Patient's own invoices (paginated, auto-marks overdue) |
| `GET` | `/api/invoices` | Receptionist, Admin | All invoices (filterable by `?status=` and `?patientId=`) |
| `GET` | `/api/invoices/:id` | Patient, Receptionist, Admin | Single invoice detail (populates patient + appointment) |
| `PUT` | `/api/invoices/:id/pay` | Patient | Upload payment receipt → status "Pending Verification" |
| `PUT` | `/api/invoices/:id/verify` | Receptionist, Admin | Verify payment → status "Paid" |
| `DELETE` | `/api/invoices/:id` | Admin | Delete invoice (receptionists cannot delete) |

**Create Invoice Payload:**
```json
{
  "patientId": "abc123...",
  "appointmentId": "xyz789...",
  "items": [
    { "description": "Consultation Fee", "category": "consultation", "quantity": 1, "unitPrice": 2500 },
    { "description": "Amoxicillin 500mg", "category": "medicine", "quantity": 2, "unitPrice": 350 },
    { "description": "CBC Blood Test", "category": "lab_test", "quantity": 1, "unitPrice": 1200 }
  ],
  "discount": 200,
  "notes": "Follow-up visit. 10% senior citizen discount applied."
}
```

**Stats Response:**
```json
{
  "success": true,
  "data": {
    "totalInvoices": 156,
    "totalAmount": 320000,
    "byStatus": {
      "Unpaid": { "count": 23, "total": 45200 },
      "Pending Verification": { "count": 8, "total": 12400 },
      "Paid": { "count": 120, "total": 258000 },
      "Overdue": { "count": 5, "total": 4400 }
    },
    "thisMonth": { "count": 45, "total": 98000 }
  }
}
```

### Payments API (`/api/payments`)

| Method | URL | Who Can Use | What It Does |
|--------|-----|-------------|-------------|
| `POST` | `/api/payments` | Patient | Create payment (`mock_card` auto-completes; `bank_transfer` stays pending) |
| `GET` | `/api/payments/invoice/:invoiceId` | Patient, Admin | All payments for an invoice |
| `GET` | `/api/payments/:id` | Patient, Admin | Single payment detail |
| `POST` | `/api/payments/:id/process` | Patient, Admin | Process/retry payment (Stripe-ready endpoint) |

**Create Payment Payload:**
```json
{
  "invoiceId": "inv_abc123...",
  "method": "mock_card"
}
```

**Payment Response:**
```json
{
  "success": true,
  "data": {
    "_id": "pay_xyz789...",
    "invoiceId": "inv_abc123...",
    "patientId": "patient_456...",
    "amount": 6400,
    "currency": "LKR",
    "method": "mock_card",
    "status": "completed",
    "stripePaymentIntentId": null,
    "completedAt": "2026-05-01T10:30:00.000Z",
    "createdAt": "2026-05-01T10:30:00.000Z"
  }
}
```

---

## 5. How to Test / Demo (Step by Step — In the App)

### Prerequisites

- MongoDB must be running: `docker-compose up -d`
- Server must be started: `cd server && bun run dev` (runs on `http://localhost:5000`)
- Database should be seeded: `cd server && bun run src/scripts/seed.ts`
- Mobile app must be running: `cd client && bun start` (then scan QR with Expo Go, or press `a` for Android / `i` for iOS)

### Demo Credentials (from seed data)

| Role | Email | Password |
|------|-------|----------|
| Receptionist | `receptionist@hospital.com` | `Password123` |
| Admin | `admin@hospital.com` | `Password123` |
| Patient | `robert.w@example.com` | `Password123` |
| Doctor | `dr.petrov@hospital.com` | `Password123` |

### Complete Demo Flow — Full Billing Cycle

#### Step 1: Login as Receptionist (or Admin)

1. Open the app on your phone/emulator
2. Login as receptionist: `receptionist@hospital.com` / `Password123`
   - Or login as admin: `admin@hospital.com` / `Password123`
3. On the receptionist Home screen you'll see tabs: **Dashboard**, **Beds**, **Patients**, **Billing**, **Meds**, **Profile**
   - On admin: tabs include **Finance** (same functionality)

#### Step 2: View Dashboard Stats

1. Tap the **Billing** tab (receptionist) or **Finance** tab (admin)
2. At the top, you'll see the **Stats Card** with horizontally scrollable chips:
   - **Total**: total invoice count + total revenue
   - **Unpaid** (red): count of unpaid invoices + amount
   - **Pending** (amber): awaiting verification
   - **Paid** (green): completed payments
   - **This Month** (blue): current month's revenue
3. Below the stats, you'll see **filter chips**: All | Unpaid | Pending Verification | Paid | Overdue
4. Tap a filter chip to see only invoices with that status
5. Pull down to refresh both stats and the filtered list

#### Step 3: Create an Invoice

1. Tap the **"Create Invoice"** button (floating or in the header)
2. You'll see the Create Invoice form:
   - **Patient Search**: Type a patient name (e.g. "Robert") — matching patients appear in a dropdown. Tap to select.
   - **Line Items**: Each row has:
     - Description: e.g. "Consultation Fee"
     - Category: tap a category chip (consultation, medicine, lab_test, ward, procedure, other)
     - Quantity: tap to edit (defaults to 1)
     - Unit Price: tap to enter amount (e.g. 2500)
     - Per-line total shown on the right
   - Tap **"Add Item"** to add more rows
   - Tap **"×"** on any row to remove it (minimum 1 item)
   - **Running Total** shown at the bottom: Subtotal, Discount, Grand Total
3. Optionally enter a **Discount** amount and **Notes**
4. Tap **"Create Invoice"**
5. You'll see a success alert — the invoice is now in the list

#### Step 4: Login as Patient and Pay (Mock Card)

1. Log out (Profile tab → Logout)
2. Login as patient: `robert.w@example.com` / `Password123`
3. On the Home screen, find the **billing section** or navigate to the invoices list
4. You'll see the invoice you just created with status **Unpaid**
5. Notice two buttons on the card:
   - **"Pay Now"** (prominent, accent-colored) ← tap this
   - **"Upload Receipt"** (secondary, for bank transfer)
6. Tapping **"Pay Now"** opens the Payment Method screen showing:
   - Invoice summary (number, date, items, total amount)
   - **"💳 Card Payment"** card — "Instant payment (simulated)"
   - **"🏦 Bank Transfer"** card — "Upload receipt for verification"
7. Tap **"Card Payment"** (it highlights), then tap **"Continue"**
8. You'll see the Confirmation screen with a decorative card form:
   - Card Number field
   - Expiry Date (MM/YY)
   - CVV field
   - Cardholder Name field
   - Note: "This is a simulated payment. Stripe integration coming soon."
9. Tap **"Confirm Payment"**
10. You'll see the ✅ Success screen:
    - Large green checkmark
    - "Payment Successful!" heading
    - Invoice number and amount paid
    - **"View Invoice"** button → goes to invoice detail
    - **"Back to Bills"** button → goes to billing list
11. Go back to the billing list — the invoice now shows **Paid** (green badge)

#### Step 5: Test Bank Transfer Flow

1. Create another invoice as receptionist/admin (repeat Step 3)
2. Login as patient again
3. Find the new Unpaid invoice, tap **"Pay Now"**
4. Select **"🏦 Bank Transfer"** → tap **"Continue"**
5. You'll see:
   - Hospital bank details (static):
     ```
     Bank: Sample Bank
     Account Name: Hospital Management
     Account Number: 1234567890
     Branch: Main Branch
     Reference: INV-2026-0002
     ```
   - **"Upload Transfer Receipt"** button
6. Tap to select a receipt (JPG/PNG/PDF from your phone)
7. The file name appears below the button
8. Tap **"Submit Payment"**
9. You'll see ⏳ "Receipt Submitted" screen:
   - Clock icon
   - "Your payment is being verified. This usually takes 24-48 hours."
10. Go back to the billing list — the invoice now shows **Pending Verification** (amber badge)

#### Step 6: Login as Staff and Verify the Payment

1. Log out, login as `receptionist@hospital.com` or `admin@hospital.com`
2. Go to **Billing** tab (receptionist) or **Finance** tab (admin)
3. Tap the **"Pending Verification"** filter chip to see only pending invoices
4. Find the invoice, tap **"Verify Payment"** button (green)
5. Confirm in the dialog
6. The invoice status changes to **Paid**

#### Step 7: Test Invoice Detail and Navigation

1. Login as patient
2. Tap on any invoice card (the whole card is tappable) — this navigates to the detail screen
3. The detail screen shows:
   - Invoice number and date
   - Due date
   - Full items table (description, quantity × unit price, per-line totals)
   - Discount (if any)
   - Grand total
   - Payment status badge
   - Receipt image (if uploaded)
   - Notes (if any)
   - **"Pay Now"** button at bottom (if Unpaid/Overdue)

#### Step 8: Test Overdue Detection

1. Create an invoice with a past due date (or wait for the 30-day window to pass in seed data)
2. On the patient or admin billing list, pull to refresh
3. Overdue invoices show:
   - Red left accent bar on the card
   - ⚠️ warning icon next to the status badge
   - Red "Pay Now" button
   - Appear under the "Overdue" filter chip

### Testing Security (What Each Role Can/Cannot Do)

| Action | Patient | Receptionist | Admin |
|--------|---------|:---:|:---:|
| View own invoices | ✅ | ✅ | ✅ |
| View all invoices | ❌ | ✅ | ✅ |
| View dashboard stats | ❌ | ✅ | ✅ |
| Create invoice | ❌ | ✅ | ✅ |
| Pay via mock card | ✅ | ❌ | ❌ |
| Upload bank receipt | ✅ | ❌ | ❌ |
| Verify payment | ❌ | ✅ | ✅ |
| Delete invoice | ❌ | ❌ | ✅ |
| View own payments | ✅ | ✅ | ✅ |
| Filter by status | ❌ | ✅ | ✅ |

### Demo Flow Summary

```
RECEPTIONIST/ADMIN: Login → Billing/Finance tab → Stats → Create Invoice (patient + items)
  → PATIENT: Login → See Unpaid invoice → "Pay Now"
      → Card Payment → Confirm → ✅ Success (instant)
      → Bank Transfer → Upload Receipt → ⏳ Pending Verification
  → RECEPTIONIST/ADMIN: Login → Filter "Pending Verification" → Verify → Paid
  → PATIENT: Login → See Paid invoice → Tap for detail → View items table
```

---

## 6. How Payments Work (Under the Hood)

### The Payment Model

The Payment model is **separate from Invoice**. This means:
- One invoice can have multiple payment attempts
- Payment history is preserved even if an invoice is deleted
- Stripe integration only touches the Payment model — invoices stay unchanged

```typescript
{
  invoiceId: ObjectId,              // ref: Invoice
  patientId: ObjectId,              // ref: User
  amount: number,                   // copied from invoice.totalAmount at payment time
  currency: 'LKR' | 'USD',          // default: LKR
  method: 'mock_card' | 'bank_transfer' | 'stripe',  // ← Stripe-ready
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded',
  stripePaymentIntentId?: string,   // ← populated when Stripe is integrated
  metadata: Map<string, string>,    // ← extensible (e.g. { 'stripe_customer': 'cus_xxx' })
  receiptUrl?: string,              // for bank transfer receipts
  completedAt?: Date                // set when payment succeeds
}
```

### Mock Card: What Actually Happens

```
1. Patient taps "Confirm Payment"
2. Client calls: POST /api/payments { invoiceId, method: 'mock_card' }
3. Server:
   a. Finds invoice, checks ownership (patientId matches req.user)
   b. Creates Payment record with status = 'completed'
   c. Sets completedAt = now
   d. Updates Invoice.paymentStatus = 'Paid'
   e. Returns payment object
4. Client navigates to success screen
5. NO actual money moves — this is a simulation
```

### Bank Transfer: What Actually Happens

```
1. Patient uploads receipt file
2. Client calls: POST /api/payments { invoiceId, method: 'bank_transfer' }
   → Server creates Payment with status = 'pending'
3. Client calls: PUT /api/invoices/:id/pay (multipart form with receipt file)
   → Server uploads receipt, sets Invoice.paymentStatus = 'Pending Verification'
4. Admin later taps "Verify Payment"
5. Client calls: PUT /api/invoices/:id/verify { paymentStatus: 'Paid' }
6. Server sets Invoice.paymentStatus = 'Paid'
```

### Stripe-Ready Architecture

To integrate Stripe later, add a `method: 'stripe'` case:
```
1. Server: create Stripe PaymentIntent → return client_secret
2. Client: Stripe Elements or Stripe.js handles the card form
3. Client: POST /api/payments { invoiceId, method: 'stripe', stripePaymentIntentId: 'pi_xxx' }
4. Server: confirms the PaymentIntent with Stripe API
5. Server: updates Payment.status → 'completed', Invoice → 'Paid'
```
The `stripePaymentIntentId` field and `metadata` Map already exist — no schema migration needed.

---

## 7. Troubleshooting

### "Patient not found"
→ The patient ID doesn't exist. Make sure you selected a patient from the auto-complete dropdown (don't type raw IDs).

### "At least one invoice item is required"
→ You must add at least one line item before creating an invoice. Tap "Add Item" and fill in the fields.

### "Invoice not found"
→ The invoice ID is invalid or the invoice was deleted.

### "You can only pay your own invoices"
→ A patient is trying to pay someone else's invoice. This is blocked by server-side ownership checks.

### "Only admins can verify payments"
→ A non-admin user is trying to verify a payment. This is blocked by role middleware.

### Receipt upload fails
→ Check that the file is JPG, PNG, or PDF. Other formats are rejected. Also check server disk space if using local storage.

### Pull-to-refresh not updating stats
→ The StatsCard uses a `refreshKey` prop that remounts on pull. If the stats don't update, pull down harder or navigate away and back.

### "Cannot find module" errors when starting server
→ Make sure you ran `bun install` in the server directory. If using `tsc`, note that the project uses `bun --watch` for development.

---

## 8. Files You Should NOT Touch

These belong to other members. Your code reads from them but does not modify them:

| Module | Member | What You Use |
|--------|--------|-------------|
| `server/src/modules/auth/` | Common | User (patient) data: name, email, role |
| `server/src/modules/appointments/` | Member 3 | Appointment reference on invoice |
| `server/src/modules/pharmacy/` | Member 5 | Medicine data for line item billing |
| `server/src/modules/records/` | Member 4 | Medical record reference |
| `server/src/shared/middlewares/authMiddleware.ts` | Common | JWT verification, `requireRole()` |
| `server/src/shared/middlewares/uploadMiddleware.ts` | Common | Multer file upload handling |
| `server/src/shared/services/s3.service.ts` | Common | S3 presigned URL generation |
| `server/src/shared/utils/ApiError.ts` | Common | Standardized error responses |
| `client/shared/context/AuthContext.tsx` | Common | `useAuth()` hook, user roles |
| `client/shared/api/client.ts` | Common | Axios instance with auth interceptor |
| `client/constants/Colors.ts` | Common | Theme colors |
| `client/constants/ThemeTokens.ts` | Common | Spacing, radius, shadow tokens |

---

## 9. Quick Reference — All Your Endpoints

```
# INVOICES
POST   /api/invoices                          Create invoice with line items
GET    /api/invoices/stats                    Admin dashboard statistics
GET    /api/invoices/my-bills                 Patient's own invoices
GET    /api/invoices                          All invoices (?status=&patientId=)
GET    /api/invoices/:id                      Single invoice detail
PUT    /api/invoices/:id/pay                  Upload receipt → Pending Verification
PUT    /api/invoices/:id/verify               Verify → Paid
DELETE /api/invoices/:id                      Delete invoice (admin)

# PAYMENTS
POST   /api/payments                          Create payment (mock_card auto-completes)
GET    /api/payments/invoice/:invoiceId       Payment history for invoice
GET    /api/payments/:id                      Single payment detail
POST   /api/payments/:id/process              Process/retry payment (Stripe-ready)
```

---

## 10. Navigation Map (Client)

```
app/(admin)/
  ├── billing/index.tsx        → Finance tab: Stats + filter chips + invoice list
  └── billing/create.tsx       → Create invoice form (patient search + items)

app/(receptionist)/
  ├── billing/index.tsx        → Billing tab: Stats + filter chips + invoice list
  └── billing/create.tsx       → Create invoice form (patient search + items)

app/(patient)/
  ├── billing/index.tsx        → My Bills list (tap → detail)
  ├── billing/[id].tsx         → Invoice detail (items table + Pay Now)
  └── billing/pay/
      ├── [id].tsx             → Payment method selection (Card / Bank Transfer)
      ├── confirm/[id].tsx     → Card form / Bank details + upload
      └── success/[id].tsx     → ✅ Paid / ⏳ Pending Verification
```
