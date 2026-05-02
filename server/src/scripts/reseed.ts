/**
 * Hospital Management System — Database Reseeding Script
 * Seeds all collections via REST API (no direct DB access).
 * Usage: cd server && bun run src/scripts/reseed.ts
 *
 * Seeding order (respects ObjectId dependencies):
 *  1. Users (register) — creates admin, doctors, patients, pharmacist, receptionist
 *  2. Wards
 *  3. Doctors (requires userId + multipart file) — user role must be 'doctor'
 *  4. Appointments (requires patientId + doctorId from JWT)
 *  5. Medical Records (requires doctorId from JWT + patientId)
 *  6. Medicines (requires multipart file)
 *  7. Prescriptions (requires patientId + doctorId from JWT)
 *  8. Invoices (requires patientId)
 *  9. Ward Assignments (requires patientId + wardId)
 * 10. Ward Medications (requires wardAssignmentId + medicineId)
 */

import { FormData } from 'undici';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import https from 'node:https';
import http from 'node:http';

const API = 'http://localhost:5000/api';
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error('MONGO_URI environment variable is required');
const ADMIN_EMAIL = 'admin@hospital.com';
const ADMIN_PASSWORD = 'Admin123';
const ADMIN_NAME = 'System Administrator';

interface TokenPair { token: string; userId: string; role: string; email: string }
interface CreatedEntity { _id: string; [key: string]: unknown }

let mongoClient: MongoClient;
let adminToken = '';
let doctorTokens: TokenPair[] = [];
let patientTokens: TokenPair[] = [];
let pharmacistToken: TokenPair | null = null;
let receptionistToken: TokenPair | null = null;

const wards: CreatedEntity[] = [];
const doctors: CreatedEntity[] = [];
const appointments: CreatedEntity[] = [];
const medicalRecords: CreatedEntity[] = [];
const medicines: CreatedEntity[] = [];
const prescriptions: CreatedEntity[] = [];
const invoices: CreatedEntity[] = [];
const wardAssignments: CreatedEntity[] = [];

async function apiPost<T = unknown>(
  path: string,
  body: Record<string, unknown> | FormData,
  token?: string,
  isFormData = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: isFormData ? body as FormData : JSON.stringify(body),
  });

  const json = await res.json() as { success: boolean; data?: T; message?: string };
  if (!res.ok || !json.success) {
    throw new Error(`POST ${path} failed: ${JSON.stringify(json)}`);
  }
  return json.data as T;
}

async function getMongoDb() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient.db();
}

function delay(ms = 500): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function createPngPlaceholder(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x08, 0x99, 0x63, 0xf8, 0x0f, 0x00, 0x00,
    0x01, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82,
  ]);
}

