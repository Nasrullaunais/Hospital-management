import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../modules/auth/auth.model.js';
import { Doctor } from '../modules/doctors/doctor.model.js';
import { Medicine } from '../modules/pharmacy/medicine.model.js';
import { Prescription } from '../modules/prescriptions/prescription.model.js';
import { env } from '../config/env.js';

interface TestUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  role: string;
  name: string;
}

interface TestDoctor {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  specialization: string;
}

interface TestMedicine {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
}

function getToken(user: { _id: { toString: () => string }; email: string; role: string }): string {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

async function createUser(params: { name?: string; email?: string; role: string }): Promise<TestUser> {
  const suffix = `${params.role}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return User.create({
    name: params.name ?? `${params.role} user`,
    email: params.email ?? `${suffix}@example.com`,
    password: 'Password123!',
    role: params.role,
  }) as Promise<TestUser>;
}

async function createDoctor(params: { userId: mongoose.Types.ObjectId; specialization?: string }): Promise<TestDoctor> {
  return Doctor.create({
    userId: params.userId,
    specialization: params.specialization ?? 'General Medicine',
    experienceYears: 5,
    consultationFee: 100,
    availability: 'Available',
    licenseDocumentUrl: '/uploads/test-license.pdf',
  }) as Promise<TestDoctor>;
}

async function createMedicine(params?: { name?: string; category?: string; stockQuantity?: number }): Promise<TestMedicine> {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  return Medicine.create({
    name: params?.name ?? 'Test Medicine',
    category: params?.category ?? 'Antibiotic',
    price: 25.99,
    stockQuantity: params?.stockQuantity ?? 100,
    expiryDate: futureDate,
    packagingImageUrl: '/uploads/test-medicine.jpg',
  }) as Promise<TestMedicine>;
}

async function createPrescription(params: {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  medicalRecordId?: mongoose.Types.ObjectId;
  items: Array<{
    medicineId: mongoose.Types.ObjectId;
    medicineName: string;
    dosage: string;
    quantity: number;
    instructions?: string;
  }>;
  notes?: string;
  status?: 'active' | 'fulfilled' | 'cancelled';
}): Promise<any> {
  return Prescription.create({
    patientId: params.patientId,
    doctorId: params.doctorId,
    medicalRecordId: params.medicalRecordId,
    items: params.items,
    notes: params.notes,
    status: params.status ?? 'active',
  });
}

interface TestHelper {
  createUser: (params: { name?: string; email?: string; role: string }) => Promise<TestUser>;
  createDoctor: (params: { userId: mongoose.Types.ObjectId; specialization?: string }) => Promise<TestDoctor>;
  createMedicine: (params?: { name?: string; category?: string; stockQuantity?: number }) => Promise<TestMedicine>;
  createPrescription: (params: {
    patientId: mongoose.Types.ObjectId;
    doctorId: mongoose.Types.ObjectId;
    medicalRecordId?: mongoose.Types.ObjectId;
    items: Array<{
      medicineId: mongoose.Types.ObjectId;
      medicineName: string;
      dosage: string;
      quantity: number;
      instructions?: string;
    }>;
    notes?: string;
    status?: 'active' | 'fulfilled' | 'cancelled';
  }) => Promise<any>;
  getToken: (user: { _id: { toString: () => string }; email: string; role: string }) => string;
}

const testHelper: TestHelper = {
  createUser,
  createDoctor,
  createMedicine,
  createPrescription,
  getToken,
};

export type { TestUser, TestDoctor, TestMedicine, TestHelper };

(global as typeof global & { testHelper: TestHelper }).testHelper = testHelper;