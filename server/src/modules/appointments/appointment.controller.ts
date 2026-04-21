import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Appointment } from './appointment.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
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

    const appointment = await Appointment.create({
      patientId: userId,
      doctorId: req.body.doctorId,
      appointmentDate: req.body.appointmentDate,
      reasonForVisit: req.body.reasonForVisit,
      referralDocumentUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
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
  } catch (err) {
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

/** GET /api/appointments/doctor/:doctorId — Doctor's appointments (admin/doctor with param) */
export const getDoctorAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
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

    const appointments = await Appointment.find({ doctorId: (doctor as any)._id })
      .populate('patientId', 'name email phone dateOfBirth')
      .sort({ appointmentDate: 1 });

    res.json({ success: true, data: { appointments, count: appointments.length } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/appointments/:id/status — Update appointment status */
export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true },
    );

    if (!appointment) return next(ApiError.notFound('Appointment not found'));

    logger.info(
      {
        event: 'appointment_status_updated',
        appointmentId: appointment._id.toString(),
        status: req.body.status,
        ...getRequestContext(req),
      },
      'Appointment status updated',
    );

    res.json({ success: true, message: 'Status updated', data: { appointment } });
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
