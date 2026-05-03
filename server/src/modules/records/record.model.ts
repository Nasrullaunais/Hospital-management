import mongoose, { type Document, Schema } from 'mongoose';

export interface IMedicalRecord extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  diagnosis: string;
  prescription?: string;
  dateRecorded: Date;
  /** File reference with protocol: 's3://...' | 'local://...' | legacy '/uploads/...' */
  labReportUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient is required'],
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
    },
    prescription: {
      type: String,
      trim: true,
    },
    dateRecorded: {
      type: Date,
      default: Date.now,
    },
    labReportUrl: {
      type: String,
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

medicalRecordSchema.index({ patientId: 1, dateRecorded: -1 });
medicalRecordSchema.index({ doctorId: 1 });
medicalRecordSchema.index(
  { patientId: 1, appointmentId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { appointmentId: { $type: 'objectId' } } },
);

export const MedicalRecord = mongoose.model<IMedicalRecord>('MedicalRecord', medicalRecordSchema);
