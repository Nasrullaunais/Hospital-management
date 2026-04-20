import mongoose, { type Document, Schema } from 'mongoose';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface IWardAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  wardId: mongoose.Types.ObjectId;
  bedNumber: number;
  admissionDate: Date;
  expectedDischarge?: Date;
  actualDischarge?: Date;
  notes?: string;
  status: 'active' | 'discharged';
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const wardAssignmentSchema = new Schema<IWardAssignment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
    },
    wardId: {
      type: Schema.Types.ObjectId,
      ref: 'Ward',
      required: [true, 'Ward ID is required'],
    },
    bedNumber: {
      type: Number,
      required: [true, 'Bed number is required'],
      min: [1, 'Bed number must be at least 1'],
    },
    admissionDate: {
      type: Date,
      required: [true, 'Admission date is required'],
    },
    expectedDischarge: {
      type: Date,
    },
    actualDischarge: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'discharged'],
      default: 'active',
    },
  },
  { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────────

// Fast lookup by patient
wardAssignmentSchema.index({ patientId: 1 });

// Unique constraint: prevent double-booking of same bed in same ward when active
wardAssignmentSchema.index(
  { wardId: 1, bedNumber: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

// ── Model ───────────────────────────────────────────────────────────────────────

export const WardAssignment = mongoose.model<IWardAssignment>('WardAssignment', wardAssignmentSchema);