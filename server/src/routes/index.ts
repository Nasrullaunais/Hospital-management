import { Router, type Request, type Response } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import doctorRoutes from '../modules/doctors/doctor.routes.js';
import appointmentRoutes from '../modules/appointments/appointment.routes.js';
import recordRoutes from '../modules/records/record.routes.js';
import medicineRoutes from '../modules/pharmacy/medicine.routes.js';
import invoiceRoutes from '../modules/billing/invoice.routes.js';
import paymentRoutes from '../modules/billing/payment.routes.js';
import prescriptionRoutes from '../modules/prescriptions/prescription.routes.js';
import dispenseRoutes from '../modules/dispensing/dispense.routes.js';
import wardRoutes from '../modules/wards/ward.routes.js';
import wardAssignmentRoutes from '../modules/wardAssignments/wardAssignment.routes.js';
import wardMedicationRoutes from '../modules/wardMedications/wardMedication.routes.js';
import filesRoutes from '../modules/files/files.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import labReportRoutes from '../modules/labReports/labReport.routes.js';
import reportRoutes from '../modules/reports/report.routes.js';

const router = Router();

// ── Health Check ────────────────────────────────────────────────────────────────
// Lightweight health check (for Render, load balancers, cold start probes)
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Hospital Management API is running',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] ?? 'development',
    uptime: process.uptime(),
  });
});

router.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Hospital Management API is running',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] ?? 'development',
    uptime: process.uptime(),
  });
});

// Deep health check (verifies DB + PDF generator health)
router.get('/api/health/deep', async (_req: Request, res: Response) => {
  try {
    const mongoose = await import('mongoose');
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    let pdfReady = false;
    try {
      const { reportGenerator } = await import('../shared/services/reportGenerator.js');
      pdfReady = await reportGenerator.isPuppeteerHealthy();
    } catch {
      pdfReady = false;
    }

    res.json({
      success: true,
      message: 'Hospital Management API is running',
      timestamp: new Date().toISOString(),
      environment: process.env['NODE_ENV'] ?? 'development',
      uptime: process.uptime(),
      checks: {
        database: dbState,
        pdfGenerator: pdfReady ? 'healthy' : 'unhealthy',
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      message: 'Service unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Module Routes ──────────────────────────────────────────────────────────────
// Common: Auth (/api/auth/register, /api/auth/login) — shared across all members
router.use('/api', authRoutes);

// Member 2: Doctors
router.use('/api/doctors', doctorRoutes);

// Member 3: Appointments
router.use('/api/appointments', appointmentRoutes);

// Member 4: Medical Records & Lab Reports
router.use('/api/records', recordRoutes);
router.use('/api/lab-reports', labReportRoutes);
router.use('/api/reports', reportRoutes);

// Member 5: Pharmacy
router.use('/api/medicines', medicineRoutes);

// Member 6: Billing
router.use('/api/invoices', invoiceRoutes);
router.use('/api/payments', paymentRoutes);

// Member 7: Prescriptions
router.use('/api/prescriptions', prescriptionRoutes);
router.use('/api/dispense', dispenseRoutes);

// Wards
router.use('/api/wards', wardRoutes);
router.use('/api/assignments', wardAssignmentRoutes);
router.use('/api/wardMedications', wardMedicationRoutes);

// Module 7: Files (S3 presigned URLs)
router.use('/api/files', filesRoutes);

// Admin: User management (receptionists, pharmacists)
router.use('/api/admin/users', adminRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
router.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

export default router;
