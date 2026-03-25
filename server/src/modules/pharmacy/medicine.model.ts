import mongoose, { type Document, Schema } from 'mongoose';

export interface IMedicine extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
  expiryDate: Date;
  packagingImageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<IMedicine>(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    packagingImageUrl: {
      type: String,
      required: [true, 'Packaging image is required'],
    },
  },
  { timestamps: true },
);

medicineSchema.index({ name: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ stockQuantity: 1 });

export const Medicine = mongoose.model<IMedicine>('Medicine', medicineSchema);
