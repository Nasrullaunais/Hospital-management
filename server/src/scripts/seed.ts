/**
 * Mock Data Seeder — Hospital Management System
 * Run: bun run server/src/scripts/seed.ts
 *
 * Seeds realistic, inter-referenced data across ALL modules.
 * Uses direct Mongoose access (not API) for reliability.
 */

import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import { MongoClient } from 'mongodb';

// ── Env ─────────────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../.env');
await import('dotenv/config');

// ── Models ──────────────────────────────────────────────────────────────────────
import { User } from '../modules/auth/auth.model.js';
import { Doctor } from '../modules/doctors/doctor.model.js';
import { Appointment } from '../modules/appointments/appointment.model.js';
import { MedicalRecord } from '../modules/records/record.model.js';
import { Medicine } from '../modules/pharmacy/medicine.model.js';
import { Invoice } from '../modules/billing/invoice.model.js';
import { Prescription } from '../modules/prescriptions/prescription.model.js';
import { Dispense } from '../modules/dispensing/dispense.model.js';
import { Ward } from '../modules/wards/ward.model.js';
import { WardAssignment } from '../modules/wardAssignments/wardAssignment.model.js';
import { WardMedication } from '../modules/wardMedications/wardMedication.model.js';
import { LabReport } from '../modules/labReports/labReport.model.js';
import { Payment } from '../modules/billing/payment.model.js';

// ── Connect ──────────────────────────────────────────────────────────────────────
let mongoClient: MongoClient;

async function connect() {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/hospital_management';
  const dbName = 'hospital-management';
  await mongoose.connect(uri, { dbName });
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  console.log('✅ Connected to MongoDB');
}

