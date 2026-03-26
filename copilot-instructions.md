# Copilot Instructions - Hospital Management System

## Project Overview

This is a **full-stack Hospital Management System** with a **modular architecture** organized by functionality. The project is designed for ease of deployment and portability across different environments.

---

## Tech Stack (CRITICAL)

| Component | Technology |
|-----------|-------------|
| **Frontend** | React Native (Functional Components, Hooks, React Navigation) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (via Mongoose ODM) |
| **Authentication** | JWT (JSON Web Tokens), Bcrypt (Password Hashing) |
| **File Upload** | Multer (Backend), FormData (React Native Frontend) |
| **Deployment** | AWS (Backend), MongoDB Atlas (Database), AWS S3 (File Storage) |
| **Package Manager** | **Bun** (STRICT REQUIREMENT - use for all dependency and script management) |

---

## Package Manager: BUN (MANDATORY)

> **CRITICAL**: All dependencies and scripts must be managed using **Bun**. This ensures consistent environments across all machines and makes the project easily runnable everywhere.

### Key Points:
- Use `bun install` instead of `npm install` or `yarn install`
- Use `bun run <script>` instead of `npm run <script>`
- All package.json scripts use Bun as the runtime
- Lock file: `bun.lock`

---

## Backend Architecture & Best Practices

### Structure
- **MVC Architecture**: Strictly separate concerns into `models/`, `controllers/`, `routes/`, and `middlewares/`
- **Modular Design**: Code organized by feature/functionality (auth, doctors, appointments, billing, pharmacy, records)
- **Environment Config**: All secrets (.env file) - JWT_SECRET, MONGO_URI, AWS keys, etc.

### Middleware
- `authMiddleware`: Verifies JWT tokens and attaches `req.user` to protected routes
- `uploadMiddleware`: Uses Multer for multipart/form-data requests
  - Validate file types (images/pdfs)
  - Enforce size limits
  - Handle file storage (AWS S3)

### Error Handling
- Implement **global error-handling middleware**
- Never crash the server on bad requests
- Return standardized JSON responses:
  ```json
  {
    "success": false,
    "message": "Error description",
    "error": {}
  }
  ```

### Security
- Keep all secrets in `.env` - never hardcode credentials
- Enforce JWT token verification on protected routes
- Use Bcrypt for password hashing
- Set proper HTTP status codes

---

## Frontend Architecture & Best Practices

### State Management
- Use **React Context API** or **Zustand** for global states (e.g., AuthContext)
- Avoid prop drilling; centralize auth and user state

### API Integration
- Create dedicated `api/` folder with `client.ts` and `endpoints.ts`
- Use **Axios instances with interceptors** to automatically attach `Authorization: Bearer <token>` to every request
- Handle errors consistently and display meaningful messages to users

### File Uploads
- Append payload to **FormData** object
- Set `Content-Type` header to `multipart/form-data`
- Use `react-native-document-picker` or similar for file selection
- Validate file types and sizes before upload

### UI/UX
- Use `react-native-safe-area-context` - avoid hardcoded dimensions
- Show loading spinners (e.g., `ActivityIndicator`) during API calls
- Use standard alerts/toasts for success/error states
- Follow platform conventions (iOS/Android)

---

## Database Schema Patterns

All models follow this structure:
- Use **Mongoose ODM** for schema definition
- Include timestamps (`createdAt`, `updatedAt`)
- Use **ObjectId references** for relationships
- Define enums for status fields

Example pattern:
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'admin', 'doctor'], default: 'patient' },
  timestamps: true
});
```

---

## Project Structure (6 Phases)

### Phase 1: Authentication & Patient Management
- **Goal**: System-wide security, user onboarding, core patient records
- **Features**: Register, Login, Patient Profile Management
- **Files**: `server/src/modules/auth/` + `client/features/auth/`

### Phase 2: Doctor & Staff Management
- **Goal**: Manage medical professionals and availability
- **Features**: Add/View/Update Doctors, Filter by Specialty
- **Files**: `server/src/modules/doctors/` + `client/features/doctors/`

### Phase 3: Appointment Booking
- **Goal**: Connect patients with doctors via scheduling
- **Features**: Book appointments, View history, Update status (Pending → Confirmed → Completed)
- **Files**: `server/src/modules/appointments/` + `client/features/appointments/`

### Phase 4: Medical Records & Lab Reports
- **Goal**: Maintain digital health records for patients
- **Features**: Create records, Upload lab reports, View/Update/Delete records
- **Files**: `server/src/modules/records/` + `client/features/records/`

### Phase 5: Pharmacy & Inventory Management
- **Goal**: Manage hospital medication stock
- **Features**: Add medications, Track stock levels, Update quantities
- **Files**: `server/src/modules/pharmacy/` + `client/features/pharmacy/`

### Phase 6: Billing & Deployment
- **Goal**: Handle hospital finances and deploy to production
- **Features**: Generate invoices, Upload payment receipts, Verify payments
- **Deployment**: AWS EC2/ECS/Lambda, MongoDB Atlas, AWS S3
- **Files**: `server/src/modules/billing/`

---

## API Response Standards

All API responses follow this structure:
```json
{
  "success": true/false,
  "message": "Description of response",
  "data": { /* ... */ },
  "error": { /* error details if success is false */ }
}
```

Protected routes require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## File Upload Strategy

1. **Backend**: Use Multer + AWS S3
   - Configure max file size
   - Validate MIME types
   - Return S3 URL in response

2. **Frontend**: Use FormData
   - Append file + other fields
   - Show upload progress
   - Handle errors gracefully

3. **Storage**: AWS S3 buckets organized by category
   - `/documents/` (IDs, referrals, lab reports)
   - `/images/` (profile pictures, medicine packaging)
   - `/uploads/ ` (temporary storage)

---

## Development Workflow

### Local Development
```bash
# Frontend (client/)
bun install
bun run dev

# Backend (server/)
bun install
bun run dev
```

### Environment Setup
Create `.env` files in both `client/` and `server/` with:
- **Backend**: MONGO_URI, JWT_SECRET, AWS credentials, PORT
- **Frontend**: REACT_APP_API_URL

### Database
- Local: MongoDB community edition
- Production: MongoDB Atlas

---

## Important Notes for Contributors

1. **Always use Bun** - It's a strict requirement for this project
2. **Follow MVC architecture** - Separate models, controllers, services, routes
3. **Implement error handling** - Return standardized error responses
4. **Validate all inputs** - Check file types, sizes, and data formats
5. **Secure endpoints** - Use JWT authentication and role-based access control (patient, doctor, admin)
6. **Test file uploads** - Ensure multipart/form-data handling works correctly
7. **Document API endpoints** - Update README with endpoint details
8. **Use environment variables** - Never hardcode secrets or API URLs

---

## Resources

- **Project Documentation**: See [Docs/Project.md](Docs/Project.md) for detailed API endpoints and database schemas
- **Backend**: [server/README.md](server/README.md)
- **Frontend**: [client/README.md](client/README.md)
