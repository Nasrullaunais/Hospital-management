import mongoose, { type Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  totalAmount: number;
  paymentStatus: 'Unpaid' | 'Pending Verification' | 'Paid' | 'Overdue';
  issuedDate: Date;
  dueDate: Date;
  /** File reference with protocol: 's3://...' | 'local://...' | legacy '/uploads/...' */
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
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
      max: [1000000, 'Total amount exceeds the maximum allowed value'],
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Pending Verification', 'Paid', 'Overdue'],
      default: 'Unpaid',
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    paymentReceiptUrl: {
      type: String,
    },
  },
  { timestamps: true },
);

invoiceSchema.index({ patientId: 1, paymentStatus: 1 });
invoiceSchema.index({ issuedDate: -1 });
invoiceSchema.index({ paymentStatus: 1, dueDate: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
