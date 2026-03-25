import mongoose, { type Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  totalAmount: number;
  paymentStatus: 'Unpaid' | 'Pending Verification' | 'Paid';
  issuedDate: Date;
  paymentReceiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Pending Verification', 'Paid'],
      default: 'Unpaid',
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    paymentReceiptUrl: {
      type: String,
    },
  },
  { timestamps: true },
);

invoiceSchema.index({ patientId: 1, paymentStatus: 1 });
invoiceSchema.index({ issuedDate: -1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
