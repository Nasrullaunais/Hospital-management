import mongoose, { type Document, Schema } from 'mongoose';

export interface IWardMedication extends Document {
  _id: mongoose.Types.ObjectId;
  wardAssignmentId: mongoose.Types.ObjectId;
  medicationId: mongoose.Types.ObjectId;
  dosage: string;
  frequency: string;
  route?: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'discontinued';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const wardMedicationSchema = new Schema<IWardMedication>(
  {
    wardAssignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'WardAssignment',
      required: [true, 'Ward assignment ID is required'],
      index: true,
    },
    medicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'Medication ID is required'],
      index: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required'],
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      trim: true,
    },
    route: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'discontinued'],
      default: 'active',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false },
);

export const WardMedication = mongoose.model<IWardMedication>('WardMedication', wardMedicationSchema);