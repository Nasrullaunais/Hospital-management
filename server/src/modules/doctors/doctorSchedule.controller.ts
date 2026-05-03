import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { DoctorSchedule } from './doctorSchedule.model.js';
import { Doctor } from './doctor.model.js';
import { Appointment } from '../appointments/appointment.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { ROLES } from '../../shared/constants/roles.js';

// ── Helpers ──

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

function generateSlotTimes(
  startTime: string,
  endTime: string,
  slotDuration: number,
): string[] {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const slots: string[] = [];

  for (let t = start; t + slotDuration <= end; t += slotDuration) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  return slots;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00.000Z').getUTCDay();
}

// ── Controller ──

/** POST /api/doctors/schedule */
export const upsertSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new ApiError(422, 'Validation failed'));
    return;
  }
  try {
    const { doctorId, weeklySlots, slotDuration, exceptions } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      next(ApiError.notFound('Doctor not found'));
      return;
    }

    if (req.user?.role === ROLES.DOCTOR) {
      if (doctor.userId.toString() !== req.user.id) {
        next(ApiError.forbidden('You can only manage your own schedule'));
        return;
      }
    }

    const schedule = await DoctorSchedule.findOneAndUpdate(
      { doctorId },
      { weeklySlots, slotDuration, exceptions },
      { upsert: true, returnDocument: 'after', runValidators: true, new: true },
    );

    res.json({ success: true, message: 'Schedule updated', data: { schedule } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/doctors/:id/schedule */
export const getSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      next(ApiError.badRequest('Invalid doctor id'));
      return;
    }

    const schedule = await DoctorSchedule.findOne({ doctorId });
    if (!schedule) {
      res.json({ success: true, data: { schedule: null } });
      return;
    }

    res.json({ success: true, data: { schedule } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/doctors/:id/available-slots?date=YYYY-MM-DD */
export const getAvailableSlots = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dateStr = req.query.date as string | undefined;

    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      next(ApiError.badRequest('Invalid doctor id'));
      return;
    }
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      next(ApiError.badRequest('Query param "date" is required (format: YYYY-MM-DD)'));
      return;
    }

    // 1. Check doctor availability
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      next(ApiError.notFound('Doctor not found'));
      return;
    }
    if (doctor.availability !== 'Available') {
      res.json({
        success: true,
        data: { date: dateStr, slots: [], reason: 'Doctor is not currently available' },
      });
      return;
    }

    // 2. Get schedule
    const schedule = await DoctorSchedule.findOne({ doctorId });
    if (!schedule || schedule.weeklySlots.length === 0) {
      res.json({
        success: true,
        data: { date: dateStr, slots: [], reason: 'No schedule configured for this doctor' },
      });
      return;
    }

    // 3. Check exceptions
    const dateStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dateEnd = new Date(`${dateStr}T23:59:59.999Z`);
    const exception = schedule.exceptions.find(
      (ex) => ex.date >= dateStart && ex.date <= dateEnd,
    );
    if (exception && !exception.isAvailable) {
      res.json({
        success: true,
        data: {
          date: dateStr,
          slots: [],
          reason: exception.reason || 'Doctor is unavailable on this date',
        },
      });
      return;
    }

    // 4. Find weekly slot
    const dayOfWeek = getDayOfWeek(dateStr);
    const weeklySlot = schedule.weeklySlots.find(
      (ws) => ws.dayOfWeek === dayOfWeek && ws.isActive,
    );
    if (!weeklySlot) {
      res.json({
        success: true,
        data: { date: dateStr, slots: [], reason: 'No active schedule for this day' },
      });
      return;
    }

    // 5. Generate all possible slots
    const allSlots = generateSlotTimes(
      weeklySlot.startTime,
      weeklySlot.endTime,
      schedule.slotDuration,
    );

    // 6. Get existing appointments for this doctor on this date (exclude cancelled)
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['Cancelled'] },
    }).select('appointmentDate');

    // 7. Build occupied time set (±30 min window around each appointment)
    const occupiedTimes = new Set<string>();
    const SLOT_WINDOW_MINUTES = 30;

    for (const appt of appointments) {
      const apptDate = new Date(appt.appointmentDate);
      const apptMinutes =
        apptDate.getUTCHours() * 60 + apptDate.getUTCMinutes();
      for (
        let m = apptMinutes - SLOT_WINDOW_MINUTES + 1;
        m < apptMinutes + SLOT_WINDOW_MINUTES;
        m++
      ) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(((m % 60) + 60) % 60).padStart(2, '0');
        occupiedTimes.add(`${hh}:${mm}`);
      }
    }

    // 8. Filter available slots
    const availableSlots = allSlots
      .filter((slot) => !occupiedTimes.has(slot))
      .map((slot) => ({ time: slot, label: slot }));

    res.json({
      success: true,
      data: {
        date: dateStr,
        slotDuration: schedule.slotDuration,
        slots: availableSlots,
        total: availableSlots.length,
      },
    });
  } catch (err) {
    next(err);
  }
};
