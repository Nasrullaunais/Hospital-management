import mongoose, { type Document, Schema } from 'mongoose';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  headDoctorId?: mongoose.Types.ObjectId;
  location: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    headDoctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: false,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      maxlength: [20, 'Phone cannot exceed 20 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────────
departmentSchema.index({ status: 1 });

export const Department = mongoose.model<IDepartment>('Department', departmentSchema);
