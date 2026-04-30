# Member 4 — Medical Records & Lab Reports

> **Your Job**: Everything related to patient medical records, lab test results, and generating printable PDF reports (lab reports, prescriptions, medical certificates).

---

## 1. What You Own (Your Files)

Think of your code in three parts: **the old stuff** (medical records), **the new stuff** (structured lab reports), and **PDF generation** (turning data into printable documents).

### Part A — Medical Records (already existed)

These let doctors write down what's wrong with a patient (diagnosis) and what medicine to take (prescription). They can also attach a scanned lab report PDF.

| File | What It Does |
|------|-------------|
| `server/src/modules/records/record.model.ts` | Defines what a medical record looks like in the database |
| `server/src/modules/records/record.controller.ts` | Handles create, read, update, delete for records |
| `server/src/modules/records/record.routes.ts` | Maps URLs to controller functions |
| `server/src/modules/records/record.validation.ts` | Checks that incoming data is correct |
| `client/features/records/screens/RecordListScreen.tsx` | Mobile screen showing a patient's record history |
| `client/features/records/screens/RecordDetailScreen.tsx` | Mobile screen showing one record's details |
| `client/features/records/services/record.service.ts` | Functions that talk to the backend API |
| `client/app/(doctor)/records/index.tsx` | The doctor's "My Patient Records" screen |
| `client/app/(doctor)/records/[id].tsx` | Doctor's record detail screen (with edit + lab report view) |
| `client/app/(patient)/records/index.tsx` | Patient's "My Medical History" screen |

### Part B — Structured Lab Reports (NEW — You Need to Demo This)

The old system only allowed uploading a scanned PDF. The new system lets doctors enter **structured lab results** — blood tests, urine tests, X-rays, etc. — with actual numbers, reference ranges, and color-coded flags.

| File | What It Does |
|------|-------------|
| `server/src/modules/labReports/labReport.model.ts` | Database model for lab results (test type, patient, results array) |
| `server/src/modules/labReports/labReport.controller.ts` | CRUD operations for lab reports |
| `server/src/modules/labReports/labReport.routes.ts` | API routes: `/api/lab-reports` |
| `server/src/modules/labReports/labReport.validation.ts` | Ensures lab data is valid before saving |

### Part C — PDF Report Generation (NEW — Most Impressive Part)

This is the coolest part. It takes data from the database and turns it into a **professional PDF document** that looks like a real hospital printout. Three types of PDFs can be generated:

| File | What It Does |
|------|-------------|
| `server/src/modules/reports/report.controller.ts` | Takes a request, fetches data, and kicks off PDF generation |
| `server/src/modules/reports/report.routes.ts` | API routes: `/api/reports` |
| `server/src/shared/services/reportGenerator.ts` | The actual PDF engine — uses Handlebars templates + Puppeteer (Chrome) to render HTML into a PDF, then uploads to S3 |
| `server/src/shared/templates/lab-report.hbs` | HTML template for the lab report PDF (with color-coded results table) |
| `server/src/shared/templates/prescription.hbs` | HTML template for the prescription PDF (with ℞ symbol + QR code slot) |
| `server/src/shared/templates/medical-certificate.hbs` | HTML template for the medical certificate PDF (with watermark + stamp) |

### Part D — Client-Side (NEW — Complete UI)

| File | What It Does |
|------|-------------|
| `client/shared/types/index.ts` | Added `LabReport`, `LabResult`, `ReportGenerateResponse` type definitions |
| `client/shared/api/endpoints.ts` | Added `LAB_REPORTS` and `REPORTS` URL constants |
| `client/features/records/services/labReport.service.ts` | **New**: API calls for lab report CRUD |
| `client/features/records/services/report.service.ts` | **New**: API calls for PDF generation |
| `client/app/(doctor)/lab-reports/add.tsx` | **New**: Create lab report form (patient picker, lab type chips, dynamic results table) |
| `client/app/(doctor)/lab-reports/[id].tsx` | **New**: Lab report detail with results table + PDF generation + review button |
| `client/app/(doctor)/records/[id].tsx` | Updated: fixed report actions with "Generate Certificate" + "Add Lab Report" buttons |
| `client/app/(doctor)/_layout.tsx` | Updated: registered `lab-reports/add` and `lab-reports/[id]` stack screens |

### Part E — Route Registration

| File | What Was Changed |
|------|-----------------|
| `server/src/routes/index.ts` | Added two new route groups under Member 4's section |

---

## 2. How It All Works (The Logic)

### Creating a Structured Lab Report

