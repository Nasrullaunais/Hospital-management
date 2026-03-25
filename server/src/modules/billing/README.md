# Module: Billing, Insurance & Deployment

**Assigned to:** Member 6 — Phase 6

---

## Scope

This is the most critical phase: handles hospital finances (invoice generation, payment receipt uploads, payment verification) **and** the full AWS deployment of the production system.

---

## Your Files

| File | Purpose |
|------|---------|
| `invoice.model.ts` | Mongoose Invoice schema — **DONE** |
| `invoice.controller.ts` | Route handlers — **DONE** |
| `invoice.routes.ts` | Route definitions — **DONE** |
| `invoice.validation.ts` | Input validation — **DONE** |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/invoices` | 🔒 Admin | Create invoice |
| GET | `/api/invoices/my-bills` | 🔒 Patient | Patient's own bills |
| GET | `/api/invoices` | 🔒 Admin | All invoices (filterable) |
| PUT | `/api/invoices/:id/pay` | 🔒 Patient | Upload payment receipt → status → "Pending Verification" |
| PUT | `/api/invoices/:id/verify` | 🔒 Admin | Verify payment → status → "Paid" |
| DELETE | `/api/invoices/:id` | 🔒 Admin | Delete invoice |

---

## Invoice Schema

```typescript
{
  patientId: ObjectId         // ref: User
  appointmentId?: ObjectId    // ref: Appointment (optional)
  totalAmount: number         // required, min: 0
  paymentStatus: 'Unpaid' | 'Pending Verification' | 'Paid'  // default: Unpaid
  issuedDate: Date            // default: now
  paymentReceiptUrl?: string  // set when patient uploads receipt
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
