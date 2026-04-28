import mongoose, { type Document, Schema } from 'mongoose';

export interface IPendingUpload extends Document {
  _id: mongoose.Types.ObjectId;
  fileKey: string;
  userId: mongoose.Types.ObjectId;
  module: 'records' | 'prescriptions' | 'invoices' | 'patients' | 'doctors' | 'pharmacy';
  consumed: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pendingUploadSchema = new Schema<IPendingUpload>(
  {
    fileKey: {
      type: String,
      required: [true, 'fileKey is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      enum: ['records', 'prescriptions', 'invoices', 'patients', 'doctors', 'pharmacy'],
    },
    consumed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: [true, 'expiresAt is required'],
    },
  },
  { timestamps: true },
);

// Compound index for fast lookups by fileKey + userId
pendingUploadSchema.index({ fileKey: 1, userId: 1 });

// TTL index for auto-cleanup of expired pending uploads
pendingUploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingUpload = mongoose.model<IPendingUpload>('PendingUpload', pendingUploadSchema);
