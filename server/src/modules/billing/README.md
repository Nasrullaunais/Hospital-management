# Module: Billing & Deployment

**Assigned to:** Member 6 — Phase 6

---

## Scope

Handles hospital finances (invoice generation, line-item billing, payment processing, payment verification) **and** the full AWS deployment of the production system.

---

## Your Files

| File | Purpose |
|------|---------|
| `invoice.model.ts` | Mongoose Invoice schema with line items + computed totalAmount — **DONE** |
| `invoice.controller.ts` | Route handlers (CRUD + stats) — **DONE** |
| `invoice.routes.ts` | Route definitions — **DONE** |
| `invoice.validation.ts` | Input validation (items array + discount) — **DONE** |
| `payment.model.ts` | Mongoose Payment schema (Stripe-ready) — **DONE** |
| `payment.controller.ts` | Payment handlers (create, process, list) — **DONE** |
| `payment.routes.ts` | Payment route definitions — **DONE** |
| `payment.validation.ts` | Payment validation — **DONE** |

---

## API Endpoints

### Invoices (`/api/invoices`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/invoices` | 🔒 Admin | Create invoice with line items |
| GET | `/api/invoices/stats` | 🔒 Admin | Dashboard statistics |
| GET | `/api/invoices/my-bills` | 🔒 Patient | Patient's own bills |
| GET | `/api/invoices` | 🔒 Admin | All invoices (filterable by status/patient) |
| GET | `/api/invoices/:id` | 🔒 Both | Invoice detail |
| PUT | `/api/invoices/:id/pay` | 🔒 Patient | Upload payment receipt → "Pending Verification" |
| PUT | `/api/invoices/:id/verify` | 🔒 Admin | Verify → "Paid" |
| DELETE | `/api/invoices/:id` | 🔒 Admin | Delete invoice |

### Payments (`/api/payments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payments` | 🔒 Patient | Create payment (mock_card auto-completes) |
| GET | `/api/payments/invoice/:invoiceId` | 🔒 Both | Payment history |
| GET | `/api/payments/:id` | 🔒 Both | Payment detail |
| POST | `/api/payments/:id/process` | 🔒 Both | Process payment (Stripe-ready) |

---

## Invoice Schema

```typescript
{
  patientId: ObjectId         // ref: User
  appointmentId?: ObjectId    // ref: Appointment (optional)
  invoiceNumber: string       // auto-generated: INV-YYYY-XXXX
  items: [{                   // line items
    description: string       // required, max 200 chars
    category: enum            // consultation | medicine | lab_test | ward | procedure | other
    quantity: number          // min 1, max 1000
    unitPrice: number         // min 0
  }]
  discount: number            // default 0, min 0
  totalAmount: number         // VIRTUAL: sum(items) - discount, capped at 0
  subtotal: number            // VIRTUAL: sum of items
  paymentStatus: enum         // Unpaid | Pending Verification | Paid | Overdue
  issuedDate: Date            // default: now
  dueDate: Date               // default: now + 30 days
  paymentReceiptUrl?: string
  notes?: string              // max 500 chars
}
```

---

## AWS Deployment Guide (Member 6 Responsibility)

### Architecture

```
Internet → Route 53 (DNS)
         → ALB (Application Load Balancer)
         → EC2 / ECS (Express app)
         → MongoDB Atlas (via private connection)
         → S3 (file uploads)
```

### Steps

#### 1. MongoDB Atlas
- Create a free-tier cluster at https://cloud.mongodb.com
- Whitelist EC2 instance IP (or use 0.0.0.0/0 for initial testing, then restrict)
- Copy the connection string to `MONGO_URI`

#### 2. AWS EC2 Setup
```bash
# On EC2 instance (Amazon Linux 2023)
curl -fsSL https://bun.sh/install | bash
git clone <repo-url>
cd Hospital-management/server
cp .env.example .env
# Fill in production values
bun install --production
bun start
```

#### 3. Process Manager (keep server alive)
```bash
bun add -g pm2
pm2 start "bun src/index.ts" --name hospital-api
pm2 startup
pm2 save
```

#### 4. Switch file uploads from local disk to S3
- Edit `server/src/shared/middlewares/uploadMiddleware.ts`
- Replace `multer.diskStorage` with `multer-s3` using values from env:
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- Update `packagingImageUrl`, `licenseDocumentUrl`, etc. to use full S3 URLs

#### 5. Environment Variables (Production)
Store securely in **AWS Systems Manager Parameter Store** or **Secrets Manager**:
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — 64-byte random hex string
- `AWS_*` — S3 credentials

#### 6. NGINX Reverse Proxy (optional but recommended)
```nginx
server {
  listen 80;
  server_name api.yourdomain.com;
  location / {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

#### 7. SSL Certificate
- Use **AWS Certificate Manager** (ACM) with ALB for HTTPS
- Or use **Let's Encrypt** with Certbot on EC2

---

## Security Checklist for Production

- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` is 64+ character random string
- [ ] MongoDB Atlas IP whitelist is restricted
- [ ] AWS Security Group: only port 80/443 open to 0.0.0.0/0
- [ ] S3 bucket is private (not public-read)
- [ ] CORS origins restricted to your app domain
- [ ] Helmet.js is enabled (already configured in `index.ts`)
