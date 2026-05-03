import mongoose, { type Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  amount: number;
  currency: 'LKR' | 'USD';
  method: 'mock_card' | 'bank_transfer' | 'stripe';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  metadata?: Map<string, string>;
  receiptUrl?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice ID is required'],
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'LKR',
      enum: ['LKR', 'USD'],
    },
    method: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['mock_card', 'bank_transfer', 'stripe'],
        message: '{VALUE} is not a valid payment method',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    stripePaymentIntentId: {
      type: String,
    },
    metadata: {
      type: Map,
      of: String,
    },
    receiptUrl: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true, versionKey: false },
);

paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ patientId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
