import mongoose, { type Document, type Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin' | 'pharmacist' | 'receptionist';
  phone?: string;
  dateOfBirth?: Date;
  /** File reference with protocol: 's3://...' | 'local://...' | legacy '/uploads/...' */
  idDocumentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastVisit?: Date;
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  // Static methods can be added here
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['patient', 'doctor', 'admin', 'pharmacist', 'receptionist'],
        message: 'Role must be patient, doctor, admin, pharmacist, or receptionist',
      },
      default: 'patient',
    },
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    idDocumentUrl: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastVisit: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: {
      transform: (_doc, ret) => {
        // Never expose password in JSON serialization
        const sanitized = ret as { password?: string };
        delete sanitized.password;
        return sanitized;
      },
    },
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });

// ── Pre-save Hook: Hash password ───────────────────────────────────────────────
userSchema.pre('save', async function () {
  // Only hash if password has been modified (or is new)
  if (!this.isModified('password')) return;

  const saltRounds = 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

// ── Instance Method: Compare password ─────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Model ──────────────────────────────────────────────────────────────────────
export const User: IUserModel = mongoose.model<IUser, IUserModel>('User', userSchema);
