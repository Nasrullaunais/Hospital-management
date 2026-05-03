import mongoose, { type Document, Schema } from 'mongoose';

export interface IMedicine extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
  expiryDate: Date;
  /** File reference with protocol: 's3://...' | 'local://...' | legacy '/uploads/...' */
  packagingImageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_EXPIRY_YEARS = 10;

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
      min: [0, 'Stock cannot be negative'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      validate: {
        validator: function(value: Date) {
          const now = new Date();
          const maxDate = new Date(now.getFullYear() + MAX_EXPIRY_YEARS, now.getMonth(), now.getDate());
          return value > now && value <= maxDate;
        },
        message: `Expiry date must be between tomorrow and ${MAX_EXPIRY_YEARS} years from now`,
      },
    },
    packagingImageUrl: {
      type: String,
      required: [true, 'Packaging image is required'],
    },
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

medicineSchema.index({ name: 1 }, { unique: true });
medicineSchema.index({ category: 1, name: 1 });
medicineSchema.index({ stockQuantity: 1 });

export const Medicine = mongoose.model<IMedicine>('Medicine', medicineSchema);
