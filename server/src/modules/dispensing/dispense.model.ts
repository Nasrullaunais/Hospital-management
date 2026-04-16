import mongoose from 'mongoose';

const dispensedItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  dosage: { type: String },
  quantityPrescribed: { type: Number, required: true },
  quantityDispensed: { type: Number, required: true },
  instructions: { type: String }
}, { _id: false });

const dispenseSchema = new mongoose.Schema({
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dispensedItems: { type: [dispensedItemSchema], required: true },
  status: { type: String, enum: ['fulfilled', 'partial', 'cancelled'], default: 'fulfilled' },
  fulfilledAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Dispense = mongoose.model('Dispense', dispenseSchema);