```
1. Doctor logs in (JWT token)
2. Doctor sends POST to /api/lab-reports with:
   {
     "patientId": "abc123...",
     "labType": "hematology",
     "results": [
       { "parameter": "Hemoglobin", "value": 14.2, "unit": "g/dL", "normalRange": "13.5-17.5", "flag": "normal" },
       { "parameter": "WBC", "value": 11000, "unit": "/μL", "normalRange": "4000-11000", "flag": "high" }
     ]
   }
3. Server verifies the doctor exists (using findDoctorProfileByUserId)
4. Server checks the patient exists
5. If medicalRecordId is provided, server verifies it belongs to the same patient
6. Lab report is saved to MongoDB with status "pending"
7. Doctor can update results and change status to "completed"

Lab Report Status Flow:
  pending → sample_collected → in_progress → completed → reviewed
```

### Generating a PDF Lab Report

```
1. Doctor sends POST to /api/reports/lab-report with { "labReportId": "xyz789..." }
2. Server fetches the lab report from MongoDB (populates patient + doctor info)
3. Server checks: is the status "completed" or "reviewed"? (won't generate for pending ones)
4. Server builds template data (patient name, doctor name, all test results with color flags)
5. The ReportGenerator service:
   a. Reads the lab-report.hbs HTML template
   b. Injects the data using Handlebars ({{patientName}}, {{#each results}}...{{/each}})
   c. Opens a headless Chrome browser (Puppeteer)
   d. Renders the HTML → prints to A4 PDF
   e. Uploads the PDF to AWS S3 (or saves to /tmp/reports/ if S3 is not configured)
   f. Returns a download URL (valid for 1 hour)
6. Mobile app opens the URL in the device's browser/PDF viewer
```

### How the Data Flows Between Modules

```
  [User (Patient)] ─────────┐
  [Doctor Profile] ─────────┤
  [Appointment] ────────────┤──> MedicalRecord <── diagnosis + prescription text
                             │         │
                             │         └── Optional: links to LabReport via medicalRecordId
                             │
                             └──> LabReport (NEW)
                                       ├── labType (hematology, biochemistry, etc.)
                                       ├── results[] (parameter, value, unit, normalRange, flag)
                                       ├── interpretation
                                       └── status (pending → completed → reviewed)
                                          
  When generating a PDF:
  LabReport ──population──> Patient Name, Age, Phone
                  ──population──> Doctor Name, Specialization
                  ──template──> lab-report.hbs
                  ──puppeteer──> PDF file
                  ──S3 upload──> Download URL
```

---

## 3. Complete API Reference

### Lab Reports API (`/api/lab-reports`)

| Method | URL | Who Can Use | What It Does |
|--------|-----|-------------|-------------|
| `POST` | `/api/lab-reports` | Doctor | Create a new lab report with test results |
| `GET` | `/api/lab-reports/patient/:patientId` | Any logged-in user | Get all lab reports for a patient |
| `GET` | `/api/lab-reports/:id` | Any logged-in user | Get one lab report by ID |
| `PUT` | `/api/lab-reports/:id` | Doctor (owner only) | Update results, status, interpretation |
| `PATCH` | `/api/lab-reports/:id/review` | Doctor (owner only) | Mark lab report as "reviewed" |
| `DELETE` | `/api/lab-reports/:id` | Admin only | Delete a lab report |

### Report Generation API (`/api/reports`)

| Method | URL | Who Can Use | What It Does |
|--------|-----|-------------|-------------|
| `POST` | `/api/reports/lab-report` | Doctor | Generate a lab report PDF (body: `{ "labReportId": "..." }`) |
| `POST` | `/api/reports/prescription` | Doctor | Generate a prescription PDF (body: `{ "prescriptionId": "..." }`) |
| `POST` | `/api/reports/medical-certificate` | Doctor | Generate a sick note PDF (body: `{ "recordId": "...", "restFrom": "2026-05-01", "restTo": "2026-05-05" }`) |

All report endpoints return:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://s3.../presigned-url.pdf",
    "fileKey": "hospital-management/reports/lab-report_abc123_1714567890.pdf"
  }
}
```

---

## 4. How to Test / Demo (Step by Step — In the App)

### Prerequisites
- MongoDB must be running: `docker-compose up -d`
- Server must be started: `cd server && bun run dev` (runs on `http://localhost:5000`)
- Database should be seeded: `cd server && bun run src/scripts/seed.ts`
- Mobile app must be running: `cd client && bun start` (then scan QR with Expo Go, or press `a` for Android / `i` for iOS)

