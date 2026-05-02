# AI Agent Master Blueprint: Full-Stack Hospital Management System

## Project Overview

This is a full-stack Hospital Management System designed with the following principles in mind:

- **Modular Architecture**: Code is organized into independent modules by functionality, allowing different components to be developed and maintained separately.
- **Ease of Deployment**: The project is structured to be easily runnable on any machine with minimal setup. All dependencies are managed through Bun package manager.
- **Portability**: The codebase should be cloned and executed seamlessly across different environments (development, testing, production).

---

## Tech Stack Specification

| Component | Technology |
|-----------|-----------|
| **Frontend** | React Native (Functional Components, Hooks, React Navigation) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (via Mongoose ODM) |
| **Authentication** | JWT (JSON Web Tokens), Bcrypt (Password Hashing) |
| **File Upload** | Multer (Backend), FormData (React Native Frontend) |
| **Deployment** | Backend (AWS), Database (MongoDB Atlas) |
| **Package Manager** | Bun (strict requirement for all dependencies) |

---

## Table of Contents

1. [Tech Stack Specification](#tech-stack-specification)
2. [Code Patterns & Best Practices](#code-patterns--best-practices)
3. [Phase-Based Implementation Plan](#phase-based-implementation-plan)

---

## Code Patterns & Best Practices

> **Important**: All dependencies and scripts must be managed using **Bun**. This ensures consistent environments across all machines and makes the project easily runnable everywhere.

### Backend (Node.js + Express)

#### Architecture & Structure
- **MVC Architecture**: Strictly separate concerns into `models/`, `controllers/`, `routes/`, and `middlewares/`.

#### Middleware Usage
- **authMiddleware.js**: Verifies JWT tokens and attaches `req.user` to protected routes.
- **uploadMiddleware.js**: Uses Multer to handle multipart/form-data requests. Validate file types (images/pdfs) and size limits.

#### Error Handling
- Implement a global error-handling middleware.
- Never crash the server on a bad request.
- Return standardized JSON responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": {}
}
```

#### Security
- Keep secrets (JWT_SECRET, MONGO_URI, Cloudinary/AWS keys) in a `.env` file.
- Do not hardcode credentials.

### Frontend (React Native)

#### State Management
- Use React Context API or Zustand for global states like `AuthContext`.

#### API Integration
- Create a dedicated `api/` folder.
- Use Axios instances with interceptors to automatically attach `Authorization: Bearer <token>` to every request.

#### File Uploads
- Append payload to a FormData object.
- Set `Content-Type` header to `multipart/form-data`.

#### UI/UX
- Use `react-native-safe-area-context` and avoid hardcoded dimensions.
- Show loading spinners (e.g., `ActivityIndicator`) during API calls.
- Use standard alerts/toasts for success/error states.

---

## Phase-Based Implementation Plan

### Phase 1: Authentication & Patient Management (Member 1)

**Goal**: Implement system-wide security, user onboarding, and core patient records.

#### User Requirements

- Users can register an account securely (passwords hashed).
- Users can log in and receive a session token.
- Patients can view, update, and delete their profiles.
- Patients must upload a profile picture or a scan of their National ID during profile completion.

#### Database Schema (User / Patient)

```json
{
  "name": { "type": "String", "required": true },
  "email": { "type": "String", "required": true, "unique": true },
  "password": { "type": "String", "required": true },
  "role": { "type": "String", "enum": ["patient", "admin", "doctor"], "default": "patient" },
  "phone": { "type": "String" },
  "dateOfBirth": { "type": "Date" },
  "idDocumentUrl": { "type": "String" }
}
```

#### API Endpoints

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| POST | `/api/auth/register` | User registration | Payload: `{ name, email, password }` |
| POST | `/api/auth/login` | User login | Payload: `{ email, password }` \| Response: `{ token, user }` |
| GET | `/api/patients/me` | Get patient profile | Protected |
| PUT | `/api/patients/me` | Update patient profile | Protected, multipart/form-data, Payload: `phone, dateOfBirth, file: idDocument` |
| DELETE | `/api/patients/me` | Delete patient account | Protected |

---

### Phase 2: Doctor & Staff Management (Member 2)

**Goal**: Manage the hospital's medical professionals and their availability.

#### User Requirements

- Admin can add new doctors to the system.
- Users can view a list of all doctors and filter by specialty.
- Doctors/Admin can update doctor details and consultation fees.
- Admin must upload the doctor's medical license or official profile portrait when creating the record.

#### Database Schema (Doctor)

```json
{
  "userId": { "type": "ObjectId", "ref": "User" },
  "specialization": { "type": "String", "required": true },
  "experienceYears": { "type": "Number", "required": true },
  "consultationFee": { "type": "Number", "required": true },
  "availability": { "type": "String", "default": "Available" },
  "licenseDocumentUrl": { "type": "String", "required": true }
}
```

#### API Endpoints

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| POST | `/api/doctors` | Create doctor record | Protected/Admin, multipart/form-data, Payload: `specialization, fee, etc., file: licenseDocument` |
| GET | `/api/doctors` | Get all doctors | Public |
| GET | `/api/doctors/:id` | Get doctor details | Public |
| PUT | `/api/doctors/:id` | Update doctor info | Protected/Admin, Payload: `{ availability, consultationFee }` |
| DELETE | `/api/doctors/:id` | Delete doctor record | Protected/Admin |

---

### Phase 3: Appointment Booking (Member 3)

**Goal**: Connect patients with doctors via a scheduling system.

#### User Requirements

- Patients can book an appointment with a specific doctor for a specific date.
- Patients can upload a previous prescription or referral letter when booking.
- Patients can view their appointment history.
- Doctors/Admins can update the status of the appointment (e.g., Approve, Cancel, Complete).

#### Database Schema (Appointment)

```json
{
  "patientId": { "type": "ObjectId", "ref": "User", "required": true },
  "doctorId": { "type": "ObjectId", "ref": "Doctor", "required": true },
  "appointmentDate": { "type": "Date", "required": true },
  "reasonForVisit": { "type": "String" },
  "status": { "type": "String", "enum": ["Pending", "Confirmed", "Completed", "Cancelled"], "default": "Pending" },
  "referralDocumentUrl": { "type": "String" }
}
```

#### API Endpoints

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| POST | `/api/appointments` | Book appointment | Protected, multipart/form-data, Payload: `doctorId, date, reason, file: referralDocument` |
| GET | `/api/appointments/my-appointments` | Get patient appointments | Protected/Patient |
| GET | `/api/appointments/doctor/:doctorId` | Get doctor appointments | Protected/Doctor |
| PUT | `/api/appointments/:id/status` | Update appointment status | Protected, Payload: `{ status }` |
| DELETE | `/api/appointments/:id` | Cancel appointment | Protected |

---

### Phase 4: Medical Records & Lab Reports (Member 4)

**Goal**: Maintain digital health records for patients.

#### User Requirements

- Doctors can create medical records/diagnoses for patients after an appointment.
- Doctors can upload lab test results, X-rays, or MRI scans to the record.
- Patients can read their own medical records.
- Doctors can update or amend records, and Admins can delete erroneous records.

#### Database Schema (MedicalRecord)

```json
{
  "patientId": { "type": "ObjectId", "ref": "User", "required": true },
  "doctorId": { "type": "ObjectId", "ref": "Doctor", "required": true },
  "diagnosis": { "type": "String", "required": true },
  "prescription": { "type": "String" },
  "dateRecorded": { "type": "Date", "default": "Date.now" },
  "labReportUrl": { "type": "String" }
}
```

#### API Endpoints

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| POST | `/api/records` | Create medical record | Protected/Doctor, multipart/form-data, Payload: `patientId, diagnosis, prescription, file: labReport` |
| GET | `/api/records/patient/:patientId` | Get patient records | Protected |
| GET | `/api/records/:id` | Get specific record | Protected |
| PUT | `/api/records/:id` | Update record | Protected/Doctor, Payload: `{ diagnosis, prescription }` |
| DELETE | `/api/records/:id` | Delete record | Protected/Admin |

---

### Phase 5: Pharmacy & Inventory Management (Member 5)

**Goal**: Manage the hospital's medication stock.

#### User Requirements

- Pharmacists/Admins can add new medications to the inventory.
- Pharmacists must upload an image of the medicine packaging or warning label.
- Staff can view current stock levels and prices.
- Staff can update stock quantity (e.g., when a batch is sold or received).
- Admins can delete obsolete medications.

#### Database Schema (Medicine)

```json
{
  "name": { "type": "String", "required": true },
  "category": { "type": "String", "required": true },
  "price": { "type": "Number", "required": true },
  "stockQuantity": { "type": "Number", "required": true },
  "expiryDate": { "type": "Date", "required": true },
  "packagingImageUrl": { "type": "String", "required": true }
}
```

#### API Endpoints

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| POST | `/api/medicines` | Add medicine | Protected/Admin, multipart/form-data, Payload: `name, category, price, stock, expiry, file: packagingImage` |
| GET | `/api/medicines` | Get all medicines | Protected |
| GET | `/api/medicines/:id` | Get medicine details | Protected |
| PUT | `/api/medicines/:id` | Update medicine | Protected/Admin, Payload: `{ stockQuantity, price }` |
| DELETE | `/api/medicines/:id` | Delete medicine | Protected/Admin |

---

### Phase 6: Billing & Deployment (Member 6)

**Goal**: Handle hospital finances and ensure the system is live on the internet.

#### User Requirements

- Billing staff can generate an invoice for a patient's appointment and medicines.
- Patients can upload a bank transfer receipt or insurance claim document to verify payment.
- Patients can view their pending and paid bills.
- Staff can update the payment status to "Paid".

#### Deployment Task

This member is responsible for:
- **Hosting the Node API on AWS** (EC2, ECS, or Lambda)
- **Database**: MongoDB Atlas connected to the live AWS environment
- **Storage**: AWS S3 for file uploads (documents, images, lab reports)
- **Security**: Configure AWS security groups, IAM roles, and SSL certificates
- **Environment Configuration**: Set up environment variables in AWS Systems Manager or Parameter Store

#### Database Schema (Invoice)

```json
{
  "patientId": { "type": "ObjectId", "ref": "User", "required": true },
  "appointmentId": { "type": "ObjectId", "ref": "Appointment" },
  "totalAmount": { "type": "Number", "required": true },
  "paymentStatus": { "type": "String", "enum": ["Unpaid", "Pending Verification", "Paid"], "default": "Unpaid" },
  "issuedDate": { "type": "Date", "default": "Date.now" },
  "paymentReceiptUrl": { "type": "String" }
}
```

#### API Endpoints

| Method | Endpoint | Description | Notes |
|--------|----------|-------------|-------|
| POST | `/api/invoices` | Create invoice | Protected/Staff, Payload: `{ patientId, appointmentId, totalAmount }` |
| GET | `/api/invoices/my-bills` | Get patient bills | Protected/Patient |
| GET | `/api/invoices` | Get all invoices | Protected/Staff |
| PUT | `/api/invoices/:id/pay` | Upload payment receipt | Protected/Patient, multipart/form-data, Changes status to "Pending Verification" |
| PUT | `/api/invoices/:id/verify` | Verify payment | Protected/Staff, Payload: `{ paymentStatus: 'Paid' }` |
| DELETE | `/api/invoices/:id` | Delete invoice | Protected/Admin |

---