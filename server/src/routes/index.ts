import { Router, type Request, type Response } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import doctorRoutes from '../modules/doctors/doctor.routes.js';
import appointmentRoutes from '../modules/appointments/appointment.routes.js';
import recordRoutes from '../modules/records/record.routes.js';
import medicineRoutes from '../modules/pharmacy/medicine.routes.js';
import invoiceRoutes from '../modules/billing/invoice.routes.js';
import dispenseRoutes from '../modules/dispensing/dispense.routes.js';

const router = Router();

// ── Health Check ───────────────────────────────────────────────────────────────
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Hospital Management API is running',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] ?? 'development',
  });
});

router.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Hospital Management API is running',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] ?? 'development',
  });
});

// ── Module Routes ──────────────────────────────────────────────────────────────
// Member 1: Auth (/api/auth/register, /api/auth/login) + Patients (/api/patients/me)
router.use('/api', authRoutes);

// Member 2: Doctors
router.use('/api/doctors', doctorRoutes);

// Member 3: Appointments
router.use('/api/appointments', appointmentRoutes);

// Member 4: Medical Records
router.use('/api/records', recordRoutes);

// Member 5: Pharmacy
router.use('/api/medicines', medicineRoutes);

// Member 6: Billing
router.use('/api/invoices', invoiceRoutes);

// Member 7: Dispensing
router.use('/api/dispense', dispenseRoutes);

// ── 404 Handler ────────────────────────────────────────────────────────────────
router.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

export default router;
