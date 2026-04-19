import mongoose, { type Document, Schema } from 'mongoose';

export interface IMedicalRecord extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  diagnosis: string;
  prescription?: string;
  dateRecorded: Date;
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
  { timestamps: true },
);

medicalRecordSchema.index({ patientId: 1, dateRecorded: -1 });
medicalRecordSchema.index({ doctorId: 1 });

export const MedicalRecord = mongoose.model<IMedicalRecord>('MedicalRecord', medicalRecordSchema);