> **Important**: The first time you generate a PDF, Puppeteer downloads Chromium (~300MB). This happens once automatically — just be patient.

### Demo Credentials (from seed data)

| Role | Email | Password |
|------|-------|----------|
| Doctor | `dr.petrov@hospital.com` | `Password123` |
| Doctor | `dr.sharma@hospital.com` | `Password123` |
| Patient | `robert.w@example.com` | `Password123` |

> Use any doctor account. `dr.petrov@hospital.com` works best since they have patients with existing medical records.

### Complete Demo Flow (All in the App)

#### Step 1: Login as Doctor

1. Open the app on your phone/emulator
2. Enter email: `dr.petrov@hospital.com`, password: `Password123`
3. You'll land on the Doctor Home screen with 4 tabs: **Home**, **Schedule**, **Patients**, **Profile**

#### Step 2: View Existing Medical Records

1. Tap the **Patients** tab (bottom navigation)
2. You'll see a list of medical records you've created
3. Each card shows: patient initials, name, date, diagnosis summary
4. Tap any record card to open its detail screen
5. On the detail screen you'll see:
   - Patient info header (name, date, record badge)
   - Doctor info row
   - Diagnosis section (editable)
   - Prescription section (with medicine items from prescriptions module)
   - **Report Actions** section (NEW!)

#### Step 3: Create a Structured Lab Report

1. From a patient's record detail, tap the **"Add Lab Report for Patient"** button
2. This opens the **New Lab Report** screen
3. The patient is pre-selected (from the record)
4. Tap a **lab type** chip:
   - 🩸 Hematology (blood count)
   - 📈 Biochemistry (metabolic panel)
   - 🔬 Microbiology (cultures)
   - 👁 Urinalysis
   - 🖥 Radiology (X-ray/CT)
   - 🧪 Serology (antibody tests)
   - 🩺 Pathology (tissue analysis)
   - ⋯ Other
5. Add test results by tapping **"Add Result"**:
   - **Parameter**: e.g. "Hemoglobin"
   - **Value**: e.g. "14.2" (numeric keyboard)
   - **Unit**: e.g. "g/dL"
   - **Normal Range**: e.g. "13.5 - 17.5" (optional)
   - **Flag**: tap Normal / High / Low / Critical (color-coded pills)
