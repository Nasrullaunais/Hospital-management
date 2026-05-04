import mongoose from 'mongoose';

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: { type: String, required: true },
    dosage: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    instructions: { type: String },
  },
  { _id: false },
);

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    medicalRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
    items: { type: [prescriptionItemSchema], required: true },
    notes: { type: String },
    status: { type: String, enum: ['active', 'fulfilled', 'cancelled'], default: 'active' },
  },
  { timestamps: true, versionKey: false, toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      const idStr = ret._id.toString();
      ret.id = idStr;
      ret._id = idStr; // keep _id as string — client types reference it
      delete ret.__v;
      return ret;
    },
  } },
);

prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ 'items.medicineId': 1 });

export const Prescription = mongoose.model('Prescription', prescriptionSchema);
