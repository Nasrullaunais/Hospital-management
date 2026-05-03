import mongoose, { type Document, Schema } from 'mongoose';

export interface IWeeklySlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "HH:mm" 24h format (e.g. "09:00")
  endTime: string; // "HH:mm" 24h format (e.g. "17:00")
  isActive: boolean;
}

export interface IScheduleException {
  date: Date;
  isAvailable: boolean;
  reason?: string;
}

export interface IDoctorSchedule extends Document {
  _id: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  weeklySlots: IWeeklySlot[];
  slotDuration: number; // minutes, default 30
  exceptions: IScheduleException[];
  createdAt: Date;
  updatedAt: Date;
}

const weeklySlotSchema = new Schema<IWeeklySlot>(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String,
      required: true,
      match: [/^\d{2}:\d{2}$/, 'startTime must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^\d{2}:\d{2}$/, 'endTime must be in HH:mm format'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const scheduleExceptionSchema = new Schema<IScheduleException>(
  {
    date: { type: Date, required: true },
    isAvailable: { type: Boolean, required: true },
    reason: { type: String, trim: true },
  },
  { _id: false },
);

const doctorScheduleSchema = new Schema<IDoctorSchedule>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
      unique: true,
    },
    weeklySlots: {
      type: [weeklySlotSchema],
      default: [],
    },
    slotDuration: {
      type: Number,
      default: 30,
      min: [10, 'Slot duration must be at least 10 minutes'],
      max: [120, 'Slot duration must not exceed 120 minutes'],
    },
    exceptions: {
      type: [scheduleExceptionSchema],
      default: [],
    },
  },
  { timestamps: true, versionKey: false },
);

doctorScheduleSchema.index({ doctorId: 1 }, { unique: true });

export const DoctorSchedule = mongoose.model<IDoctorSchedule>(
  'DoctorSchedule',
  doctorScheduleSchema,
);
