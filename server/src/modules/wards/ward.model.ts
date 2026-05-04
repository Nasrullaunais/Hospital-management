import mongoose, { type Document, Schema } from 'mongoose';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface IWard extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  location: string;
  type: 'general' | 'private' | 'icu' | 'emergency';
  totalBeds: number;
  currentOccupancy: number;
  status: 'available' | 'full' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const wardSchema = new Schema<IWard>(
  {
    name: {
      type: String,
      required: [true, 'Ward name is required'],
      trim: true,
      maxlength: [100, 'Ward name cannot exceed 100 characters'],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: ['general', 'private', 'icu', 'emergency'],
      required: [true, 'Ward type is required'],
    },
    totalBeds: {
      type: Number,
      required: [true, 'Total beds is required'],
      min: [1, 'Total beds must be at least 1'],
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: [0, 'Current occupancy cannot be negative'],
      validate: {
        validator: function (this: IWard, value: number) {
          return value <= this.totalBeds;
        },
        message: 'Current occupancy cannot exceed total beds',
      },
    },
    status: {
      type: String,
      enum: ['available', 'full', 'maintenance'],
      default: function (this: IWard) {
        // Auto-set status based on occupancy
        if (this.currentOccupancy >= this.totalBeds) return 'full';
        return 'available';
      },
    },
  },
  { timestamps: true, versionKey: false, toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      const idStr = ret._id.toString();
      ret.id = idStr;
      ret._id = idStr;
      delete ret.__v;
      return ret;
    },
  } },
);

// ── Indexes ────────────────────────────────────────────────────────────────────
wardSchema.index({ type: 1 });
wardSchema.index({ status: 1 });

export const Ward = mongoose.model<IWard>('Ward', wardSchema);