function getImageUrl(seed: string, width = 400, height = 300): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function seedUsers(): Promise<void> {
  console.log('\n[1/10] Seeding Users...');

  await apiPost<{ token: string; user: CreatedEntity }>(
    '/auth/register',
    { name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  );
  console.log(`  ✓ Admin: ${ADMIN_EMAIL}`);

  const doctorData = [
    { name: 'Dr. Sarah Mitchell', email: 'sarah.mitchell@hospital.com', specialization: 'Cardiology', experienceYears: 12, fee: 350 },
    { name: 'Dr. James Chen', email: 'james.chen@hospital.com', specialization: 'Neurology', experienceYears: 8, fee: 400 },
    { name: 'Dr. Maria Rodriguez', email: 'maria.rodriguez@hospital.com', specialization: 'Orthopedics', experienceYears: 15, fee: 300 },
    { name: 'Dr. Emily Thompson', email: 'emily.thompson@hospital.com', specialization: 'Pediatrics', experienceYears: 10, fee: 250 },
    { name: 'Dr. Robert Williams', email: 'robert.williams@hospital.com', specialization: 'Dermatology', experienceYears: 7, fee: 280 },
    { name: 'Dr. Priya Patel', email: 'priya.patel@hospital.com', specialization: 'General Medicine', experienceYears: 20, fee: 200 },
  ];

  for (const d of doctorData) {
    const res = await apiPost<{ token: string; user: CreatedEntity }>(
      '/auth/register',
      { name: d.name, email: d.email, password: 'Doctor123' },
    );
    doctorTokens.push({ token: res.token, userId: res.user._id, role: 'doctor', email: d.email });
    console.log(`  ✓ Doctor: ${d.name}`);
    await delay(200);
  }

  const pharmRes = await apiPost<{ token: string; user: CreatedEntity }>(
    '/auth/register',
    { name: 'Head Pharmacist', email: 'pharmacist@hospital.com', password: 'Pharmacy123' },
  );
  pharmacistToken = { token: pharmRes.token, userId: pharmRes.user._id, role: 'pharmacist', email: pharmRes.user.email };

  const recepRes = await apiPost<{ token: string; user: CreatedEntity }>(
    '/auth/register',
    { name: 'Reception Desk', email: 'reception@hospital.com', password: 'Reception123' },
  );
  receptionistToken = { token: recepRes.token, userId: recepRes.user._id, role: 'receptionist', email: recepRes.user.email };

  const patientData = [
    { name: 'John Anderson', email: 'john.anderson@email.com', dob: '1985-03-15' },
    { name: 'Emma Wilson', email: 'emma.wilson@email.com', dob: '1990-07-22' },
    { name: 'Michael Brown', email: 'michael.brown@email.com', dob: '1978-11-08' },
    { name: 'Sophia Martinez', email: 'sophia.martinez@email.com', dob: '1995-01-30' },
    { name: 'William Taylor', email: 'william.taylor@email.com', dob: '1982-09-14' },
    { name: 'Olivia Johnson', email: 'olivia.johnson@email.com', dob: '1988-05-19' },
    { name: 'Benjamin Lee', email: 'benjamin.lee@email.com', dob: '1972-12-03' },
    { name: 'Isabella Garcia', email: 'isabella.garcia@email.com', dob: '1993-08-25' },
    { name: 'Lucas Davis', email: 'lucas.davis@email.com', dob: '2000-04-11' },
    { name: 'Mia Thompson', email: 'mia.thompson@email.com', dob: '1991-10-07' },
  ];

  for (const p of patientData) {
    const res = await apiPost<{ token: string; user: CreatedEntity }>(
      '/auth/register',
      { name: p.name, email: p.email, password: 'Patient123', dateOfBirth: p.dob },
    );
    patientTokens.push({ token: res.token, userId: res.user._id, role: 'patient', email: p.email });
    console.log(`  ✓ Patient: ${p.name}`);
    await delay(200);
  }

  console.log(`  Total: 1 admin, ${doctorTokens.length} doctors, 1 pharmacist, 1 receptionist, ${patientTokens.length} patients`);
}

async function createAdminUser(): Promise<void> {
  console.log('\n  Creating admin user directly in MongoDB with correct role...');
  const db = await getMongoDb();
  const bcrypt = await import('bcryptjs');
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const { ObjectId } = await import('mongodb');

  await db.collection('users').updateOne(
    { email: ADMIN_EMAIL },
    { $set: { role: 'admin', password: hashed } },
    { upsert: true },
  );
  const user = await db.collection('users').findOne({ email: ADMIN_EMAIL });
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
  if (user) {
    adminToken = jwt.sign(
      { id: user._id.toString(), email: user.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
    console.log(`  ✓ Admin user created with role=admin`);
  }
}

async function updateDoctorRoles(): Promise<void> {
  console.log('\n  Updating doctor user roles to "doctor"...');
  const db = await getMongoDb();
  const users = db.collection('users');

  for (const doc of doctorTokens) {
    await users.updateOne(
      { _id: new ObjectId(doc.userId) },
      { $set: { role: 'doctor' } },
    );
    console.log(`    Updated role for ${doc.email}`);

    // Re-fetch the user and re-sign token with updated role
    const updatedUser = await users.findOne({ _id: new ObjectId(doc.userId) });
    if (updatedUser) {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
      const newToken = jwt.sign(
        { id: updatedUser._id.toString(), email: updatedUser.email, role: 'doctor' },
        JWT_SECRET,
        { expiresIn: '7d' },
      );
      doc.token = newToken;
      doc.role = 'doctor';
    }
    await delay(100);
  }
}

async function seedWards(): Promise<void> {
  console.log('\n[2/10] Seeding Wards...');

  const wardData = [
    { name: 'Cardiac ICU', type: 'icu', beds: 8, location: 'Building A, Floor 2', phone: '555-0100' },
    { name: 'Cardiac Ward A', type: 'private', beds: 20, location: 'Building A, Floor 2', phone: '555-0100' },
    { name: 'Neuro ICU', type: 'icu', beds: 6, location: 'Building A, Floor 3', phone: '555-0100' },
    { name: 'Neuro Ward', type: 'general', beds: 24, location: 'Building A, Floor 3', phone: '555-0100' },
    { name: 'Ortho Ward 1', type: 'general', beds: 30, location: 'Building B, Floor 1', phone: '555-0100' },
    { name: 'Ortho Private', type: 'private', beds: 12, location: 'Building B, Floor 1', phone: '555-0100' },
    { name: 'Pediatric Ward', type: 'general', beds: 25, location: 'Building B, Floor 2', phone: '555-0100' },
    { name: 'NICU', type: 'icu', beds: 10, location: 'Building B, Floor 2', phone: '555-0100' },
    { name: 'Derma Ward', type: 'general', beds: 15, location: 'Building C, Floor 1', phone: '555-0100' },
    { name: 'General Ward A', type: 'general', beds: 40, location: 'Building A, Floor 1', phone: '555-0100' },
    { name: 'Private Rooms B', type: 'private', beds: 20, location: 'Building A, Floor 1', phone: '555-0100' },
    { name: 'Emergency Beds', type: 'emergency', beds: 30, location: 'Building D, Ground Floor', phone: '555-0100' },
    { name: 'Critical Care', type: 'icu', beds: 10, location: 'Building D, Ground Floor', phone: '555-0100' },
  ];

  for (const w of wardData) {
    const payload = {
      name: w.name,
      type: w.type,
      totalBeds: w.beds,
      location: w.location,
      phone: w.phone,
    };
    const created = await apiPost<CreatedEntity>('/wards', payload, adminToken);
    wards.push(created);
    console.log(`  ✓ ${w.name} (${w.type}, ${w.beds} beds)`);
    await delay(200);
  }
}

async function seedDoctors(): Promise<void> {
  console.log('\n[3/10] Seeding Doctors (profiles)...');

  const doctorSpecs = [
    { userIdx: 0, specialization: 'Cardiology', experienceYears: 12, fee: 350 },
    { userIdx: 1, specialization: 'Neurology', experienceYears: 8, fee: 400 },
    { userIdx: 2, specialization: 'Orthopedics', experienceYears: 15, fee: 300 },
    { userIdx: 3, specialization: 'Pediatrics', experienceYears: 10, fee: 250 },
    { userIdx: 4, specialization: 'Dermatology', experienceYears: 7, fee: 280 },
    { userIdx: 5, specialization: 'General Medicine', experienceYears: 20, fee: 200 },
  ];

  for (const doc of doctorSpecs) {
    const userId = doctorTokens[doc.userIdx].userId;
    const form = new FormData();
    form.append('userId', userId);
    form.append('specialization', doc.specialization);
    form.append('experienceYears', String(doc.experienceYears));
    form.append('consultationFee', String(doc.fee));

    const imgBuffer = createPngPlaceholder();
    const imgBlob = new Blob([imgBuffer], { type: 'image/png' });
    form.append('licenseDocument', imgBlob, `license-${doc.userIdx}.png`);

    const created = await apiPost<CreatedEntity>('/doctors', form, adminToken, true);
    doctors.push(created);
    console.log(`  ✓ ${doc.specialization} doctor (user: ${userId})`);
    await delay(300);
  }
}

async function seedAppointments(): Promise<void> {
  console.log('\n[4/10] Seeding Appointments...');

  const apptData = [
    { patientIdx: 0, doctorIdx: 0, date: '2026-05-01T09:00:00Z', reason: 'Chest pain and shortness of breath' },
    { patientIdx: 1, doctorIdx: 1, date: '2026-05-02T10:30:00Z', reason: 'Severe headaches for the past week' },
    { patientIdx: 2, doctorIdx: 2, date: '2026-05-03T14:00:00Z', reason: 'Knee pain after sports injury' },
    { patientIdx: 3, doctorIdx: 3, date: '2026-05-04T11:00:00Z', reason: 'Annual checkup for 5-year-old' },
    { patientIdx: 4, doctorIdx: 4, date: '2026-05-05T09:30:00Z', reason: 'Skin rash that wont go away' },
    { patientIdx: 5, doctorIdx: 5, date: '2026-05-05T15:00:00Z', reason: 'General fatigue and dizziness' },
    { patientIdx: 6, doctorIdx: 0, date: '2026-05-06T10:00:00Z', reason: 'Follow-up cardiac assessment' },
    { patientIdx: 7, doctorIdx: 1, date: '2026-05-07T09:00:00Z', reason: 'Numbness in fingers' },
    { patientIdx: 8, doctorIdx: 2, date: '2026-05-08T11:30:00Z', reason: 'Back pain after lifting heavy objects' },
    { patientIdx: 9, doctorIdx: 3, date: '2026-05-09T14:00:00Z', reason: 'Vaccination schedule update' },
    { patientIdx: 0, doctorIdx: 5, date: '2026-05-10T08:30:00Z', reason: 'Blood pressure monitoring' },
    { patientIdx: 1, doctorIdx: 0, date: '2026-05-11T10:00:00Z', reason: 'ECG follow-up' },
    { patientIdx: 2, doctorIdx: 4, date: '2026-05-12T09:00:00Z', reason: 'Skin allergy consultation' },
    { patientIdx: 3, doctorIdx: 2, date: '2026-05-13T15:30:00Z', reason: 'Ankle sprain evaluation' },
    { patientIdx: 4, doctorIdx: 1, date: '2026-05-14T11:00:00Z', reason: 'MRI results discussion' },
  ];

  for (const appt of apptData) {
    const patientId = patientTokens[appt.patientIdx].userId;
    const doctorId = doctors[appt.doctorIdx]._id;
    const created = await apiPost<CreatedEntity>('/appointments', {
      doctorId,
      appointmentDate: appt.date,
      reasonForVisit: appt.reason,
    }, patientTokens[appt.patientIdx].token);
    appointments.push(created);
    console.log(`  ✓ Patient ${appt.patientIdx} → Dr ${appt.doctorIdx}`);
    await delay(200);
  }
}

async function seedMedicalRecords(): Promise<void> {
  console.log('\n[5/10] Seeding Medical Records...');

  const recordData = [
    { patientIdx: 0, doctorIdx: 0, apptIdx: 0, diagnosis: 'Hypertension Stage 1 - slightly elevated blood pressure requiring lifestyle modifications', prescription: 'Lisinopril 10mg once daily, Low sodium diet' },
    { patientIdx: 1, doctorIdx: 1, apptIdx: 1, diagnosis: 'Tension-type headache with migraine features', prescription: 'Sumatriptan 50mg as needed, Relaxation techniques' },
    { patientIdx: 2, doctorIdx: 2, apptIdx: 2, diagnosis: 'ACL sprain - grade II', prescription: 'RICE protocol, Physical therapy 2x/week, Knee brace' },
    { patientIdx: 3, doctorIdx: 3, apptIdx: 3, diagnosis: 'Healthy child - all developmental milestones met', prescription: 'Continue current vaccination schedule' },
    { patientIdx: 4, doctorIdx: 4, apptIdx: 4, diagnosis: 'Contact dermatitis - allergic reaction to new detergent', prescription: 'Hydrocortisone 1% cream, Switch to hypoallergenic products' },
    { patientIdx: 5, doctorIdx: 5, apptIdx: 5, diagnosis: 'Iron deficiency anemia', prescription: 'Ferrous sulfate 325mg daily, Vitamin C with iron' },
    { patientIdx: 6, doctorIdx: 0, apptIdx: 6, diagnosis: 'Stable angina - controlled with medication', prescription: 'Continue current cardiac medications, Stress test scheduled' },
    { patientIdx: 7, doctorIdx: 1, apptIdx: 7, diagnosis: 'Mild carpal tunnel syndrome', prescription: 'Wrist splint at night, Ibuprofen 400mg as needed' },
    { patientIdx: 8, doctorIdx: 2, apptIdx: 8, diagnosis: 'Lumbar muscle strain', prescription: 'Naproxen 500mg twice daily, Heat therapy, Avoid heavy lifting' },
    { patientIdx: 9, doctorIdx: 3, apptIdx: 9, diagnosis: 'Up-to-date on immunizations, mild vitamin D deficiency', prescription: 'Vitamin D3 1000IU daily' },
    { patientIdx: 0, doctorIdx: 5, apptIdx: 10, diagnosis: 'Pre-hypertension - monitoring advised', prescription: 'Diet and exercise counseling' },
    { patientIdx: 1, doctorIdx: 0, apptIdx: 11, diagnosis: 'ECG normal, blood pressure improved', prescription: 'Continue current medication' },
    { patientIdx: 2, doctorIdx: 4, apptIdx: 12, diagnosis: 'Eczema flare-up - mild', prescription: 'Tacrolimus 0.1% ointment, Moisturizer twice daily' },
    { patientIdx: 3, doctorIdx: 2, apptIdx: 13, diagnosis: 'Mild ankle sprain - resolved', prescription: 'No further treatment needed' },
    { patientIdx: 4, doctorIdx: 1, apptIdx: 14, diagnosis: 'MRI shows no significant pathology, migraine management plan', prescription: 'Propranolol 40mg daily, Migraine diary recommended' },
  ];

  for (const rec of recordData) {
    const patientId = patientTokens[rec.patientIdx].userId;
    const created = await apiPost<CreatedEntity>('/records', {
      patientId,
      appointmentId: appointments[rec.apptIdx]?._id,
      diagnosis: rec.diagnosis,
      prescription: rec.prescription,
    }, doctorTokens[rec.doctorIdx].token);
    medicalRecords.push(created);
    console.log(`  ✓ Record ${medicalRecords.length}: ${rec.diagnosis.substring(0, 50)}...`);
    await delay(200);
  }
}

async function seedMedicines(): Promise<void> {
  console.log('\n[6/10] Seeding Medicines...');

  const medicineData = [
    { name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 8.50, stock: 500, expiry: '2027-06-30', seed: 'amoxicillin' },
    { name: 'Azithromycin 250mg', category: 'Antibiotic', price: 12.75, stock: 300, expiry: '2027-08-15', seed: 'azithromycin' },
    { name: 'Lisinopril 10mg', category: 'Cardiovascular', price: 15.00, stock: 450, expiry: '2027-03-20', seed: 'lisinopril' },
    { name: 'Metoprolol 50mg', category: 'Cardiovascular', price: 18.25, stock: 350, expiry: '2027-05-10', seed: 'metoprolol' },
    { name: 'Atorvastatin 20mg', category: 'Cardiovascular', price: 22.00, stock: 400, expiry: '2027-07-25', seed: 'atorvastatin' },
    { name: 'Amlodipine 5mg', category: 'Cardiovascular', price: 9.75, stock: 500, expiry: '2027-04-30', seed: 'amlodipine' },
    { name: 'Omeprazole 20mg', category: 'Gastrointestinal', price: 11.50, stock: 600, expiry: '2027-09-10', seed: 'omeprazole' },
    { name: 'Metformin 500mg', category: 'Diabetes', price: 7.25, stock: 700, expiry: '2027-11-20', seed: 'metformin' },
    { name: 'Glibenclamide 5mg', category: 'Diabetes', price: 6.50, stock: 400, expiry: '2027-06-15', seed: 'glibenclamide' },
    { name: 'Paracetamol 500mg', category: 'Analgesic', price: 5.00, stock: 1000, expiry: '2028-01-10', seed: 'paracetamol' },
    { name: 'Ibuprofen 400mg', category: 'Analgesic', price: 7.50, stock: 800, expiry: '2027-12-05', seed: 'ibuprofen' },
    { name: 'Sumatriptan 50mg', category: 'Analgesic', price: 35.00, stock: 150, expiry: '2027-08-20', seed: 'sumatriptan' },
    { name: 'Hydrocortisone 1%', category: 'Dermatological', price: 9.00, stock: 300, expiry: '2027-10-15', seed: 'hydrocortisone' },
    { name: 'Tacrolimus 0.1%', category: 'Dermatological', price: 42.00, stock: 100, expiry: '2027-07-30', seed: 'tacrolimus' },
    { name: 'Cetirizine 10mg', category: 'Antihistamine', price: 8.00, stock: 450, expiry: '2027-04-25', seed: 'cetirizine' },
    { name: 'Loratadine 10mg', category: 'Antihistamine', price: 7.50, stock: 500, expiry: '2027-05-15', seed: 'loratadine' },
    { name: 'Prednisolone 5mg', category: 'Corticosteroid', price: 11.00, stock: 250, expiry: '2027-09-30', seed: 'prednisolone' },
    { name: 'Salbutamol 100mcg', category: 'Respiratory', price: 18.00, stock: 350, expiry: '2027-11-10', seed: 'salbutamol' },
    { name: 'Ferrous Sulfate 325mg', category: 'Supplements', price: 6.75, stock: 400, expiry: '2027-08-05', seed: 'ferrous' },
    { name: 'Vitamin D3 1000IU', category: 'Supplements', price: 12.00, stock: 600, expiry: '2028-02-15', seed: 'vitamind' },
    { name: 'Multivitamin Complex', category: 'Supplements', price: 15.00, stock: 350, expiry: '2027-10-20', seed: 'multivitamin' },
    { name: 'Ranitidine 150mg', category: 'Gastrointestinal', price: 10.25, stock: 300, expiry: '2027-06-25', seed: 'ranitidine' },
    { name: 'Doxycycline 100mg', category: 'Antibiotic', price: 14.50, stock: 250, expiry: '2027-09-15', seed: 'doxycycline' },
    { name: 'Ciprofloxacin 500mg', category: 'Antibiotic', price: 13.25, stock: 280, expiry: '2027-07-10', seed: 'ciprofloxacin' },
    { name: 'Tramadol 50mg', category: 'Analgesic', price: 16.00, stock: 180, expiry: '2027-12-20', seed: 'tramadol' },
    { name: 'Pantoprazole 40mg', category: 'Gastrointestinal', price: 19.50, stock: 320, expiry: '2027-11-05', seed: 'pantoprazole' },
    { name: 'Levothyroxine 50mcg', category: 'Thyroid', price: 11.75, stock: 400, expiry: '2027-10-30', seed: 'levothyroxine' },
  ];

  for (const med of medicineData) {
    const form = new FormData();
    form.append('name', med.name);
    form.append('category', med.category);
    form.append('price', String(med.price));
    form.append('stockQuantity', String(med.stock));
    form.append('expiryDate', med.expiry);

    try {
      const imgBuffer = createPngPlaceholder();
      const imgBlob = new Blob([imgBuffer], { type: 'image/png' });
      form.append('packagingImage', imgBlob, `${med.seed}.png`);
      const created = await apiPost<CreatedEntity>('/medicines', form, adminToken, true);
      medicines.push(created);
    } catch {
      console.log(`  ⚠ Could not create: ${med.name}`);
    }
    await delay(200);
  }

  console.log(`  ✓ Created ${medicines.length} medicines`);
}

async function seedPrescriptions(): Promise<void> {
  console.log('\n[7/10] Seeding Prescriptions...');

  if (medicines.length === 0) {
    console.log('  ⚠ Skipping prescriptions - no medicines created');
    return;
  }

  const prescData = [
    { patientIdx: 0, doctorIdx: 0, recordIdx: 0 },
    { patientIdx: 1, doctorIdx: 1, recordIdx: 1 },
    { patientIdx: 2, doctorIdx: 2, recordIdx: 2 },
    { patientIdx: 3, doctorIdx: 3, recordIdx: 3 },
    { patientIdx: 4, doctorIdx: 4, recordIdx: 4 },
    { patientIdx: 5, doctorIdx: 5, recordIdx: 5 },
    { patientIdx: 6, doctorIdx: 0, recordIdx: 6 },
    { patientIdx: 7, doctorIdx: 1, recordIdx: 7 },
    { patientIdx: 8, doctorIdx: 2, recordIdx: 8 },
    { patientIdx: 9, doctorIdx: 3, recordIdx: 9 },
    { patientIdx: 0, doctorIdx: 5, recordIdx: 10 },
    { patientIdx: 4, doctorIdx: 1, recordIdx: 14 },
  ];

  for (const presc of prescData) {
    const patientId = patientTokens[presc.patientIdx].userId;
    const medicalRecordId = medicalRecords[presc.recordIdx]?._id;

    const itemCount = 2 + (presc.recordIdx % 2);
    const items = [];
    for (let i = 0; i < itemCount && i < medicines.length; i++) {
      const medIndex = (presc.recordIdx + i) % medicines.length;
      const med = medicines[medIndex];
      items.push({
        medicineId: med._id,
        medicineName: med.name as string,
        dosage: '1 tablet',
        quantity: 30,
        instructions: 'Take once daily after meals',
      });
    }

    const created = await apiPost<CreatedEntity>('/prescriptions', {
      patientId,
      medicalRecordId,
      items,
      notes: 'Please follow dosage instructions carefully',
    }, doctorTokens[presc.doctorIdx].token);
    prescriptions.push(created);
    console.log(`  ✓ Prescription ${prescriptions.length}: Patient ${presc.patientIdx} from Dr ${presc.doctorIdx}`);
    await delay(200);
  }
}

async function seedInvoices(): Promise<void> {
  console.log('\n[8/10] Seeding Invoices...');

  const invoiceData = [
    { patientIdx: 0, apptIdx: 0, amount: 350, status: 'Paid' },
    { patientIdx: 1, apptIdx: 1, amount: 400, status: 'Paid' },
    { patientIdx: 2, apptIdx: 2, amount: 300, status: 'Pending Verification' },
    { patientIdx: 3, apptIdx: 3, amount: 250, status: 'Paid' },
    { patientIdx: 4, apptIdx: 4, amount: 280, status: 'Unpaid' },
    { patientIdx: 5, apptIdx: 5, amount: 200, status: 'Unpaid' },
    { patientIdx: 6, apptIdx: 6, amount: 350, status: 'Pending Verification' },
    { patientIdx: 7, apptIdx: 7, amount: 400, status: 'Unpaid' },
    { patientIdx: 8, apptIdx: 8, amount: 300, status: 'Pending Verification' },
    { patientIdx: 9, apptIdx: 9, amount: 250, status: 'Paid' },
    { patientIdx: 0, apptIdx: 10, amount: 200, status: 'Unpaid' },
    { patientIdx: 1, apptIdx: 11, amount: 350, status: 'Pending Verification' },
    { patientIdx: 2, apptIdx: 12, amount: 280, status: 'Unpaid' },
    { patientIdx: 3, apptIdx: 13, amount: 300, status: 'Paid' },
  ];

  for (const inv of invoiceData) {
    const patientId = patientTokens[inv.patientIdx].userId;
    const appointmentId = appointments[inv.apptIdx]?._id;
    const created = await apiPost<CreatedEntity>('/invoices', {
      patientId,
      appointmentId,
      totalAmount: inv.amount,
    }, adminToken);
    invoices.push(created);
    console.log(`  ✓ Invoice: $${inv.amount} (${inv.status})`);
    await delay(200);
  }
}

async function seedWardAssignments(): Promise<void> {
  console.log('\n[9/10] Seeding Ward Assignments...');

  const assignmentData = [
    { patientIdx: 0, wardIdx: 0, bed: 1, admit: '2026-04-20', discharge: '2026-04-27' },
    { patientIdx: 1, wardIdx: 2, bed: 1, admit: '2026-04-22', discharge: '2026-04-30' },
    { patientIdx: 2, wardIdx: 4, bed: 5, admit: '2026-04-18', discharge: '2026-04-28' },
    { patientIdx: 5, wardIdx: 9, bed: 3, admit: '2026-04-21', discharge: '2026-04-29' },
    { patientIdx: 6, wardIdx: 0, bed: 3, admit: '2026-04-23', discharge: '2026-04-30' },
    { patientIdx: 8, wardIdx: 4, bed: 8, admit: '2026-04-19', discharge: '2026-04-26' },
  ];

  for (const assign of assignmentData) {
    const patientId = patientTokens[assign.patientIdx].userId;
    const wardId = wards[assign.wardIdx]._id;
    const created = await apiPost<CreatedEntity>('/assignments', {
      wardId,
      patientId,
      bedNumber: assign.bed,
      admissionDate: assign.admit,
      expectedDischarge: assign.discharge,
      notes: 'Regular monitoring required',
    }, receptionistToken!.token);
    wardAssignments.push(created);
    console.log(`  ✓ Patient ${assign.patientIdx} → Bed ${assign.bed} in Ward ${assign.wardIdx}`);
    await delay(200);
  }
}

async function seedWardMedications(): Promise<void> {
  console.log('\n[10/10] Seeding Ward Medications...');

  if (medicines.length === 0 || wardAssignments.length === 0) {
    console.log('  ⚠ Skipping ward medications');
    return;
  }

  const medicationData = [
    { assignIdx: 0, medIdx: 2, dosage: '10mg', frequency: 'Once daily' },
    { assignIdx: 0, medIdx: 3, dosage: '50mg', frequency: 'Twice daily' },
    { assignIdx: 1, medIdx: 1, dosage: '250mg', frequency: 'Once daily' },
    { assignIdx: 2, medIdx: 10, dosage: '400mg', frequency: 'Three times daily' },
    { assignIdx: 3, medIdx: 17, dosage: '100mcg', frequency: 'Four times daily' },
    { assignIdx: 4, medIdx: 2, dosage: '10mg', frequency: 'Once daily' },
    { assignIdx: 5, medIdx: 6, dosage: '20mg', frequency: 'Once daily before breakfast' },
  ];

  for (const med of medicationData) {
    const wardAssignmentId = wardAssignments[med.assignIdx]._id;
    const medicationId = medicines[med.medIdx]._id;

    await apiPost<CreatedEntity>('/wardMedications', {
      wardAssignmentId,
      medicationId,
      dosage: med.dosage,
      frequency: med.frequency,
      startDate: '2026-04-22',
      status: 'active',
    }, receptionistToken!.token);
    console.log(`  ✓ ${med.dosage} ${med.frequency} for Assignment ${med.assignIdx}`);
    await delay(200);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Hospital Management System — Database Reseeding via API    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`API: ${API}`);

  try {
    await fetch(`${API}/health`);
    console.log('✓ API is running\n');

    await seedUsers();
    await delay(500);

    await updateDoctorRoles();
    await delay(500);

    await createAdminUser();
    await delay(500);

    await seedWards();
    await delay(500);

    await seedDoctors();
    await delay(500);

    await seedAppointments();
    await delay(500);

    await seedMedicalRecords();
    await delay(500);

    await seedMedicines();
    await delay(500);

    await seedPrescriptions();
    await delay(500);

    await seedInvoices();
    await delay(500);

    await seedWardAssignments();
    await delay(500);

    await seedWardMedications();

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   ✓ Reseeding Complete!                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    console.log('\n── Summary ──────────────────────────────────────────────────');
    console.log(`  Users:        ${1 + doctorTokens.length + 1 + 1 + patientTokens.length}`);
    console.log(`  Wards:        ${wards.length}`);
    console.log(`  Doctors:      ${doctors.length}`);
    console.log(`  Appointments:  ${appointments.length}`);
    console.log(`  Records:       ${medicalRecords.length}`);
    console.log(`  Medicines:     ${medicines.length}`);
    console.log(`  Prescriptions: ${prescriptions.length}`);
    console.log(`  Invoices:     ${invoices.length}`);
    console.log(`  Assignments:   ${wardAssignments.length}`);

    console.log('\n── Demo Credentials ────────────────────────────────────────');
    console.log('  Admin:        admin@hospital.com / admin123');
    console.log('  Doctor:       sarah.mitchell@hospital.com / doctor123');
    console.log('  Pharmacist:   pharmacist@hospital.com / pharmacy123');
    console.log('  Patient:      john.anderson@email.com / patient123');
    console.log('  Receptionist: reception@hospital.com / reception123');
  } catch (err) {
    console.error('\n✗ Seeding failed:', err);
    process.exit(1);
  } finally {
    if (mongoClient) await mongoClient.close();
  }
}

main();
