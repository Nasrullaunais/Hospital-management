import mongoose, { type Document, Schema } from 'mongoose';

export interface ILabResult {
  parameter: string;
  value: number;
  unit: string;
  normalRange?: string;
  flag: 'normal' | 'high' | 'low' | 'critical';
}

export interface ILabReport extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  medicalRecordId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  labType: 'hematology' | 'biochemistry' | 'microbiology' | 'urinalysis' | 'radiology' | 'serology' | 'pathology' | 'other';
  testDate: Date;
  status: 'pending' | 'sample_collected' | 'in_progress' | 'completed' | 'reviewed';
  results: ILabResult[];
  interpretation?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const resultItemSchema = new Schema<ILabResult>(
  {
    parameter: { type: String, required: [true, 'Parameter name is required'] },
    value: { type: Number, required: [true, 'Result value is required'] },
    unit: { type: String, required: [true, 'Unit is required'] },
    normalRange: { type: String },
    flag: {
      type: String,
      enum: ['normal', 'high', 'low', 'critical'],
      default: 'normal',
    },
  },
  { _id: false },
);

const labReportSchema = new Schema<ILabReport>(
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
    medicalRecordId: {
      type: Schema.Types.ObjectId,
      ref: 'MedicalRecord',
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    labType: {
      type: String,
      enum: [
        'hematology',
        'biochemistry',
        'microbiology',
        'urinalysis',
        'radiology',
        'serology',
        'pathology',
        'other',
      ],
      required: [true, 'Lab type is required'],
    },
    testDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'sample_collected', 'in_progress', 'completed', 'reviewed'],
      default: 'pending',
    },
    results: {
      type: [resultItemSchema],
      required: [true, 'At least one result is required'],
      validate: {
        validator: (v: ILabResult[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one result is required',
      },
    },
    interpretation: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

labReportSchema.index({ patientId: 1, testDate: -1 });
labReportSchema.index({ doctorId: 1 });
labReportSchema.index({ medicalRecordId: 1 });
labReportSchema.index({ labType: 1 });
labReportSchema.index({ status: 1 });

export const LabReport = mongoose.model<ILabReport>('LabReport', labReportSchema);