6. Add as many results as you need (minimum 1)
7. Scroll down, add an **Interpretation** if you want (pathologist's notes)
8. Tap **"Create Lab Report"** at the bottom
9. You'll see a success alert — tap OK to go back

#### Step 4: Open the Lab Report and Complete It

1. The newly created lab report's status is "pending"
2. On the lab report detail screen (opens after creation or via navigation), you'll see:
   - **Status badge**: Pending (yellow) — this means results aren't final yet
   - **Results table**: All parameters with their values, units, reference ranges, and colored flag badges
     - Green = normal
     - Amber = high
     - Blue = low
     - Red = critical
   - Below the table: info text saying "Complete the lab results to generate a PDF"
3. To complete the lab report, you need to update its status. You can do this by editing the lab report (the edit screen works the same way as medical records — tap the edit icon)

#### Step 5: Generate the PDF Lab Report

1. Once the lab report status is "completed" or "reviewed":
   - A green **"Generate PDF Report"** button appears
2. Tap it — you'll see a loading spinner: "Generating..."
3. After a few seconds, the PDF opens in your phone's browser/PDF viewer:
   - Beautiful A4 document with hospital letterhead
   - **Color-coded results table** (green = normal, amber = abnormal, red = critical)
   - Patient information, doctor name, lab type, test date
   - Pathologist interpretation section
   - Signature area with hospital stamp
4. You can share, print, or save the PDF from your phone's share menu

#### Step 6: Generate a Medical Certificate

1. Go back to any patient record detail (tap **Patients** tab → tap a record)
2. In the **Report Actions** section, tap **"Generate Medical Certificate"**
3. A confirmation dialog appears — tap **"Generate"**
4. The certificate PDF opens — a formal medical certificate with:
   - Official letterhead
   - Patient name, age, ID
   - Diagnosis
   - Doctor's signature area
   - Hospital stamp
   - Watermark background

#### Step 7: View as a Patient

1. Log out (Profile tab → Logout)
2. Login as a patient: `robert.w@example.com` / `Password123`
3. Go to the records/list section
4. You'll see your own medical records and lab reports
5. You CANNOT create records or generate PDFs (only doctors can)

### Demo Flow Summary

```
Login as Doctor → Patients tab → Tap record → "Add Lab Report" 
→ Select lab type → Add results → Create 
→ Open lab report → "Generate PDF" → View beautiful PDF in browser

Back to record detail → "Generate Medical Certificate" → View certificate PDF
```

#### Step 1: Login as a Doctor
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dr.petrov@hospital.com", "password": "Password123"}'
```
Save the token from the response. You'll use it in all subsequent requests.

#### Step 2: Get a Patient ID
```bash
curl http://localhost:5000/api/doctors \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
Look at the response — you'll see patient information. Note down a patient ID.

#### Step 3: Create a Structured Lab Report

Here's a realistic CBC (Complete Blood Count) for a patient:

```bash
curl -X POST http://localhost:5000/api/lab-reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "patientId": "PASTE_PATIENT_ID_HERE",
    "labType": "hematology",
    "results": [
      { "parameter": "Hemoglobin", "value": 14.2, "unit": "g/dL", "normalRange": "13.5 - 17.5", "flag": "normal" },
      { "parameter": "WBC (White Blood Cells)", "value": 11.2, "unit": "x10³/μL", "normalRange": "4.0 - 11.0", "flag": "high" },
      { "parameter": "RBC (Red Blood Cells)", "value": 4.8, "unit": "x10⁶/μL", "normalRange": "4.5 - 5.5", "flag": "normal" },
      { "parameter": "Platelets", "value": 245, "unit": "x10³/μL", "normalRange": "150 - 450", "flag": "normal" },
      { "parameter": "Hematocrit", "value": 42.5, "unit": "%", "normalRange": "38.3 - 48.6", "flag": "normal" },
      { "parameter": "MCV", "value": 89, "unit": "fL", "normalRange": "80 - 100", "flag": "normal" },
      { "parameter": "Neutrophils", "value": 72, "unit": "%", "normalRange": "40 - 75", "flag": "normal" },
      { "parameter": "Lymphocytes", "value": 20, "unit": "%", "normalRange": "20 - 45", "flag": "low" }
    ],
    "interpretation": "Mild leukocytosis with borderline elevated WBC. Suggestive of ongoing inflammatory response. All other parameters within normal limits. Clinical correlation recommended.",
    "notes": "Patient reports fatigue for past 3 weeks. No fever or other acute symptoms."
  }'
```
Back to record detail → "Generate Medical Certificate" → View certificate PDF
```

#### Step 5: Generate the PDF!
```bash
curl -X POST http://localhost:5000/api/reports/lab-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"labReportId": "PASTE_LAB_REPORT_ID_HERE"}'
```

The response will contain a `downloadUrl`. Copy it and paste it in your browser — you'll see a professional A4 PDF with:
- Hospital letterhead
- Patient information grid
- Color-coded results table (green = normal, orange = abnormal, red = critical)
- Pathologist interpretation section
- Signature area with hospital stamp

#### Step 6 (Bonus): Generate a Medical Certificate
```bash
curl -X POST http://localhost:5000/api/reports/medical-certificate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "recordId": "PASTE_A_MEDICAL_RECORD_ID_HERE",
    "restFrom": "2026-05-01",
    "restTo": "2026-05-05"
  }'
```

This creates a formal medical certificate (sick note) that a patient can show to their employer.

#### Step 7 (Bonus): Generate a Prescription PDF
```bash
# First get a prescription ID (check the seed data or create one)
curl -X POST http://localhost:5000/api/reports/prescription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"prescriptionId": "PASTE_PRESCRIPTION_ID_HERE"}'
```

### Testing Security (What Each Role Can/Cannot Do)

| Action | Patient | Doctor | Admin |
|--------|---------|--------|-------|
| Create medical record | ❌ | ✅ | ❌ |
| View own records | ✅ | ✅ | ✅ |
| View other patients' records | ❌ | ✅ | ✅ |
| Create lab report | ❌ | ✅ | ❌ |
| View own lab reports | ✅ | ✅ | ✅ |
| View others' lab reports | ❌ | ✅ (own patients) | ✅ |
| Update lab report | ❌ | ✅ (owner only) | ❌ |
| Delete lab report | ❌ | ❌ | ✅ |
| Generate PDF | ❌ | ✅ | ❌ |

---

## 5. How the PDF Generation Works (Under the Hood)

### The Pipeline

```
  [Data] ──→ [Handlebars Template] ──→ [HTML] ──→ [Puppeteer/Chrome] ──→ [PDF Buffer] ──→ [S3 Upload] ──→ [Download URL]
