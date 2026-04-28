import mongoose, { type Document, Schema } from 'mongoose';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface IDoctor extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  specialization: string;
  experienceYears: number;
  consultationFee: number;
  availability: 'Available' | 'Unavailable' | 'On Leave';
  /** File reference with protocol: 's3://...' | 'local://...' | legacy '/uploads/...' */
  licenseDocumentUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const doctorSchema = new Schema<IDoctor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    experienceYears: {
      type: Number,
      required: [true, 'Experience years is required'],
      min: [0, 'Experience years cannot be negative'],
    },
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Consultation fee cannot be negative'],
    },
    availability: {
      type: String,
      enum: ['Available', 'Unavailable', 'On Leave'],
      default: 'Available',
    },
    licenseDocumentUrl: {
      type: String,
      required: [true, 'License document is required'],
    },
  },
  { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────────
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ availability: 1 });
doctorSchema.index({ userId: 1 }, { unique: true });

export const Doctor = mongoose.model<IDoctor>('Doctor', doctorSchema);
