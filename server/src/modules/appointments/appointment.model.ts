import mongoose, { type Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentDate: Date;
  reasonForVisit?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  /** File reference with protocol: 's3://...' | 'local://...' | legacy '/uploads/...' */
  referralDocumentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
      validate: {
        validator: (value: Date) => value.getTime() > Date.now(),
        message: 'Appointment date must be in the future',
      },
    },
    reasonForVisit: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason must not exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    referralDocumentUrl: {
      type: String,
    },
  },
  { timestamps: true },
);

// Indexes for common query patterns
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ status: 1 });
// Unique constraint prevents double-booking: same doctor can't have two appointments at the same time
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1 },
  { unique: true, partialFilterExpression: { appointmentDate: { $exists: true } } },
);

appointmentSchema.pre('save', async function () {
  const SLOT_WINDOW_MS = 30 * 60 * 1000;
  const windowStart = new Date(this.appointmentDate.getTime() - SLOT_WINDOW_MS);
  const windowEnd = new Date(this.appointmentDate.getTime() + SLOT_WINDOW_MS);

  const conflict = await this.constructor.findOne({
    doctorId: this.doctorId,
    _id: { $ne: this._id },
    appointmentDate: { $gte: windowStart, $lte: windowEnd },
    status: { $nin: ['Cancelled'] },
  });

  if (conflict) {
    throw new Error('This time slot is already booked. Please choose a different time.');
  }
});

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);