// ── Utility ────────────────────────────────────────────────────────────────────
function uid() { return new mongoose.Types.ObjectId(); }
function futureDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}
function pastDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}
function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Seeder ─────────────────────────────────────────────────────────────────────
async function seed() {
  await connect();

  // Wipe everything
  await Promise.all([
    User.deleteMany({}),
    Doctor.deleteMany({}),
    Appointment.deleteMany({}),
    MedicalRecord.deleteMany({}),
    Medicine.deleteMany({}),
    Invoice.deleteMany({}),
    Prescription.deleteMany({}),
    Dispense.deleteMany({}),
    Ward.deleteMany({}),
    WardAssignment.deleteMany({}),
    WardMedication.deleteMany({}),
    LabReport.deleteMany({}),
    Payment.deleteMany({}),
  ]);
  console.log('🧹 Cleared all collections');

  // ── 1. USERS ────────────────────────────────────────────────────────────────
  // Plain text here — the User model's pre-save hook hashes it via bcrypt
  const password = 'Password123';

  // Admin
  const admin = await User.create({
    name: 'Sarah Mitchell',
    email: 'admin@hospital.com',
    password,
    role: 'admin',
    phone: '+1-555-0100',
    isActive: true,
  });

  // Pharmacist
  const pharmacist = await User.create({
    name: 'James Rodriguez',
    email: 'pharmacist@hospital.com',
    password: password,
    role: 'pharmacist',
    phone: '+1-555-0101',
    isActive: true,
  });

  // Receptionist
  const receptionist = await User.create({
    name: 'Emily Chen',
    email: 'receptionist@hospital.com',
    password: password,
    role: 'receptionist',
    phone: '+1-555-0102',
    isActive: true,
  });

  // Doctors (users first, then doctor profiles)
  const doctorUsers = await User.create([
    {
      name: 'Dr. Alexander Petrov',
      email: 'dr.petrov@hospital.com',
      password: password,
      role: 'doctor',
      phone: '+1-555-0201',
      dateOfBirth: new Date('1978-03-15'),
      isActive: true,
    },
    {
      name: 'Dr. Priya Sharma',
      email: 'dr.sharma@hospital.com',
      password: password,
      role: 'doctor',
      phone: '+1-555-0202',
      dateOfBirth: new Date('1982-07-22'),
      isActive: true,
    },
    {
      name: 'Dr. Michael Thompson',
      email: 'dr.thompson@hospital.com',
      password: password,
      role: 'doctor',
      phone: '+1-555-0203',
      dateOfBirth: new Date('1975-11-08'),
      isActive: true,
    },
    {
      name: 'Dr. Aisha Okafor',
      email: 'dr.okafor@hospital.com',
      password: password,
      role: 'doctor',
      phone: '+1-555-0204',
      dateOfBirth: new Date('1985-05-30'),
      isActive: true,
    },
    {
      name: 'Dr. Carlos Mendes',
      email: 'dr.mendes@hospital.com',
      password: password,
      role: 'doctor',
      phone: '+1-555-0205',
      dateOfBirth: new Date('1980-09-12'),
      isActive: true,
    },
  ]);

  // Patients
  const patientUsers = await User.create([
    {
      name: 'Robert Williams',
      email: 'robert.w@example.com',
      password: password,
      role: 'patient',
      phone: '+1-555-1001',
      dateOfBirth: new Date('1965-08-20'),
      isActive: true,
      lastVisit: pastDate(5),
    },
    {
      name: 'Jennifer Martinez',
      email: 'jennifer.m@example.com',
      password: password,
      role: 'patient',
      phone: '+1-555-1002',
      dateOfBirth: new Date('1990-04-14'),
      isActive: true,
      lastVisit: pastDate(2),
    },
    {
      name: 'David Kim',
      email: 'david.kim@example.com',
      password: password,
      role: 'patient',
      phone: '+1-555-1003',
      dateOfBirth: new Date('1978-12-03'),
      isActive: true,
      lastVisit: pastDate(10),
    },
    {
      name: 'Fatima Al-Hassan',
      email: 'fatima.ah@example.com',
      password: password,
      role: 'patient',
      phone: '+1-555-1004',
      dateOfBirth: new Date('1995-01-27'),
      isActive: true,
      lastVisit: pastDate(1),
    },
    {
      name: 'Thomas O\'Brien',
      email: 'thomas.ob@example.com',
      password: password,
      role: 'patient',
      phone: '+1-555-1005',
      dateOfBirth: new Date('1958-06-18'),
      isActive: true,
      lastVisit: pastDate(15),
    },
    {
      name: 'Sofia Andersson',
      email: 'sofia.and@example.com',
      password: password,
      role: 'patient',
      phone: '+1-555-1006',
      dateOfBirth: new Date('1988-10-09'),
      isActive: true,
      lastVisit: pastDate(7),
    },
    {
      name: 'Marcus Johnson',
      email: 'marcus.j@example.com',
      password: password,
      role: 'patient',
      phone: '+1-555-1007',
      dateOfBirth: new Date('1972-03-25'),
      isActive: true,
      lastVisit: pastDate(3),
    },
    {
      name: 'Layla Ibrahim',
      email: 'layla.ib@example.com',
      password: password,
      role: 'patient',
      phone: '+1-555-1008',
      dateOfBirth: new Date('1992-07-11'),
      isActive: true,
      lastVisit: pastDate(20),
    },
  ]);

  console.log(`👤 Created ${1 + 1 + 1 + doctorUsers.length + patientUsers.length} users`);
  console.log('   Login: any email above with password "Password123"');

  // ── 2. DOCTORS ──────────────────────────────────────────────────────────────

  const doctors = await Doctor.create([
    {
      userId: doctorUsers[0]._id,
      specialization: 'Interventional Cardiology',
      experienceYears: 18,
      consultationFee: 350,
      availability: 'Available',
      licenseDocumentUrl: '/uploads/dr_petrov_license.pdf',
    },
    {
      userId: doctorUsers[1]._id,
      specialization: 'Pediatric Medicine',
      experienceYears: 12,
      consultationFee: 250,
      availability: 'Available',
      licenseDocumentUrl: '/uploads/dr_sharma_license.pdf',
    },
    {
      userId: doctorUsers[2]._id,
      specialization: 'Orthopedic Surgery',
      experienceYears: 22,
      consultationFee: 400,
      availability: 'On Leave',
      licenseDocumentUrl: '/uploads/dr_thompson_license.pdf',
    },
    {
      userId: doctorUsers[3]._id,
      specialization: 'Neurology',
      experienceYears: 10,
      consultationFee: 320,
      availability: 'Available',
      licenseDocumentUrl: '/uploads/dr_okafor_license.pdf',
    },
    {
      userId: doctorUsers[4]._id,
      specialization: 'Internal Medicine',
      experienceYears: 15,
      consultationFee: 220,
      availability: 'Available',
      licenseDocumentUrl: '/uploads/dr_mendes_license.pdf',
    },
  ]);
  console.log(`👨‍⚕️ Created ${doctors.length} doctors`);

  // ── 3. MEDICINES ───────────────────────────────────────────────────────────
  const medicines = await Medicine.create([
    // Antibiotics
    { name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 12.50, stockQuantity: 450, expiryDate: futureDate(730), packagingImageUrl: '/uploads/amoxicillin.jpg' },
    { name: 'Azithromycin 250mg', category: 'Antibiotic', price: 28.00, stockQuantity: 320, expiryDate: futureDate(540), packagingImageUrl: '/uploads/azithromycin.jpg' },
    { name: 'Ciprofloxacin 500mg', category: 'Antibiotic', price: 18.75, stockQuantity: 280, expiryDate: futureDate(600), packagingImageUrl: '/uploads/ciprofloxacin.jpg' },
    { name: 'Metronidazole 400mg', category: 'Antibiotic', price: 15.00, stockQuantity: 200, expiryDate: futureDate(480), packagingImageUrl: '/uploads/metronidazole.jpg' },
    // Analgesics
    { name: 'Ibuprofen 400mg', category: 'Analgesic', price: 8.50, stockQuantity: 800, expiryDate: futureDate(900), packagingImageUrl: '/uploads/ibuprofen.jpg' },
    { name: 'Paracetamol 500mg', category: 'Analgesic', price: 5.00, stockQuantity: 1200, expiryDate: futureDate(365), packagingImageUrl: '/uploads/paracetamol.jpg' },
    { name: 'Tramadol 50mg', category: 'Analgesic', price: 22.00, stockQuantity: 150, expiryDate: futureDate(400), packagingImageUrl: '/uploads/tramadol.jpg' },
    // Cardiovascular
    { name: 'Amlodipine 5mg', category: 'Cardiovascular', price: 18.00, stockQuantity: 400, expiryDate: futureDate(550), packagingImageUrl: '/uploads/amlodipine.jpg' },
    { name: 'Lisinopril 10mg', category: 'Cardiovascular', price: 14.50, stockQuantity: 350, expiryDate: futureDate(620), packagingImageUrl: '/uploads/lisinopril.jpg' },
    { name: 'Atorvastatin 20mg', category: 'Cardiovascular', price: 25.00, stockQuantity: 300, expiryDate: futureDate(480), packagingImageUrl: '/uploads/atorvastatin.jpg' },
    { name: 'Metoprolol 50mg', category: 'Cardiovascular', price: 12.00, stockQuantity: 250, expiryDate: futureDate(500), packagingImageUrl: '/uploads/metoprolol.jpg' },
    // Gastrointestinal
    { name: 'Omeprazole 20mg', category: 'Gastrointestinal', price: 10.00, stockQuantity: 500, expiryDate: futureDate(700), packagingImageUrl: '/uploads/omeprazole.jpg' },
    { name: 'Pantoprazole 40mg', category: 'Gastrointestinal', price: 15.00, stockQuantity: 380, expiryDate: futureDate(600), packagingImageUrl: '/uploads/pantoprazole.jpg' },
    { name: 'Ondansetron 8mg', category: 'Gastrointestinal', price: 35.00, stockQuantity: 180, expiryDate: futureDate(450), packagingImageUrl: '/uploads/ondansetron.jpg' },
    // Respiratory
    { name: 'Salbutamol 100mcg', category: 'Respiratory', price: 20.00, stockQuantity: 220, expiryDate: futureDate(380), packagingImageUrl: '/uploads/salbutamol.jpg' },
    { name: 'Fluticasone 250mcg', category: 'Respiratory', price: 45.00, stockQuantity: 120, expiryDate: futureDate(420), packagingImageUrl: '/uploads/fluticasone.jpg' },
    // Neurological
    { name: 'Gabapentin 300mg', category: 'Neurological', price: 30.00, stockQuantity: 200, expiryDate: futureDate(550), packagingImageUrl: '/uploads/gabapentin.jpg' },
    { name: 'Levodopa 100mg', category: 'Neurological', price: 55.00, stockQuantity: 90, expiryDate: futureDate(500), packagingImageUrl: '/uploads/levodopa.jpg' },
    // Orthopedic
    { name: 'Diclofenac 75mg', category: 'Orthopedic', price: 16.00, stockQuantity: 310, expiryDate: futureDate(480), packagingImageUrl: '/uploads/diclofenac.jpg' },
    { name: 'Muscle Relaxant Capsule', category: 'Orthopedic', price: 22.00, stockQuantity: 140, expiryDate: futureDate(400), packagingImageUrl: '/uploads/muscle_relaxant.jpg' },
    // ADHD / Mental Health
    { name: 'Methylphenidate 10mg', category: 'Mental Health', price: 65.00, stockQuantity: 75, expiryDate: futureDate(360), packagingImageUrl: '/uploads/methylphenidate.jpg' },
    { name: 'Sertraline 50mg', category: 'Mental Health', price: 28.00, stockQuantity: 220, expiryDate: futureDate(520), packagingImageUrl: '/uploads/sertraline.jpg' },
    { name: 'Diazepam 5mg', category: 'Mental Health', price: 12.00, stockQuantity: 100, expiryDate: futureDate(300), packagingImageUrl: '/uploads/diazepam.jpg' },
    // Low stock / near expiry (for realism)
    { name: 'Morphine Sulfate 10mg', category: 'Controlled', price: 85.00, stockQuantity: 20, expiryDate: futureDate(90), packagingImageUrl: '/uploads/morphine.jpg' },
    { name: 'Insulin Glargine', category: 'Endocrine', price: 120.00, stockQuantity: 8, expiryDate: futureDate(60), packagingImageUrl: '/uploads/insulin.jpg' },
  ]);
  console.log(`💊 Created ${medicines.length} medicines`);

  // ── 4. APPOINTMENTS ────────────────────────────────────────────────────────
  const [drPetrov, drSharma, drThompson, drOkafor, drMendes] = doctors;
  const [pat1, pat2, pat3, pat4, pat5, pat6, pat7, pat8] = patientUsers;

  const appointments: Array<Record<string, unknown>> = [
    {
      patientId: pat1._id,
      doctorId: drPetrov._id,
      appointmentDate: futureDate(2),
      reasonForVisit: 'Chest pain and shortness of breath during exercise',
      status: 'Pending',
    },
    {
      patientId: pat2._id,
      doctorId: drSharma._id,
      appointmentDate: futureDate(3),
      reasonForVisit: 'Routine child vaccination and wellness check',
      status: 'Confirmed',
    },
    {
      patientId: pat3._id,
      doctorId: drOkafor._id,
      appointmentDate: futureDate(4),
      reasonForVisit: 'Recurring migraines, sensitivity to light',
      status: 'Pending',
    },
    {
      patientId: pat4._id,
      doctorId: drMendes._id,
      appointmentDate: futureDate(5),
      reasonForVisit: 'Annual physical examination and blood work review',
      status: 'Pending',
    },
    {
      patientId: pat5._id,
      doctorId: drPetrov._id,
      appointmentDate: futureDate(7),
      reasonForVisit: 'Hypertension follow-up, blood pressure monitoring',
      status: 'Confirmed',
    },
    {
      patientId: pat6._id,
      doctorId: drMendes._id,
      appointmentDate: pastDate(10),
      reasonForVisit: 'Persistent cough and flu-like symptoms',
      status: 'Completed',
    },
    {
      patientId: pat1._id,
      doctorId: drOkafor._id,
      appointmentDate: pastDate(20),
      reasonForVisit: 'Lower back pain radiating to left leg',
      status: 'Completed',
    },
    {
      patientId: pat2._id,
      doctorId: drPetrov._id,
      appointmentDate: pastDate(15),
      reasonForVisit: 'Irregular heartbeat detected during routine check',
      status: 'Completed',
    },
    {
      patientId: pat7._id,
      doctorId: drThompson._id,
      appointmentDate: pastDate(8),
      reasonForVisit: 'Knee replacement surgery follow-up',
      status: 'Completed',
    },
    {
      patientId: pat3._id,
      doctorId: drSharma._id,
      appointmentDate: pastDate(5),
      reasonForVisit: 'Childhood asthma exacerbation',
      status: 'Completed',
    },
    {
      patientId: pat8._id,
      doctorId: drPetrov._id,
      appointmentDate: pastDate(2),
      reasonForVisit: 'Dizziness and fatigue',
      status: 'Cancelled',
    },
    {
      patientId: pat1._id,
      doctorId: drPetrov._id,
      appointmentDate: pastDate(3),
      reasonForVisit: 'Emergency cardiac observation',
      status: 'Completed',
    },
  ];

  const db = mongoClient.db('hospital-management');
  await db.collection('appointments').insertMany(appointments);
  console.log(`📅 Created ${appointments.length} appointments`);

  // ── 5. MEDICAL RECORDS ─────────────────────────────────────────────────────
  const completedAppts = appointments.filter(a => a.status === 'Completed');

  const records = await MedicalRecord.create([
    {
      patientId: pat6._id,
      doctorId: drMendes._id,
      diagnosis: 'Acute viral pharyngitis with mild dehydration',
      prescription: 'Amoxicillin 500mg 3x daily for 7 days, Paracetamol 500mg as needed',
      dateRecorded: pastDate(10),
      labReportUrl: '/uploads/lab_report_pat6_pharyngitis.pdf',
    },
    {
      patientId: pat1._id,
      doctorId: drOkafor._id,
      diagnosis: 'Lumbar radiculopathy (L4-L5) with moderate disc bulge',
      prescription: 'Gabapentin 300mg 3x daily, Diclofenac 75mg 2x daily, Physiotherapy 2x/week',
      dateRecorded: pastDate(20),
    },
    {
      patientId: pat2._id,
      doctorId: drPetrov._id,
      diagnosis: 'Paroxysmal atrial fibrillation, controlled on medication',
      prescription: 'Amlodipine 5mg daily, Atorvastatin 20mg nightly, follow-up in 3 months',
      dateRecorded: pastDate(15),
      labReportUrl: '/uploads/lab_report_pat2_ecg.pdf',
    },
    {
      patientId: pat7._id,
      doctorId: drThompson._id,
      diagnosis: 'Post-operative recovery, total knee replacement, day 10',
      prescription: 'Tramadol 50mg as needed for pain, continue physiotherapy exercises',
      dateRecorded: pastDate(8),
    },
    {
      patientId: pat3._id,
      doctorId: drSharma._id,
      diagnosis: 'Acute asthma exacerbation triggered by viral infection',
      prescription: 'Salbutamol 100mcg inhaler as needed, Fluticasone 250mcg 2x daily, Prednisolone 30mg for 5 days',
      dateRecorded: pastDate(5),
      labReportUrl: '/uploads/lab_report_pat3_asthma.pdf',
    },
    {
      patientId: pat1._id,
      doctorId: drPetrov._id,
      diagnosis: 'Hypertensive urgency with unstable angina — admitted for observation',
      prescription: 'IV Amlodipine 5mg, Morphine Sulfate 10mg for pain, Bed rest and cardiac monitoring',
      dateRecorded: pastDate(3),
    },
  ]);
  console.log(`📋 Created ${records.length} medical records`);

  const [rec1, rec2, rec3, rec4, rec5, rec6] = records;

  // ── 6. LAB REPORTS ────────────────────────────────────────────────────────
  const labReports = await LabReport.create([
    {
      patientId: pat6._id,
      doctorId: drMendes._id,
      medicalRecordId: rec1._id,
      labType: 'hematology',
      testDate: pastDate(10),
      status: 'completed',
      results: [
        { parameter: 'Hemoglobin', value: 13.2, unit: 'g/dL', normalRange: '12.0-15.5', flag: 'normal' },
        { parameter: 'WBC Count', value: 11.8, unit: 'x10³/µL', normalRange: '4.5-11.0', flag: 'high' },
        { parameter: 'Platelets', value: 245, unit: 'x10³/µL', normalRange: '150-400', flag: 'normal' },
        { parameter: 'CRP', value: 28.5, unit: 'mg/L', normalRange: '<5.0', flag: 'critical' },
      ],
      interpretation: 'Elevated WBC and CRP consistent with acute viral pharyngitis. Normocytic normochromic RBCs.',
      notes: 'Repeat CBC in 2 weeks after antibiotic course.',
    },
    {
      patientId: pat1._id,
      doctorId: drOkafor._id,
      medicalRecordId: rec2._id,
      labType: 'radiology',
      testDate: pastDate(19),
      status: 'reviewed',
      results: [
        { parameter: 'L4-L5 Disc Space', value: 4.2, unit: 'mm', normalRange: '5.0-7.0', flag: 'low' },
        { parameter: 'Nerve Root Compression', value: 1, unit: 'grade', normalRange: '0', flag: 'critical' },
      ],
      interpretation: 'MRI confirms moderate disc bulge at L4-L5 with left lateral recess stenosis and nerve root impingement at L5.',
      notes: 'Patient referred to neurosurgery for evaluation.',
    },
    {
      patientId: pat2._id,
      doctorId: drPetrov._id,
      medicalRecordId: rec3._id,
      labType: 'biochemistry',
      testDate: pastDate(14),
      status: 'reviewed',
      results: [
        { parameter: 'Total Cholesterol', value: 245, unit: 'mg/dL', normalRange: '<200', flag: 'high' },
        { parameter: 'LDL', value: 162, unit: 'mg/dL', normalRange: '<100', flag: 'high' },
        { parameter: 'HDL', value: 38, unit: 'mg/dL', normalRange: '>40', flag: 'low' },
        { parameter: 'Triglycerides', value: 210, unit: 'mg/dL', normalRange: '<150', flag: 'high' },
        { parameter: 'Troponin I', value: 0.02, unit: 'ng/mL', normalRange: '<0.04', flag: 'normal' },
      ],
      interpretation: 'Mixed dyslipidemia with elevated LDL and triglycerides. Troponin normal — no acute cardiac event.',
      notes: 'Continue Atorvastatin 20mg. Recommend dietary modifications. Repeat lipid panel in 3 months.',
    },
    {
      patientId: pat7._id,
      doctorId: drThompson._id,
      medicalRecordId: rec4._id,
      labType: 'microbiology',
      testDate: pastDate(7),
      status: 'completed',
      results: [
        { parameter: 'Wound Swab Culture', value: 0, unit: 'colonies', normalRange: 'No growth', flag: 'normal' },
        { parameter: 'Gram Stain', value: 0, unit: 'organisms', normalRange: 'No organisms', flag: 'normal' },
      ],
      interpretation: 'No bacterial growth from surgical site. Wound healing progressing normally.',
      notes: 'Continue current wound care protocol.',
    },
    {
      patientId: pat3._id,
      doctorId: drSharma._id,
      medicalRecordId: rec5._id,
      labType: 'serology',
      testDate: pastDate(4),
      status: 'reviewed',
      results: [
        { parameter: 'IgE Total', value: 480, unit: 'IU/mL', normalRange: '<100', flag: 'critical' },
        { parameter: 'Eosinophil Count', value: 8.2, unit: '%', normalRange: '1-4', flag: 'high' },
      ],
      interpretation: 'Markedly elevated IgE and eosinophils consistent with atopic asthma exacerbation.',
      notes: 'Trigger avoidance plan discussed. Peak flow monitoring initiated.',
    },
    {
      patientId: pat1._id,
      doctorId: drPetrov._id,
      medicalRecordId: rec6._id,
      labType: 'biochemistry',
      testDate: pastDate(2),
      status: 'completed',
      results: [
        { parameter: 'Troponin I', value: 0.15, unit: 'ng/mL', normalRange: '<0.04', flag: 'critical' },
        { parameter: 'CK-MB', value: 12.5, unit: 'ng/mL', normalRange: '<5.0', flag: 'high' },
        { parameter: 'BNP', value: 450, unit: 'pg/mL', normalRange: '<100', flag: 'critical' },
        { parameter: 'Sodium', value: 138, unit: 'mmol/L', normalRange: '135-145', flag: 'normal' },
        { parameter: 'Potassium', value: 3.9, unit: 'mmol/L', normalRange: '3.5-5.0', flag: 'normal' },
      ],
      interpretation: 'Elevated cardiac biomarkers with BNP consistent with hypertensive emergency and possible demand ischemia. No STEMI pattern.',
      notes: 'Cardiac monitoring continuing. Repeat troponin in 6 hours.',
    },
    {
      patientId: pat5._id,
      doctorId: drPetrov._id,
      labType: 'biochemistry',
      testDate: pastDate(15),
      status: 'completed',
      results: [
        { parameter: 'Fasting Glucose', value: 98, unit: 'mg/dL', normalRange: '70-100', flag: 'normal' },
        { parameter: 'HbA1c', value: 5.4, unit: '%', normalRange: '<5.7', flag: 'normal' },
        { parameter: 'Creatinine', value: 1.1, unit: 'mg/dL', normalRange: '0.6-1.2', flag: 'normal' },
        { parameter: 'ALT', value: 32, unit: 'U/L', normalRange: '7-56', flag: 'normal' },
      ],
      interpretation: 'All baseline labs within normal limits. No metabolic abnormalities detected.',
      notes: 'Routine follow-up labs as part of hypertension management.',
    },
    {
      patientId: pat1._id,
      doctorId: drOkafor._id,
      medicalRecordId: rec2._id,
      labType: 'radiology',
      testDate: pastDate(18),
      status: 'reviewed',
      results: [
        { parameter: 'Lumbar Spine X-Ray', value: 2, unit: 'grade', normalRange: '0-1', flag: 'high' },
        { parameter: 'Spondylolisthesis', value: 4.0, unit: 'mm', normalRange: '<3', flag: 'high' },
      ],
      interpretation: 'Grade II spondylolisthesis at L4-L5. Correlates clinically with radiculopathy symptoms.',
    },
  ]);
  console.log(`🔬 Created ${labReports.length} lab reports`);

  // ── 7. PRESCRIPTIONS ───────────────────────────────────────────────────────

  const prescriptions = await Prescription.create([
    {
      patientId: pat6._id,
      doctorId: drMendes._id,
      medicalRecordId: rec1._id,
      items: [
        { medicineId: medicines[0]._id, medicineName: 'Amoxicillin 500mg', dosage: '500mg', quantity: 21, instructions: 'Take one capsule three times daily with food. Complete full course.' },
        { medicineId: medicines[5]._id, medicineName: 'Paracetamol 500mg', dosage: '500mg', quantity: 30, instructions: 'Take one tablet up to 4 times daily as needed for fever/pain.' },
      ],
      notes: 'Rest for 5 days, increase fluid intake, follow up if symptoms persist beyond 7 days.',
      status: 'fulfilled',
    },
    {
      patientId: pat1._id,
      doctorId: drOkafor._id,
      medicalRecordId: rec2._id,
      items: [
        { medicineId: medicines[16]._id, medicineName: 'Gabapentin 300mg', dosage: '300mg', quantity: 90, instructions: 'Take one capsule three times daily. Do not discontinue abruptly.' },
        { medicineId: medicines[18]._id, medicineName: 'Diclofenac 75mg', dosage: '75mg', quantity: 60, instructions: 'Take one tablet twice daily after food.' },
      ],
      notes: 'Refer to physiotherapy. MRI scheduled for next week.',
      status: 'active',
    },
    {
      patientId: pat2._id,
      doctorId: drPetrov._id,
      medicalRecordId: rec3._id,
      items: [
        { medicineId: medicines[7]._id, medicineName: 'Amlodipine 5mg', dosage: '5mg', quantity: 90, instructions: 'Take one tablet daily in the morning.' },
        { medicineId: medicines[9]._id, medicineName: 'Atorvastatin 20mg', dosage: '20mg', quantity: 90, instructions: 'Take one tablet at bedtime.' },
      ],
      notes: 'ECG monitor, blood pressure log twice daily. Next cardiology review in 3 months.',
      status: 'active',
    },
    {
      patientId: pat7._id,
      doctorId: drThompson._id,
      medicalRecordId: rec4._id,
      items: [
        { medicineId: medicines[6]._id, medicineName: 'Tramadol 50mg', dosage: '50mg', quantity: 20, instructions: 'Take one tablet every 6 hours as needed for pain. Max 4 per day.' },
      ],
      notes: 'Continue physiotherapy 3x/week. Expected full recovery in 6-8 weeks.',
      status: 'fulfilled',
    },
    {
      patientId: pat3._id,
      doctorId: drSharma._id,
      medicalRecordId: rec5._id,
      items: [
        { medicineId: medicines[14]._id, medicineName: 'Salbutamol 100mcg', dosage: '100mcg', quantity: 1, instructions: 'Two puffs every 4-6 hours as needed for wheezing.' },
        { medicineId: medicines[15]._id, medicineName: 'Fluticasone 250mcg', dosage: '250mcg', quantity: 1, instructions: 'Two puffs twice daily as maintenance.' },
      ],
      notes: 'Avoid known triggers. Follow up in 2 weeks.',
      status: 'fulfilled',
    },
    {
      patientId: pat1._id,
      doctorId: drPetrov._id,
      medicalRecordId: rec6._id,
      items: [
        { medicineId: medicines[7]._id, medicineName: 'Amlodipine 5mg', dosage: '5mg', quantity: 30, instructions: 'Daily morning dose.' },
        { medicineId: medicines[23]._id, medicineName: 'Morphine Sulfate 10mg', dosage: '10mg', quantity: 10, instructions: 'For severe pain, every 4 hours as needed.' },
      ],
      notes: 'Strict bed rest. Cardiac monitoring for 48 hours. Family notified.',
      status: 'active',
    },
  ]);
  console.log(`📝 Created ${prescriptions.length} prescriptions`);

  // ── 8. INVOICES ───────────────────────────────────────────────────────────
  const invoices = await Invoice.create([
    // Paid — Cardiology (pat2, irregular heartbeat follow-up)
    {
      patientId: pat2._id,
      appointmentId: completedAppts[2]._id,
      invoiceNumber: 'INV-2026-0001',
      items: [
        { description: 'Consultation Fee - Cardiology', category: 'consultation', quantity: 1, unitPrice: 200 },
        { description: 'ECG Test', category: 'lab_test', quantity: 1, unitPrice: 100 },
        { description: 'Blood Test - Cardiac Panel', category: 'lab_test', quantity: 1, unitPrice: 50 },
      ],
      discount: 0,
      paymentStatus: 'Paid',
      issuedDate: pastDate(14),
      dueDate: futureDate(16),
    },
    // Paid — Orthopedic (pat7, knee surgery follow-up)
    {
      patientId: pat7._id,
      appointmentId: completedAppts[3]._id,
      invoiceNumber: 'INV-2026-0002',
      items: [
        { description: 'Consultation Fee - Orthopedic Surgery', category: 'consultation', quantity: 1, unitPrice: 300 },
        { description: 'X-Ray - Knee (Both Views)', category: 'lab_test', quantity: 1, unitPrice: 100 },
      ],
      discount: 0,
      paymentStatus: 'Paid',
      issuedDate: pastDate(7),
      dueDate: futureDate(23),
    },
    // Pending Verification — General Medicine (pat6, viral pharyngitis)
    {
      patientId: pat6._id,
      invoiceNumber: 'INV-2026-0003',
      items: [
        { description: 'Consultation Fee - General Medicine', category: 'consultation', quantity: 1, unitPrice: 150 },
        { description: 'CBC Blood Test', category: 'lab_test', quantity: 1, unitPrice: 100 },
      ],
      discount: 0,
      paymentStatus: 'Pending Verification',
      issuedDate: pastDate(5),
      dueDate: futureDate(25),
      paymentReceiptUrl: '/uploads/receipt_pat6_inv3.pdf',
    },
    // Overdue — Neurology (pat3, childhood asthma)
    {
      patientId: pat3._id,
      invoiceNumber: 'INV-2026-0004',
      items: [
        { description: 'Consultation Fee - Neurology', category: 'consultation', quantity: 1, unitPrice: 250 },
        { description: 'CT Scan - Brain', category: 'lab_test', quantity: 1, unitPrice: 70 },
      ],
      discount: 0,
      paymentStatus: 'Overdue',
      issuedDate: pastDate(45),
      dueDate: pastDate(15),
    },
    // Unpaid — Internal Medicine (pat4, annual physical)
    {
      patientId: pat4._id,
      invoiceNumber: 'INV-2026-0005',
      items: [
        { description: 'Annual Physical Examination', category: 'consultation', quantity: 1, unitPrice: 200 },
        { description: 'Blood Pressure Monitoring', category: 'procedure', quantity: 1, unitPrice: 20 },
      ],
      discount: 0,
      paymentStatus: 'Unpaid',
      issuedDate: pastDate(2),
      dueDate: futureDate(28),
    },
    // Paid — Ward stay (pat1, cardiac ICU 3 days)
    {
      patientId: pat1._id,
      appointmentId: completedAppts[5]._id,
      invoiceNumber: 'INV-2026-0006',
      items: [
        { description: 'Cardiac ICU - Bed Charge (3 days)', category: 'ward', quantity: 3, unitPrice: 500 },
        { description: 'IV Amlodipine Administration', category: 'medicine', quantity: 3, unitPrice: 50 },
        { description: 'Cardiac Monitoring Fee', category: 'procedure', quantity: 1, unitPrice: 200 },
      ],
      discount: 0,
      paymentStatus: 'Paid',
      issuedDate: pastDate(3),
      dueDate: pastDate(3),
    },
    // Unpaid — Ward stay ongoing (pat1, cardiac ICU extension)
    {
      patientId: pat1._id,
      invoiceNumber: 'INV-2026-0007',
      items: [
        { description: 'Cardiac ICU - Bed Charge (4 days)', category: 'ward', quantity: 4, unitPrice: 500 },
        { description: 'Emergency Consultation Fee', category: 'consultation', quantity: 1, unitPrice: 300 },
        { description: 'Cardiac Lab Panel', category: 'lab_test', quantity: 1, unitPrice: 200 },
        { description: 'Medications - Amlodipine, Atorvastatin', category: 'medicine', quantity: 1, unitPrice: 300 },
      ],
      discount: 0,
      paymentStatus: 'Unpaid',
      issuedDate: pastDate(1),
      dueDate: futureDate(29),
    },
  ]);
  console.log(`💰 Created ${invoices.length} invoices`);

  // ── 9. PAYMENTS ──────────────────────────────────────────────────────────
  const [inv1, inv2, inv3, inv4, inv5, inv6, inv7] = invoices;

  const payments = await Payment.create([
    {
      invoiceId: inv1._id,
      patientId: pat2._id,
      amount: 350,
      currency: 'LKR',
      method: 'bank_transfer',
      status: 'completed',
      completedAt: pastDate(13),
    },
    {
      invoiceId: inv2._id,
      patientId: pat7._id,
      amount: 400,
      currency: 'LKR',
      method: 'mock_card',
      status: 'completed',
      completedAt: pastDate(6),
    },
    {
      invoiceId: inv6._id,
      patientId: pat1._id,
      amount: 1850,
      currency: 'LKR',
      method: 'bank_transfer',
      status: 'completed',
      completedAt: pastDate(3),
    },
    {
      invoiceId: inv3._id,
      patientId: pat6._id,
      amount: 250,
      currency: 'LKR',
      method: 'bank_transfer',
      status: 'processing',
      receiptUrl: '/uploads/receipt_pat6_inv3.pdf',
    },
    {
      invoiceId: inv5._id,
      patientId: pat4._id,
      amount: 220,
      currency: 'LKR',
      method: 'mock_card',
      status: 'pending',
    },
  ]);
  console.log(`💳 Created ${payments.length} payments`);

  // ── 10. WARDS ──────────────────────────────────────────────────────────────

  const wards = await Ward.create([
    // Cardiology wards
    {
      name: 'Cardiac ICU',
      type: 'icu',
      totalBeds: 6,
      currentOccupancy: 2,
      status: 'available',
      location: 'Building A, Floor 2',
      phone: '+1-555-1000',
    },
    {
      name: 'Cardiac Ward A',
      type: 'private',
      totalBeds: 10,
      currentOccupancy: 4,
      status: 'available',
      location: 'Building A, Floor 2',
      phone: '+1-555-1000',
    },
    {
      name: 'Cardiac Ward B',
      type: 'general',
      totalBeds: 20,
      currentOccupancy: 19,
      status: 'full',
      location: 'Building A, Floor 2',
      phone: '+1-555-1000',
    },
    // Orthopedics
    {
      name: 'Ortho Recovery Unit',
      type: 'general',
      totalBeds: 15,
      currentOccupancy: 8,
      status: 'available',
      location: 'Building A, Floor 3',
      phone: '+1-555-1001',
    },
    {
      name: 'Ortho Private Rooms',
      type: 'private',
      totalBeds: 8,
      currentOccupancy: 3,
      status: 'available',
      location: 'Building A, Floor 3',
      phone: '+1-555-1001',
    },
    // Emergency
    {
      name: 'Emergency Observation',
      type: 'emergency',
      totalBeds: 12,
      currentOccupancy: 7,
      status: 'available',
      location: 'Building A, Floor 1',
      phone: '+1-555-1004',
    },
    {
      name: 'Critical Care Bay',
      type: 'icu',
      totalBeds: 4,
      currentOccupancy: 3,
      status: 'available',
      location: 'Building A, Floor 1',
      phone: '+1-555-1004',
    },
    // Internal Medicine
    {
      name: 'General Medicine A',
      type: 'general',
      totalBeds: 25,
      currentOccupancy: 12,
      status: 'available',
      location: 'Building B, Floor 2',
      phone: '+1-555-1005',
    },
    {
      name: 'General Medicine B',
      type: 'general',
      totalBeds: 25,
      currentOccupancy: 25,
      status: 'full',
      location: 'Building B, Floor 2',
      phone: '+1-555-1005',
    },
  ]);
  console.log(`🛏️  Created ${wards.length} wards`);

  // ── 11. WARD ASSIGNMENTS ───────────────────────────────────────────────────
  const cardioICU = wards[0];
  const orthoRecovery = wards[3];
  const emergencyObs = wards[5];
  const genMedA = wards[7];

  const wardAssignments = await WardAssignment.create([
    // Patient 1 — currently admitted in Cardiac ICU (for rec6)
    {
      patientId: pat1._id,
      wardId: cardioICU._id,
      bedNumber: 1,
      admissionDate: pastDate(3),
      expectedDischarge: futureDate(5),
      notes: 'Admitted for cardiac observation. Hypertensive urgency. Monitoring every 4 hours.',
      assignedBy: receptionist._id,
      assignedDate: pastDate(3),
      status: 'active',
    },
    // Patient 7 — in Ortho Recovery after knee surgery
    {
      patientId: pat7._id,
      wardId: orthoRecovery._id,
      bedNumber: 5,
      admissionDate: pastDate(8),
      expectedDischarge: futureDate(3),
      notes: 'Post-TKR day 10. Continuing IV antibiotics. Passive physiotherapy started.',
      assignedBy: receptionist._id,
      assignedDate: pastDate(8),
      status: 'active',
    },
    // Patient 5 — in Emergency Observation
    {
      patientId: pat5._id,
      wardId: emergencyObs._id,
      bedNumber: 3,
      admissionDate: pastDate(1),
      expectedDischarge: futureDate(1),
      notes: 'Severe dehydration and electrolyte imbalance. IV fluids ongoing.',
      assignedBy: receptionist._id,
      assignedDate: pastDate(1),
      status: 'active',
    },
    // Patient 3 — discharged
    {
      patientId: pat3._id,
      wardId: genMedA._id,
      bedNumber: 8,
      admissionDate: pastDate(7),
      actualDischarge: pastDate(4),
      expectedDischarge: pastDate(4),
      notes: 'Asthma exacerbation resolved. Discharged with Salbutamol and Fluticasone.',
      assignedBy: receptionist._id,
      assignedDate: pastDate(7),
      status: 'discharged',
    },
    // Patient 4 — transferred from gen med to private
    {
      patientId: pat4._id,
      wardId: genMedA._id,
      bedNumber: 12,
      admissionDate: pastDate(15),
      actualDischarge: pastDate(10),
      expectedDischarge: pastDate(10),
      notes: 'General weakness and anemia. Blood transfusion administered. Now discharged.',
      assignedBy: receptionist._id,
      assignedDate: pastDate(15),
      status: 'discharged',
    },
  ]);
  console.log(`🏥 Created ${wardAssignments.length} ward assignments`);

  // Update ward occupancies to reflect assignments
  cardioICU.currentOccupancy = 1;
  await cardioICU.save();
  orthoRecovery.currentOccupancy = 8;
  await orthoRecovery.save();
  emergencyObs.currentOccupancy = 7;
  await emergencyObs.save();
  genMedA.currentOccupancy = 12;
  await genMedA.save();

  // ── 12. WARD MEDICATIONS ───────────────────────────────────────────────────
  const [assign1, assign2, assign3] = wardAssignments.filter(a => a.status === 'active');

  const wardMedications = await WardMedication.create([
    // Patient 1's medications (cardiac ICU)
    {
      wardAssignmentId: assign1._id,
      medicationId: medicines[7]._id, // Amlodipine
      dosage: '5mg',
      frequency: 'Once daily',
      route: 'Oral',
      startDate: pastDate(3),
      status: 'active',
      notes: 'Morning dose. BP check 30 min post-dose.',
    },
    {
      wardAssignmentId: assign1._id,
      medicationId: medicines[23]._id, // Morphine Sulfate
      dosage: '10mg',
      frequency: 'Every 4 hours as needed',
      route: 'IV',
      startDate: pastDate(3),
      endDate: futureDate(2),
      status: 'active',
      notes: 'For severe chest pain only. Monitor respiratory rate.',
    },
    {
      wardAssignmentId: assign1._id,
      medicationId: medicines[10]._id, // Atorvastatin
      dosage: '20mg',
      frequency: 'At bedtime',
      route: 'Oral',
      startDate: pastDate(3),
      status: 'active',
    },
    // Patient 7's medications (ortho recovery)
    {
      wardAssignmentId: assign2._id,
      medicationId: medicines[6]._id, // Tramadol
      dosage: '50mg',
      frequency: 'Every 6 hours',
      route: 'IV',
      startDate: pastDate(8),
      status: 'active',
      notes: 'Pain management post-TKR. Tapering schedule.',
    },
    {
      wardAssignmentId: assign2._id,
      medicationId: medicines[0]._id, // Amoxicillin
      dosage: '500mg',
      frequency: '3x daily',
      route: 'IV',
      startDate: pastDate(6),
      endDate: futureDate(1),
      status: 'active',
      notes: 'Surgical site infection prophylaxis.',
    },
    {
      wardAssignmentId: assign2._id,
      medicationId: medicines[18]._id, // Diclofenac
      dosage: '75mg',
      frequency: 'Twice daily',
      route: 'IM',
      startDate: pastDate(8),
      status: 'discontinued',
      notes: 'Discontinued per ortho team - switched to Tramadol only.',
    },
    // Patient 5's medications (emergency)
    {
      wardAssignmentId: assign3._id,
      medicationId: medicines[5]._id, // Paracetamol
      dosage: '1g',
      frequency: 'Every 6 hours',
      route: 'IV',
      startDate: pastDate(1),
      status: 'active',
      notes: 'Fever management.',
    },
    {
      wardAssignmentId: assign3._id,
      medicationId: medicines[5]._id, // Paracetamol — placeholder for IV fluids
      dosage: '1L',
      frequency: 'Continuous',
      route: 'IV',
      startDate: pastDate(1),
      status: 'completed',
      notes: 'IV fluids for rehydration.',
    },
  ]);
  console.log(`💉 Created ${wardMedications.length} ward medications`);

  // ── 13. DISPENSING ─────────────────────────────────────────────────────────
  const fulfilledPrescs = prescriptions.filter(p => p.status === 'fulfilled');

  const dispenses = await Dispense.create([
    {
      prescriptionId: fulfilledPrescs[0]._id,
      patientId: pat6._id,
      pharmacistId: pharmacist._id,
      dispensedItems: [
        {
          medicineId: medicines[0]._id,
          medicineName: 'Amoxicillin 500mg',
          dosage: '500mg',
          quantityPrescribed: 21,
          quantityDispensed: 21,
          instructions: 'Take one capsule three times daily with food.',
        },
        {
          medicineId: medicines[5]._id,
          medicineName: 'Paracetamol 500mg',
          dosage: '500mg',
          quantityPrescribed: 30,
          quantityDispensed: 30,
          instructions: 'Take one tablet up to 4 times daily as needed.',
        },
      ],
      status: 'fulfilled',
      fulfilledAt: pastDate(9),
    },
    {
      prescriptionId: fulfilledPrescs[1]._id,
      patientId: pat7._id,
      pharmacistId: pharmacist._id,
      dispensedItems: [
        {
          medicineId: medicines[6]._id,
          medicineName: 'Tramadol 50mg',
          dosage: '50mg',
          quantityPrescribed: 20,
          quantityDispensed: 20,
          instructions: 'Take one tablet every 6 hours as needed for pain.',
        },
      ],
      status: 'fulfilled',
      fulfilledAt: pastDate(7),
    },
    {
      prescriptionId: fulfilledPrescs[2]._id,
      patientId: pat3._id,
      pharmacistId: pharmacist._id,
      dispensedItems: [
        {
          medicineId: medicines[14]._id,
          medicineName: 'Salbutamol 100mcg',
          dosage: '100mcg',
          quantityPrescribed: 1,
          quantityDispensed: 1,
          instructions: 'Two puffs every 4-6 hours as needed.',
        },
        {
          medicineId: medicines[15]._id,
          medicineName: 'Fluticasone 250mcg',
          dosage: '250mcg',
          quantityPrescribed: 1,
          quantityDispensed: 1,
          instructions: 'Two puffs twice daily.',
        },
      ],
      status: 'fulfilled',
      fulfilledAt: pastDate(4),
    },
  ]);
  console.log(`💊 Created ${dispenses.length} dispense records`);

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('✅ SEEDING COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log('Collections populated:');
  console.log(`  • Users:           ${1 + 1 + 1 + doctorUsers.length + patientUsers.length}`);
  console.log(`  • Doctors:         ${doctors.length}`);
  console.log(`  • Wards:           ${wards.length}`);
  console.log(`  • Medicines:       ${medicines.length}`);
  console.log(`  • Appointments:   ${appointments.length}`);
  console.log(`  • Medical Records: ${records.length}`);
  console.log(`  • Lab Reports:     ${labReports.length}`);
  console.log(`  • Prescriptions:   ${prescriptions.length}`);
  console.log(`  • Invoices:        ${invoices.length}`);
  console.log(`  • Payments:        ${payments.length}`);
  console.log(`  • Ward Assignments:${wardAssignments.length}`);
  console.log(`  • Ward Medications:${wardMedications.length}`);
  console.log(`  • Dispense Records:${dispenses.length}`);
  console.log('\n📌 Login credentials (password = "Password123"):');
  console.log('   Admin:        admin@hospital.com');
  console.log('   Pharmacist:   pharmacist@hospital.com');
  console.log('   Receptionist: receptionist@hospital.com');
  console.log('   Dr. Petrov:   dr.petrov@hospital.com');
  console.log('   Dr. Sharma:   dr.sharma@hospital.com');
  console.log('   Dr. Thompson: dr.thompson@hospital.com');
  console.log('   Dr. Okafor:   dr.okafor@hospital.com');
  console.log('   Dr. Mendes:   dr.mendes@hospital.com');
  console.log('   Patient:      robert.w@example.com');
  console.log('   Patient:      jennifer.m@example.com');
  console.log('\n⚠️  Notes on limitations:');
  console.log('   - File upload fields (licenseDocumentUrl, packagingImageUrl, etc.)');
  console.log('     use placeholder paths. Real files would need actual uploads.');
  console.log('   - Prescription fulfillment link to Dispense records is seeded.');
  console.log('   - Ward occupancy is manually synced (not auto-triggered via API).');

  await mongoClient.close();
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected');
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('❌ Seeding failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
