import { Router } from 'express';
import {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
  cancelAppointment,
} from './appointment.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { bookAppointmentValidation, updateStatusValidation } from './appointment.validation.js';

const router = Router();

/** POST /api/appointments — Book new appointment (Patient) */
router.post('/', authMiddleware, uploadSingle('referralDocument'), bookAppointmentValidation, bookAppointment);

/** GET /api/appointments/my-appointments — Patient's appointments */
router.get('/my-appointments', authMiddleware, requireRole('patient'), getMyAppointments);

/** GET /api/appointments/doctor/:doctorId — Doctor's schedule */
router.get('/doctor/:doctorId', authMiddleware, requireRole('doctor', 'admin'), getDoctorAppointments);

/** PUT /api/appointments/:id/status — Update status (Doctor/Admin) */
router.put('/:id/status', authMiddleware, requireRole('doctor', 'admin'), updateStatusValidation, updateAppointmentStatus);

/** DELETE /api/appointments/:id — Cancel (Patient only) */
router.delete('/:id', authMiddleware, requireRole('patient'), cancelAppointment);

export default router;
