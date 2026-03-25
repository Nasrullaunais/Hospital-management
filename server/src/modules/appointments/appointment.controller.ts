import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Appointment } from './appointment.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

/** POST /api/appointments — Book an appointment */
export const bookAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const appointment = await Appointment.create({
      patientId: req.user!.id,
      doctorId: req.body.doctorId,
      appointmentDate: req.body.appointmentDate,
      reasonForVisit: req.body.reasonForVisit,
      referralDocumentUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    });

    res.status(201).json({ success: true, message: 'Appointment booked', data: { appointment } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/appointments/my-appointments — Patient's appointment history */
export const getMyAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const appointments = await Appointment.find({ patientId: req.user!.id })
      .populate('doctorId', 'specialization consultationFee availability')
      .sort({ appointmentDate: -1 });

    res.json({ success: true, data: { appointments, count: appointments.length } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/appointments/doctor/:doctorId — Doctor's appointments */
export const getDoctorAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const appointments = await Appointment.find({ doctorId: req.params.doctorId })
      .populate('patientId', 'name email phone')
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
    res.json({ success: true, message: 'Status updated', data: { appointment } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/appointments/:id — Cancel appointment */
export const cancelAppointment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      patientId: req.user!.id, // Can only cancel own appointments
    });

    if (!appointment) return next(ApiError.notFound('Appointment not found or you do not have permission'));
    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    next(err);
  }
};
