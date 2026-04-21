import { Router } from 'express';
import {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getMyDoctorSchedule,
  updateAppointmentStatus,
  cancelAppointment,
} from './appointment.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';
import { bookAppointmentValidation, updateStatusValidation } from './appointment.validation.js';

const router = Router();

router.post(
  '/',
  authMiddleware,
  requireRole(ROLES.PATIENT),
  uploadSingle('referralDocument'),
  bookAppointmentValidation,
  bookAppointment,
);

router.get('/my-appointments', authMiddleware, requireRole(ROLES.PATIENT), getMyAppointments);

router.get('/doctor-schedule', authMiddleware, requireRole(ROLES.DOCTOR), getMyDoctorSchedule);

router.get('/doctor/:doctorId', authMiddleware, requireRole(ROLES.DOCTOR, ROLES.ADMIN), getDoctorAppointments);

router.put('/:id/status', authMiddleware, requireRole(ROLES.DOCTOR, ROLES.ADMIN), updateStatusValidation, updateAppointmentStatus);

router.delete('/:id', authMiddleware, requireRole(ROLES.PATIENT), cancelAppointment);

export default router;
