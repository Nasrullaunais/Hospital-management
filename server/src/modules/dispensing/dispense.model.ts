import mongoose, { type Document, Schema } from 'mongoose';

export interface IDispense extends Document {
  _id: mongoose.Types.ObjectId;
  prescriptionId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  pharmacistId: mongoose.Types.ObjectId;
  dispensedItems: Array<{
    medicineId: mongoose.Types.ObjectId;
    medicineName: string;
    dosage?: string;
    quantityPrescribed: number;
    quantityDispensed: number;
    instructions?: string;
  }>;
  status: 'fulfilled' | 'partial' | 'cancelled';
  fulfilledAt: Date;
  invoiceId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const dispensedItemSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    dosage: { type: String },
    quantityPrescribed: { type: Number, required: true },
    quantityDispensed: { type: Number, required: true },
    instructions: { type: String },
  },
  { _id: false },
);

const dispenseSchema = new mongoose.Schema(
  {
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dispensedItems: { type: [dispensedItemSchema], required: true },
    status: { type: String, enum: ['fulfilled', 'partial', 'cancelled'], default: 'fulfilled' },
    fulfilledAt: { type: Date, default: Date.now },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
  },
  { timestamps: true, versionKey: false, toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  } },
);

// Indexes for common query patterns
dispenseSchema.index({ patientId: 1, fulfilledAt: -1 });
dispenseSchema.index({ pharmacistId: 1, fulfilledAt: -1 });
dispenseSchema.index({ pharmacistId: 1 });
dispenseSchema.index({ prescriptionId: 1 });
dispenseSchema.index({ invoiceId: 1 });

export const Dispense = mongoose.model<IDispense>('Dispense', dispenseSchema);