```

### The Templates

All three templates are plain HTML files with Handlebars placeholders:

- **`lab-report.hbs`**: A full laboratory report layout with:
  - Hospital branding header
  - Patient info grid (2 columns)
  - Results table with `class="flag-{{flagClass}}"` that turns cells green/orange/red
  - Interpretation and notes sections
  - Pathologist signature area

- **`prescription.hbs`**: A formal prescription with:
  - Large "℞" symbol
  - Medicine table with columns: #, Medicine, Dosage, Frequency, Duration, Instructions
  - QR code placeholder for authenticity verification
  - Doctor signature with license number

- **`medical-certificate.hbs`**: A medical certificate with:
  - Official letterhead
  - Formal body text ("This is to certify that...")
  - Diagnosis section
  - Rest period section (only shown if dates are provided)
  - Hospital stamp circle (SVG graphic)
  - Faint watermark background

### Where the PDFs Go

- **If S3 is configured** (`.env` has `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, etc.):
  → Uploaded to S3 bucket under `hospital-management/reports/`
  → A presigned download URL is returned (valid for 1 hour)

- **If S3 is NOT configured** (development mode):
  → Saved locally to `/tmp/reports/`
  → The local file path is returned as the download URL
  → You can open the file directly: `xdg-open /tmp/reports/lab-report_abc123_1714567890.pdf`

### What Puppeteer Does

Puppeteer is a library that controls a headless Chrome browser. When you call `generateReport()`:

1. It launches Chrome in the background (no window — it's "headless")
2. It tells Chrome: "render this HTML page"
3. It waits for all styling to load
4. It tells Chrome: "print this page as an A4 PDF"
5. It takes the resulting PDF bytes and uploads them to S3

**The first time** you generate a PDF, Puppeteer will automatically download Chromium (~300MB). This only happens once — subsequent calls are fast.

---

## 6. Troubleshooting

### "Lab report must be completed before generating PDF"
→ The lab report's status is not `completed` or `reviewed`. Use `PUT /api/lab-reports/:id` to update it first.

### "Doctor profile not found for this account"
→ The logged-in user doesn't have a Doctor profile. Make sure you're logged in as a doctor (not admin or patient).

### "You can only view your own lab reports"
→ A patient is trying to see another patient's lab reports. This is blocked for privacy.

### PDF generation fails / timeout
→ Check that Puppeteer downloaded Chromium successfully. On first run, it downloads to `~/.cache/puppeteer/`. If behind a proxy, set `PUPPETEER_DOWNLOAD_HOST` env var.

### "Cannot find module '../labReports/labReport.model.js'"
→ Make sure you ran `bun run build` or that the server is running with `bun --watch` (which compiles on-the-fly).

---

## 7. Files You Should NOT Touch

These belong to other members. Your code reads from them but does not modify them:

| Module | Member | What You Use |
|--------|--------|-------------|
| `server/src/modules/auth/` | Member 1 | User (patient) data: name, email, dateOfBirth, phone |
| `server/src/modules/doctors/` | Member 2 | Doctor profile: specialization, userId → name |
| `server/src/modules/appointments/` | Member 3 | Appointment data (validated against patient) |
| `server/src/modules/prescriptions/` | Member 5 | Prescription data for PDF generation |
| `server/src/shared/middlewares/authMiddleware.ts` | Common | JWT token verification, role checking |
| `server/src/shared/services/s3.service.ts` | Common | S3 presigned URL generation |
| `server/src/shared/utils/ApiError.ts` | Common | Standardized error responses |
| `server/src/shared/utils/doctorLookup.ts` | Common | Lookup doctor profile from user ID |

---

## 8. Quick Reference — All Your Endpoints

```
# LAB REPORTS
POST   /api/lab-reports                          Create lab report
GET    /api/lab-reports/patient/:patientId        Patient's lab history
GET    /api/lab-reports/:id                       Single lab report
PUT    /api/lab-reports/:id                       Update lab report
PATCH  /api/lab-reports/:id/review                Review lab report
DELETE /api/lab-reports/:id                       Delete lab report (admin)

# PDF GENERATION
POST   /api/reports/lab-report                    Generate lab report PDF
POST   /api/reports/prescription                  Generate prescription PDF
POST   /api/reports/medical-certificate           Generate medical certificate PDF

# MEDICAL RECORDS (original)
POST   /api/records                               Create medical record
GET    /api/records/patient/:patientId            Patient's records
GET    /api/records/doctor-logs                   Doctor's own records
GET    /api/records/:id                           Single record
PUT    /api/records/:id                           Update record
DELETE /api/records/:id                           Delete record (admin)
```
