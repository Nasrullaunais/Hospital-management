import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { Appointment } from './appointment.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { s3Service } from '../../shared/services/s3.service.js';
import { formatFileReference } from '../../shared/utils/fileReference.js';
import { getRequestContext, logger } from '../../shared/utils/logger.js';
import { APPOINTMENT_STATUS } from '../../shared/constants/appointmentStatus.js';
import { ROLES } from '../../shared/constants/roles.js';
import { findDoctorProfileByUserId } from '../../shared/utils/doctorLookup.js';

/** POST /api/appointments — Book an appointment */
export const bookAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    let referralDocumentUrl: string | undefined;

    if (req.body.fileKey && typeof req.body.fileKey === 'string' && req.body.fileKey.trim().length > 0) {
      await s3Service.verifyAndConsume(req.user!.id, req.body.fileKey);
      referralDocumentUrl = formatFileReference('s3', req.body.fileKey);
    } else if (req.file) {
      referralDocumentUrl = formatFileReference('local', `/uploads/${req.file.filename}`);
    }
    // else: stays undefined (file was optional)

    const appointment = await Appointment.create({
      patientId: userId,
      doctorId: req.body.doctorId,
      appointmentDate: req.body.appointmentDate,
      reasonForVisit: req.body.reasonForVisit,
      referralDocumentUrl,
    });

    logger.info(
      {
        event: 'appointment_booked',
        appointmentId: appointment._id.toString(),
        patientId: userId,
        doctorId: req.body.doctorId,
        appointmentDate: req.body.appointmentDate,
        ...getRequestContext(req),
      },
      'Appointment booked',
    );

    res.status(201).json({ success: true, message: 'Appointment booked', data: { appointment } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('E11000 duplicate key')) {
      return next(ApiError.conflict('This time slot is already booked. Please choose a different time.'));
    }
    next(err);
  }
};

/** GET /api/appointments/my-appointments — Patient's appointment history */
export const getMyAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    const appointments = await Appointment.find({ patientId: userId })
      .populate({
        path: 'doctorId',
        select: 'specialization consultationFee availability userId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .sort({ appointmentDate: -1 });

    res.json({ success: true, data: { appointments, count: appointments.length } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/appointments/doctor/:doctorId — Doctor's own appointments or admin view */
export const getDoctorAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Security: Verify the requesting doctor can only access their own appointments
    // Admins can view any doctor; doctors can only view their own
    if (req.user?.role !== ROLES.ADMIN) {
      const userId = req.user?.id;
      if (!userId) return next(ApiError.unauthorized());

      const doctor = await findDoctorProfileByUserId(userId);
      if (!doctor) return next(ApiError.forbidden('Doctor profile not found'));

      const requestingDoctorId = (doctor as { _id: mongoose.Types.ObjectId })._id.toString();
      if (requestingDoctorId !== req.params.doctorId) {
        return next(ApiError.forbidden('You can only view your own appointments'));
      }
    }

    const appointments = await Appointment.find({ doctorId: req.params.doctorId })
      .populate('patientId', 'name email phone dateOfBirth')
      .sort({ appointmentDate: 1 });

    res.json({ success: true, data: { appointments, count: appointments.length } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/appointments/doctor-schedule — Logged-in doctor's own schedule */
export const getMyDoctorSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    let doctor = await findDoctorProfileByUserId(userId);
    if (!doctor) return next(ApiError.notFound('Doctor profile not found for this user'));

    const appointments = await Appointment.find({ doctorId: (doctor as { _id: mongoose.Types.ObjectId })._id })
      .populate('patientId', 'name email phone dateOfBirth')
      .sort({ appointmentDate: 1 });

    res.json({ success: true, data: { appointments, count: appointments.length } });
  } catch (err) {
    next(err);
  }
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

/** PUT /api/appointments/:id/status — Update appointment status */
export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return next(ApiError.notFound('Appointment not found'));

    const newStatus = req.body.status as string;
    const currentStatus = appointment.status;
    if (VALID_TRANSITIONS[currentStatus] && !VALID_TRANSITIONS[currentStatus].includes(newStatus)) {
      return next(ApiError.badRequest(`Cannot transition from ${currentStatus} to ${newStatus}`));
    }

    if (req.user.role === ROLES.DOCTOR) {
      let doctorProfile = await findDoctorProfileByUserId(req.user.id);
      if (!doctorProfile) return next(ApiError.forbidden('You do not have a doctor profile'));
      const myDoctorId = (doctorProfile as { _id: mongoose.Types.ObjectId })._id.toString();
      if (appointment.doctorId.toString() !== myDoctorId) {
        return next(ApiError.forbidden('You can only update appointments for your own patients'));
      }
    }

    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { returnDocument: 'after', runValidators: true },
    );

    logger.info(
      {
        event: 'appointment_status_updated',
        appointmentId: updated?._id.toString(),
        status: req.body.status,
        ...getRequestContext(req),
      },
      'Appointment status updated',
    );

    res.json({ success: true, message: 'Status updated', data: { appointment: updated } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/appointments/:id — Cancel appointment (soft-cancel: sets status to Cancelled) */
export const cancelAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId: userId,
    });

    if (!appointment) return next(ApiError.notFound('Appointment not found or you do not have permission'));

    if (new Date(appointment.appointmentDate) <= new Date()) {
      return next(ApiError.badRequest('Cannot cancel a past appointment'));
    }

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    await appointment.save();

    logger.info(
      {
        event: 'appointment_cancelled',
        appointmentId: appointment._id.toString(),
        patientId: userId,
        ...getRequestContext(req),
      },
      'Appointment cancelled',
    );

    res.json({ success: true, message: 'Appointment cancelled', data: { appointment } });
  } catch (err) {
    next(err);
  }
};
