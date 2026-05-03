import mongoose, { type Document, Schema } from 'mongoose';
import { MAX_INVOICE_AMOUNT } from '../../shared/constants/billing.js';

// ── Invoice Line Item Subdocument ─────────────────────────────────────────────

export interface IInvoiceItem {
  description: string;
  category: 'consultation' | 'medicine' | 'lab_test' | 'ward' | 'procedure' | 'other';
  quantity: number;
  unitPrice: number;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: [true, 'Item category is required'],
      enum: {
        values: ['consultation', 'medicine', 'lab_test', 'ward', 'procedure', 'other'],
        message: '{VALUE} is not a valid item category',
      },
    },
    quantity: {
      type: Number,
      required: [true, 'Item quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      max: [1000, 'Quantity cannot exceed 1000'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Item unit price is required'],
      min: [0, 'Unit price cannot be negative'],
      max: [MAX_INVOICE_AMOUNT, `Unit price cannot exceed ${MAX_INVOICE_AMOUNT}`],
    },
  },
  { _id: false },
);

// ── Invoice Document Interface ────────────────────────────────────────────────

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  items: IInvoiceItem[];
  discount: number;
  /** Virtual — computed from items and discount */
  totalAmount: number;
  /** Virtual — sum of items before discount */
  subtotal: number;
  paymentStatus: 'Unpaid' | 'Pending Verification' | 'Paid' | 'Overdue';
  issuedDate: Date;
  dueDate: Date;
  /** File reference with protocol: 's3://...' | 'local://...' | legacy '/uploads/...' */
  paymentReceiptUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

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
    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: (v: IInvoiceItem[]) => v.length > 0,
        message: 'At least one invoice item is required',
      },
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
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
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// ── Virtuals ──────────────────────────────────────────────────────────────────

invoiceSchema.virtual('subtotal').get(function (this: IInvoice) {
  return this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
});

invoiceSchema.virtual('totalAmount').get(function (this: IInvoice) {
  return Math.max(0, this.subtotal - this.discount);
});

// ── Indexes ───────────────────────────────────────────────────────────────────

invoiceSchema.index({ patientId: 1, paymentStatus: 1 });
invoiceSchema.index({ issuedDate: -1 });
invoiceSchema.index({ paymentStatus: 1, dueDate: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
