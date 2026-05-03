/**
 * Hospital Management System — Database Reseeding Script v2
 *
 * Strategy: Rate-limit-aware hybrid seeding.
 *   - MongoDB: users (bcrypt hashed + correct roles), appointments (bypass API validators)
 *   - API: everything else (under rate limits: auth=10/15min, global=100/15min)
 *
 * Usage: cd server && bun run src/scripts/reseed-v2.ts
 *
 * Credentials: MONGO_URI built-in, API at hospital-management-l5lc.onrender.com
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGO_URI = 'mongodb+srv://it24101774_db_user:hospital123@hospital-management-clu.0v47ubw.mongodb.net/hospital_db';
const API = 'https://hospital-management-l5lc.onrender.com/api';

const SALT = 12;
const PASSWORD_ADMIN = 'Admin123!';
const PASSWORD_STAFF = 'Doctor123!';
const PASSWORD_PHARM = 'Pharmacy123!';
const PASSWORD_RECEP = 'Reception123!';
const PASSWORD_PATIENT = 'Patient123!';

interface TokenPair { token: string; userId: string; role: string; email: string }
interface CreatedEntity { _id: string; [key: string]: unknown }

let mongoClient: MongoClient;
let adminToken = '';
let doctorTokens: TokenPair[] = [];
let patientTokens: TokenPair[] = [];
let receptionistToken: TokenPair | null = null;

const wards: CreatedEntity[] = [];
const doctors: Array<{ _id: string; specialization: string; userId: string; consultationFee: number }> = [];
const appointments: Array<{ _id: string }> = [];
const medicalRecords: CreatedEntity[] = [];
const medicines: Array<{ _id: string; name: string }> = [];
const prescriptions: CreatedEntity[] = [];
const invoices: CreatedEntity[] = [];
const wardAssignments: CreatedEntity[] = [];

// ── Helpers ─────────────────────────────────────────────────────────────────────
function delay(ms = 2000): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function createPngPlaceholder(): Buffer {
  return Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,0x89,0x00,0x00,0x00,0x0a,0x49,0x44,0x41,0x54,0x08,0x99,0x63,0xf8,0x0f,0x00,0x00,0x01,0x01,0x01,0x00,0x18,0xdd,0x8d,0xb4,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82]);
}

function futureDate(daysFromNow: number, utcHour = 9, utcMinute = 0): Date {
  const d = new Date(); d.setDate(d.getDate() + daysFromNow); d.setUTCHours(utcHour, utcMinute, 0, 0); return d;
}
function pastDate(daysAgo: number, utcHour = 9, utcMinute = 0): Date {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setUTCHours(utcHour, utcMinute, 0, 0); return d;
}

async function getMongoDb() {
  if (!mongoClient) { mongoClient = new MongoClient(MONGO_URI); await mongoClient.connect(); }
  return mongoClient.db();
}

// ── API callers ─────────────────────────────────────────────────────────────────
async function apiPost<T = unknown>(path: string, body: Record<string, unknown>, token?: string): Promise<T> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  const j = await res.json() as { success: boolean; data?: T; message?: string };
  if (!res.ok || !j.success) throw new Error(`POST ${path} (${res.status}): ${JSON.stringify(j)}`);
  return j.data as T;
}
async function apiPostForm<T = unknown>(path: string, form: FormData, token?: string): Promise<T> {
  const h: Record<string, string> = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: h, body: form });
  const j = await res.json() as { success: boolean; data?: T; message?: string };
  if (!res.ok || !j.success) throw new Error(`POST ${path} (${res.status}): ${JSON.stringify(j)}`);
  return j.data as T;
}
async function apiLogin(email: string, password: string): Promise<{ token: string; user: CreatedEntity }> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const j = await res.json() as { success: boolean; data?: { token: string; user: CreatedEntity }; message?: string };
  if (!res.ok || !j.success) throw new Error(`Login ${email}: ${JSON.stringify(j)}`);
  return j.data!;
}

// API returns `id` or `_id` depending on entity — normalize
function getEid(e: any): string { return (e._id || e.id) as string; }

// ── Step 0: Drop ────────────────────────────────────────────────────────────────
async function dropAll(): Promise<void> {
  console.log('\n[0] Dropping all collections...');
  const db = await getMongoDb();
  const cols = await db.listCollections().toArray();
  for (const c of cols) { await db.collection(c.name).deleteMany({}); }
  console.log(`  ✓ ${cols.length} collections cleared`);
}

// ── Step 1: MongoDB insert users (bypasses auth rate limit) ─────────────────────
async function seedUsersMongo(): Promise<void> {
  console.log('\n[1] Creating users (MongoDB direct)...');
  const db = await getMongoDb();

  const users = [
    { name: 'System Administrator', email: 'admin@hospital.com', password: await bcrypt.hash(PASSWORD_ADMIN, SALT), role: 'admin', phone: '+1-555-0100', isActive: true },
    { name: 'Dr. Sarah Mitchell', email: 'sarah.mitchell@hospital.com', password: await bcrypt.hash(PASSWORD_STAFF, SALT), role: 'doctor', phone: '+1-555-0201', isActive: true },
    { name: 'Dr. James Chen', email: 'james.chen@hospital.com', password: await bcrypt.hash(PASSWORD_STAFF, SALT), role: 'doctor', phone: '+1-555-0202', isActive: true },
    { name: 'Dr. Maria Rodriguez', email: 'maria.rodriguez@hospital.com', password: await bcrypt.hash(PASSWORD_STAFF, SALT), role: 'doctor', phone: '+1-555-0203', isActive: true },
    { name: 'Dr. Emily Thompson', email: 'emily.thompson@hospital.com', password: await bcrypt.hash(PASSWORD_STAFF, SALT), role: 'doctor', phone: '+1-555-0204', isActive: true },
    { name: 'Dr. Robert Williams', email: 'robert.williams@hospital.com', password: await bcrypt.hash(PASSWORD_STAFF, SALT), role: 'doctor', phone: '+1-555-0205', isActive: true },
    { name: 'Dr. Priya Patel', email: 'priya.patel@hospital.com', password: await bcrypt.hash(PASSWORD_STAFF, SALT), role: 'doctor', phone: '+1-555-0206', isActive: true },
    { name: 'Head Pharmacist', email: 'pharmacist@hospital.com', password: await bcrypt.hash(PASSWORD_PHARM, SALT), role: 'pharmacist', phone: '+1-555-0300', isActive: true },
    { name: 'Reception Desk', email: 'reception@hospital.com', password: await bcrypt.hash(PASSWORD_RECEP, SALT), role: 'receptionist', phone: '+1-555-0400', isActive: true },
    { name: 'John Anderson', email: 'john.anderson@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1000', isActive: true },
    { name: 'Emma Wilson', email: 'emma.wilson@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1001', isActive: true },
    { name: 'Michael Brown', email: 'michael.brown@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1002', isActive: true },
    { name: 'Sophia Martinez', email: 'sophia.martinez@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1003', isActive: true },
    { name: 'William Taylor', email: 'william.taylor@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1004', isActive: true },
    { name: 'Olivia Johnson', email: 'olivia.johnson@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1005', isActive: true },
    { name: 'Benjamin Lee', email: 'benjamin.lee@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1006', isActive: true },
    { name: 'Isabella Garcia', email: 'isabella.garcia@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1007', isActive: true },
    { name: 'Lucas Davis', email: 'lucas.davis@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1008', isActive: true },
    { name: 'Mia Thompson', email: 'mia.thompson@email.com', password: await bcrypt.hash(PASSWORD_PATIENT, SALT), role: 'patient', phone: '+1-555-1009', isActive: true },
  ];

  const result = await db.collection('users').insertMany(users);
  const ids = Object.values(result.insertedIds).map((id) => id.toString());

  // Populate token arrays (no tokens yet, just IDs)
  const adminId = ids[0];
  const docIds = ids.slice(1, 7);
  // pharmacist id = ids[7], receptionist id = ids[8]
  const patIds = ids.slice(9);

  // Store user IDs (tokens filled in step 2)
  adminToken = ''; // will be set after login
  doctorTokens = docIds.map((id, i) => ({
    token: '', userId: id, role: 'doctor',
    email: users[i + 1].email,
  }));
  receptionistToken = { token: '', userId: ids[8], role: 'receptionist', email: 'reception@hospital.com' };
  patientTokens = patIds.map((id, i) => ({
    token: '', userId: id, role: 'patient',
    email: users[i + 9].email,
  }));

  console.log(`  ✓ ${users.length} users (1 admin, 6 doctors, 1 pharmacist, 1 receptionist, 10 patients)`);
}

// ── Step 2: Login essential users (8 total — under auth limit of 10) ────────────
async function loginEssential(): Promise<void> {
  console.log('\n[2] Logging in essential users (8 calls)...');

  await delay(1000);
  const a = await apiLogin('admin@hospital.com', PASSWORD_ADMIN);
  adminToken = a.token;
  console.log('  ✓ Admin');

  const docEmails = [
    'sarah.mitchell@hospital.com', 'james.chen@hospital.com',
    'maria.rodriguez@hospital.com', 'emily.thompson@hospital.com',
    'robert.williams@hospital.com', 'priya.patel@hospital.com',
  ];
  for (let i = 0; i < docEmails.length; i++) {
    await delay(2000);
    doctorTokens[i].token = (await apiLogin(docEmails[i], PASSWORD_STAFF)).token;
    console.log(`  ✓ Doctor: ${docEmails[i]}`);
  }

  await delay(2000);
  receptionistToken!.token = (await apiLogin('reception@hospital.com', PASSWORD_RECEP)).token;
  console.log('  ✓ Receptionist');

  // One patient token for invoice payments
  await delay(2000);
  patientTokens[0].token = (await apiLogin('john.anderson@email.com', PASSWORD_PATIENT)).token;
  console.log('  ✓ Patient: john.anderson@email.com');
}

// ── Step 3: Wards ────────────────────────────────────────────────────────────────
async function seedWards(): Promise<void> {
  console.log('\n[3] Seeding Wards...');
  const data = [
    { name: 'Cardiac ICU', type: 'icu', totalBeds: 8, location: 'Building A, Floor 2', phone: '555-0100' },
    { name: 'Cardiac Ward A', type: 'private', totalBeds: 20, location: 'Building A, Floor 2', phone: '555-0100' },
    { name: 'Neuro ICU', type: 'icu', totalBeds: 6, location: 'Building A, Floor 3', phone: '555-0100' },
    { name: 'Neuro Ward', type: 'general', totalBeds: 24, location: 'Building A, Floor 3', phone: '555-0100' },
    { name: 'Ortho Ward 1', type: 'general', totalBeds: 30, location: 'Building B, Floor 1', phone: '555-0100' },
    { name: 'Ortho Private', type: 'private', totalBeds: 12, location: 'Building B, Floor 1', phone: '555-0100' },
    { name: 'Pediatric Ward', type: 'general', totalBeds: 25, location: 'Building B, Floor 2', phone: '555-0100' },
    { name: 'NICU', type: 'icu', totalBeds: 10, location: 'Building B, Floor 2', phone: '555-0100' },
    { name: 'Derma Ward', type: 'general', totalBeds: 15, location: 'Building C, Floor 1', phone: '555-0100' },
    { name: 'General Ward A', type: 'general', totalBeds: 40, location: 'Building A, Floor 1', phone: '555-0100' },
    { name: 'Private Rooms B', type: 'private', totalBeds: 20, location: 'Building A, Floor 1', phone: '555-0100' },
    { name: 'Emergency Beds', type: 'emergency', totalBeds: 30, location: 'Building D, Ground Floor', phone: '555-0100' },
    { name: 'Critical Care', type: 'icu', totalBeds: 10, location: 'Building D, Ground Floor', phone: '555-0100' },
  ];
  for (const w of data) {
    await delay();
    const r = await apiPost<{ ward: any }>('/wards', {
      name: w.name, type: w.type, totalBeds: w.totalBeds, location: w.location, phone: w.phone,
    }, adminToken);
    wards.push({ _id: getEid(r.ward) });
  }
  console.log(`  ✓ ${wards.length} wards`);
}

// ── Step 4: Doctors ──────────────────────────────────────────────────────────────
async function seedDoctors(): Promise<void> {
  console.log('\n[4] Seeding Doctor Profiles...');
  const specs = [
    { idx: 0, specialization: 'Cardiology', experienceYears: 12, consultationFee: 350 },
    { idx: 1, specialization: 'Neurology', experienceYears: 8, consultationFee: 400 },
    { idx: 2, specialization: 'Orthopedics', experienceYears: 15, consultationFee: 300 },
    { idx: 3, specialization: 'Pediatrics', experienceYears: 10, consultationFee: 250 },
    { idx: 4, specialization: 'Dermatology', experienceYears: 7, consultationFee: 280 },
    { idx: 5, specialization: 'General Medicine', experienceYears: 20, consultationFee: 200 },
  ];
  for (const s of specs) {
    await delay();
    const form = new FormData();
    form.append('userId', doctorTokens[s.idx].userId);
    form.append('specialization', s.specialization);
    form.append('experienceYears', String(s.experienceYears));
    form.append('consultationFee', String(s.consultationFee));
    form.append('licenseDocument', new Blob([createPngPlaceholder()], { type: 'image/png' }), `license-${s.idx}.png`);
    const r = await apiPostForm<{ doctor: any }>('/doctors', form, adminToken);
    doctors.push({ _id: getEid(r.doctor), specialization: s.specialization, userId: doctorTokens[s.idx].userId, consultationFee: s.consultationFee });
  }
  console.log(`  ✓ ${doctors.length} doctors`);
}

// ── Step 5: Schedules ────────────────────────────────────────────────────────────
async function seedSchedules(): Promise<void> {
  console.log('\n[5] Seeding Schedules...');
  const schedules = [
    { doctorId: doctors[0]._id, weeklySlots: [{ d:1,s:'09:00',e:'17:00'},{d:2,s:'09:00',e:'17:00'},{d:3,s:'09:00',e:'17:00'},{d:4,s:'09:00',e:'17:00'},{d:5,s:'09:00',e:'15:00'}], slotDuration: 30 },
    { doctorId: doctors[1]._id, weeklySlots: [{ d:2,s:'10:00',e:'18:00'},{d:3,s:'10:00',e:'18:00'},{d:4,s:'10:00',e:'18:00'}], slotDuration: 30 },
    { doctorId: doctors[2]._id, weeklySlots: [{ d:1,s:'10:00',e:'16:00'},{d:3,s:'10:00',e:'16:00'},{d:5,s:'10:00',e:'14:00'}], slotDuration: 45 },
    { doctorId: doctors[3]._id, weeklySlots: [{ d:1,s:'08:00',e:'14:00'},{d:2,s:'08:00',e:'14:00'},{d:3,s:'08:00',e:'14:00'},{d:4,s:'08:00',e:'14:00'},{d:5,s:'08:00',e:'14:00'},{d:6,s:'09:00',e:'12:00'}], slotDuration: 30 },
    { doctorId: doctors[4]._id, weeklySlots: [{ d:1,s:'09:00',e:'16:00'},{d:2,s:'09:00',e:'16:00'},{d:4,s:'09:00',e:'16:00'},{d:5,s:'09:00',e:'13:00'}], slotDuration: 30 },
    { doctorId: doctors[5]._id, weeklySlots: [{ d:1,s:'08:00',e:'16:00'},{d:2,s:'08:00',e:'16:00'},{d:3,s:'08:00',e:'16:00'},{d:4,s:'08:00',e:'16:00'},{d:5,s:'08:00',e:'14:00'}], slotDuration: 30 },
  ];
  for (const sched of schedules) {
    await delay();
    await apiPost('/doctors/schedule', {
      doctorId: sched.doctorId,
      weeklySlots: sched.weeklySlots.map((w) => ({ dayOfWeek: w.d, startTime: w.s, endTime: w.e, isActive: true })),
      slotDuration: sched.slotDuration,
    }, adminToken);
  }
  console.log(`  ✓ ${schedules.length} schedules`);
}

// ── Step 6: Appointments (MongoDB — bypass API validators) ──────────────────────
async function seedAppointments(): Promise<void> {
  console.log('\n[6] Seeding Appointments (MongoDB)...');
  const db = await getMongoDb();
  const patIds = patientTokens.map((p) => new ObjectId(p.userId));
  const docIds = doctors.map((d) => new ObjectId(d._id));
  const docs = [
    { p: patIds[0], d: docIds[0], dt: pastDate(10,9,0), r: 'Chest pain and shortness of breath', s: 'Completed' },
    { p: patIds[1], d: docIds[1], dt: pastDate(9,10,30), r: 'Severe headaches for the past week', s: 'Completed' },
    { p: patIds[2], d: docIds[2], dt: pastDate(8,14,0), r: 'Knee pain after sports injury', s: 'Completed' },
    { p: patIds[3], d: docIds[3], dt: pastDate(7,11,0), r: 'Annual checkup for 5-year-old', s: 'Completed' },
    { p: patIds[4], d: docIds[4], dt: pastDate(6,9,30), r: 'Skin rash that wont go away', s: 'Completed' },
    { p: patIds[5], d: docIds[5], dt: pastDate(5,15,0), r: 'General fatigue and dizziness', s: 'Completed' },
    { p: patIds[6], d: docIds[0], dt: pastDate(4,10,0), r: 'Follow-up cardiac assessment', s: 'Completed' },
    { p: patIds[7], d: docIds[1], dt: pastDate(3,9,0), r: 'Numbness in fingers', s: 'Completed' },
    { p: patIds[8], d: docIds[2], dt: pastDate(2,11,30), r: 'Back pain after lifting heavy objects', s: 'Completed' },
    { p: patIds[9], d: docIds[3], dt: pastDate(1,14,0), r: 'Vaccination schedule update', s: 'Completed' },
    { p: patIds[0], d: docIds[5], dt: futureDate(1,8,30), r: 'Blood pressure monitoring', s: 'Pending' },
    { p: patIds[1], d: docIds[0], dt: futureDate(2,10,0), r: 'ECG follow-up', s: 'Confirmed' },
    { p: patIds[2], d: docIds[4], dt: futureDate(3,9,0), r: 'Skin allergy consultation', s: 'Pending' },
    { p: patIds[3], d: docIds[2], dt: futureDate(4,15,30), r: 'Ankle sprain evaluation', s: 'Pending' },
    { p: patIds[4], d: docIds[1], dt: futureDate(5,11,0), r: 'MRI results discussion', s: 'Confirmed' },
  ];
  const res = await db.collection('appointments').insertMany(
    docs.map((a) => ({ patientId: a.p, doctorId: a.d, appointmentDate: a.dt, reasonForVisit: a.r, status: a.s })),
  );
  appointments.push(...Object.values(res.insertedIds).map((id) => ({ _id: id.toString() })));
  console.log(`  ✓ ${appointments.length} appointments (10 past, 5 future)`);
}

// ── Step 7: Medical Records ─────────────────────────────────────────────────────
async function seedRecords(): Promise<void> {
  console.log('\n[7] Seeding Medical Records...');
  const data = [
    { pi:0, di:0, ai:0, dg:'Hypertension Stage 1 - elevated blood pressure requiring lifestyle modifications', rx:'Lisinopril 10mg once daily, Low sodium diet' },
    { pi:1, di:1, ai:1, dg:'Tension-type headache with migraine features', rx:'Sumatriptan 50mg as needed' },
    { pi:2, di:2, ai:2, dg:'ACL sprain - grade II', rx:'RICE protocol, Physical therapy 2x/week, Knee brace' },
    { pi:3, di:3, ai:3, dg:'Healthy child - all developmental milestones met', rx:'Continue vaccination schedule' },
    { pi:4, di:4, ai:4, dg:'Contact dermatitis - allergic reaction to new detergent', rx:'Hydrocortisone 1% cream twice daily' },
    { pi:5, di:5, ai:5, dg:'Iron deficiency anemia', rx:'Ferrous sulfate 325mg daily, Vitamin C with iron' },
    { pi:6, di:0, ai:6, dg:'Stable angina - controlled with medication', rx:'Continue cardiac medications, Stress test scheduled' },
    { pi:7, di:1, ai:7, dg:'Mild carpal tunnel syndrome', rx:'Wrist splint at night, Ibuprofen 400mg as needed' },
    { pi:8, di:2, ai:8, dg:'Lumbar muscle strain', rx:'Naproxen 500mg twice daily, Heat therapy' },
    { pi:9, di:3, ai:9, dg:'Up-to-date on immunizations, mild vitamin D deficiency', rx:'Vitamin D3 1000IU daily' },
    { pi:0, di:5, ai:10, dg:'Pre-hypertension - monitoring advised', rx:'Diet and exercise counseling' },
    { pi:1, di:0, ai:11, dg:'ECG normal, blood pressure improved', rx:'Continue medication, Follow-up in 3 months' },
    { pi:2, di:4, ai:12, dg:'Eczema flare-up - mild', rx:'Tacrolimus 0.1% ointment, Moisturizer twice daily' },
    { pi:3, di:2, ai:13, dg:'Mild ankle sprain - resolved', rx:'No further treatment needed' },
    { pi:4, di:1, ai:14, dg:'MRI clear - migraine management plan', rx:'Propranolol 40mg daily, Migraine diary' },
  ];
  for (const rec of data) {
    await delay();
    const result = await apiPost<{ record: any }>('/records', {
      patientId: patientTokens[rec.pi].userId,
      appointmentId: appointments[rec.ai]?._id,
      diagnosis: rec.dg,
      prescription: rec.rx,
    }, doctorTokens[rec.di].token);
    medicalRecords.push({ _id: getEid(result.record) });
  }
  console.log(`  ✓ ${medicalRecords.length} records`);
}

// ── Step 8: Medicines ────────────────────────────────────────────────────────────
async function seedMedicines(): Promise<void> {
  console.log('\n[8] Seeding Medicines...');
  const data = [
    { n:'Amoxicillin 500mg',c:'Antibiotic',p:8.50,q:500,e:'2027-06-30' },
    { n:'Azithromycin 250mg',c:'Antibiotic',p:12.75,q:300,e:'2027-08-15' },
    { n:'Lisinopril 10mg',c:'Cardiovascular',p:15.00,q:450,e:'2027-03-20' },
    { n:'Metoprolol 50mg',c:'Cardiovascular',p:18.25,q:350,e:'2027-05-10' },
    { n:'Atorvastatin 20mg',c:'Cardiovascular',p:22.00,q:400,e:'2027-07-25' },
    { n:'Amlodipine 5mg',c:'Cardiovascular',p:9.75,q:500,e:'2027-04-30' },
    { n:'Omeprazole 20mg',c:'Gastrointestinal',p:11.50,q:600,e:'2027-09-10' },
    { n:'Metformin 500mg',c:'Diabetes',p:7.25,q:700,e:'2027-11-20' },
    { n:'Paracetamol 500mg',c:'Analgesic',p:5.00,q:1000,e:'2028-01-10' },
    { n:'Ibuprofen 400mg',c:'Analgesic',p:7.50,q:800,e:'2027-12-05' },
    { n:'Sumatriptan 50mg',c:'Analgesic',p:35.00,q:150,e:'2027-08-20' },
    { n:'Hydrocortisone 1%',c:'Dermatological',p:9.00,q:300,e:'2027-10-15' },
    { n:'Cetirizine 10mg',c:'Antihistamine',p:8.00,q:450,e:'2027-04-25' },
    { n:'Ferrous Sulfate 325mg',c:'Supplements',p:6.75,q:400,e:'2027-08-05' },
    { n:'Vitamin D3 1000IU',c:'Supplements',p:12.00,q:600,e:'2028-02-15' },
    { n:'Propranolol 40mg',c:'Cardiovascular',p:16.50,q:300,e:'2027-11-30' },
    { n:'Prednisolone 5mg',c:'Corticosteroid',p:11.00,q:250,e:'2027-09-30' },
    { n:'Salbutamol 100mcg',c:'Respiratory',p:18.00,q:350,e:'2027-11-10' },
    { n:'Tacrolimus 0.1%',c:'Dermatological',p:42.00,q:100,e:'2027-07-30' },
    { n:'Levothyroxine 50mcg',c:'Thyroid',p:11.75,q:400,e:'2027-10-30' },
  ];
  let count = 0;
  for (const m of data) {
    await delay();
    try {
      const form = new FormData();
      form.append('name', m.n); form.append('category', m.c); form.append('price', String(m.p));
      form.append('stockQuantity', String(m.q)); form.append('expiryDate', m.e);
      form.append('packagingImage', new Blob([createPngPlaceholder()], { type: 'image/png' }), `${m.n.replace(/\s/g,'_')}.png`);
      const r = await apiPostForm<{ medicine: any }>('/medicines', form, adminToken);
      medicines.push({ _id: getEid(r.medicine), name: m.n });
      count++;
    } catch (err: any) { console.log(`  ⚠ ${m.n}: ${err.message}`); }
  }
  console.log(`  ✓ ${count} medicines`);
}

// ── Step 9: Prescriptions ──────────────────────────────────────────────────────
async function seedPrescriptions(): Promise<void> {
  console.log('\n[9] Seeding Prescriptions...');
  if (medicines.length === 0) { console.log('  ⚠ Skipping'); return; }
  const data = [
    { pi:0, di:0, ri:0 }, { pi:1, di:1, ri:1 }, { pi:2, di:2, ri:2 },
    { pi:3, di:3, ri:3 }, { pi:4, di:4, ri:4 }, { pi:5, di:5, ri:5 },
    { pi:6, di:0, ri:6 }, { pi:7, di:1, ri:7 }, { pi:8, di:2, ri:8 },
    { pi:9, di:3, ri:9 }, { pi:0, di:5, ri:10 }, { pi:4, di:1, ri:14 },
  ];
  for (const pr of data) {
    await delay();
    const itemCount = 2 + (pr.ri % 2);
    const items = [];
    for (let i = 0; i < itemCount && i < medicines.length; i++) {
      const med = medicines[(pr.ri + i) % medicines.length];
      items.push({ medicineId: med._id, medicineName: med.name, dosage: '1 tablet', quantity: 30, instructions: 'Take once daily after meals' });
    }
    prescriptions.push(await apiPost<CreatedEntity>('/prescriptions', {
      patientId: patientTokens[pr.pi].userId,
      doctorId: doctors[pr.di]._id,
      medicalRecordId: medicalRecords[pr.ri]?._id,
      items, notes: 'Please follow dosage instructions carefully',
    }, doctorTokens[pr.di].token));
  }
  console.log(`  ✓ ${prescriptions.length} prescriptions`);
}

// ── Step 10: Invoices ────────────────────────────────────────────────────────────
async function seedInvoices(): Promise<void> {
  console.log('\n[10] Seeding Invoices...');
  const data = [
    { pi:0, ai:0, di:0 }, { pi:1, ai:1, di:1 }, { pi:2, ai:2, di:2 },
    { pi:3, ai:3, di:3 }, { pi:4, ai:4, di:4 }, { pi:5, ai:5, di:5 },
    { pi:6, ai:6, di:0 }, { pi:9, ai:9, di:3 },
  ];
  for (const inv of data) {
    await delay();
    const doc = doctors[inv.di];
    const r = await apiPost<{ invoice: any }>('/invoices', {
      patientId: patientTokens[inv.pi].userId,
      appointmentId: appointments[inv.ai]?._id,
      items: [{ description: `Doctor Consultation - ${doc.specialization}`, category: 'consultation', quantity: 1, unitPrice: doc.consultationFee }],
      discount: 0,
    }, adminToken);
    invoices.push({ _id: getEid(r.invoice) });
  }
  console.log(`  ✓ ${invoices.length} invoices`);
}

// ── Step 11: Ward Assignments ────────────────────────────────────────────────────
async function seedWardAssignments(): Promise<void> {
  console.log('\n[11] Seeding Ward Assignments...');
  const data = [
    { pi:0, wi:0, b:1, a:10, d:3 }, { pi:1, wi:2, b:1, a:8, d:1 },
    { pi:2, wi:4, b:5, a:12, d:2 }, { pi:5, wi:9, b:3, a:9, d:1 },
    { pi:6, wi:0, b:3, a:7, d:0 }, { pi:8, wi:4, b:8, a:11, d:1 },
  ];
  for (const a of data) {
    await delay();
    const r = await apiPost<{ assignment: any }>('/assignments', {
      wardId: wards[a.wi]._id,
      patientId: patientTokens[a.pi].userId,
      bedNumber: a.b,
      admissionDate: pastDate(a.a, 10, 0).toISOString(),
      expectedDischarge: pastDate(a.d, 10, 0).toISOString(),
      notes: 'Regular monitoring required',
    }, receptionistToken!.token);
    wardAssignments.push({ _id: getEid(r.assignment) });
  }
  console.log(`  ✓ ${wardAssignments.length} assignments`);
}

// ── Step 12: Ward Medications ────────────────────────────────────────────────────
async function seedWardMedications(): Promise<void> {
  console.log('\n[12] Seeding Ward Medications...');
  if (medicines.length === 0 || wardAssignments.length === 0) { console.log('  ⚠ Skipping'); return; }
  const data = [
    { ai:0, mi:2, d:'10mg', f:'Once daily', r:'oral' },
    { ai:0, mi:3, d:'50mg', f:'Twice daily', r:'oral' },
    { ai:1, mi:11, d:'50mg', f:'Once daily as needed', r:'oral' },
    { ai:2, mi:10, d:'400mg', f:'Three times daily', r:'oral' },
    { ai:3, mi:17, d:'100mcg', f:'Four times daily', r:'inhalation' },
    { ai:4, mi:2, d:'10mg', f:'Once daily', r:'oral' },
    { ai:5, mi:6, d:'20mg', f:'Once daily before breakfast', r:'oral' },
  ];
  for (const m of data) {
    await delay();
    await apiPost('/wardMedications', {
      wardAssignmentId: wardAssignments[m.ai]._id,
      medicationId: medicines[m.mi]._id,
      dosage: m.d, frequency: m.f, route: m.r,
      startDate: pastDate(5, 8, 0).toISOString(), status: 'active',
    }, receptionistToken!.token);
  }
  console.log(`  ✓ ${data.length} ward medications`);
}

// ── Main ──────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(60));
  console.log('  Hospital Management — Seed v2');
  console.log(`  API: ${API}  |  DB: hospital_db (Atlas)`);
  console.log('═'.repeat(60));

  try {
    // Health check
    console.log('\nAPI check...');
    try { const hr = await fetch(`${API.replace('/api', '')}/health`); console.log(hr.ok ? '✓ Reachable' : '⚠ Non-200'); }
    catch { console.log('⚠ Unreachable, proceeding...'); }

    await dropAll(); await delay(1000);
    await seedUsersMongo(); await delay(1000);
    await loginEssential(); await delay(1000);
    await seedWards(); await delay(1000);
    await seedDoctors(); await delay(1000);
    await seedSchedules(); await delay(1000);
    await seedAppointments(); await delay(1000);
    await seedRecords(); await delay(1000);
    await seedMedicines(); await delay(1000);
    await seedPrescriptions(); await delay(1000);
    await seedInvoices(); await delay(1000);
    await seedWardAssignments(); await delay(1000);
    await seedWardMedications();

    console.log('\n' + '═'.repeat(60));
    console.log('  ✓ Seeding Complete!');
    console.log('═'.repeat(60));
    console.log(`\n  Users:     ${patientTokens.length + doctorTokens.length + 3}`);
    console.log(`  Wards:     ${wards.length}`);
    console.log(`  Doctors:   ${doctors.length}`);
    console.log(`  Appts:     ${appointments.length} (10 past, 5 future)`);
    console.log(`  Records:   ${medicalRecords.length}`);
    console.log(`  Medicines: ${medicines.length}`);
    console.log(`  Rx:        ${prescriptions.length}`);
    console.log(`  Invoices:  ${invoices.length}`);
    console.log(`  Assigns:   ${wardAssignments.length}`);
    console.log(`  Ward Meds: 7`);
    console.log('\n  Credentials:');
    console.log('    Admin:    admin@hospital.com / Admin123!');
    console.log('    Doctor:   sarah.mitchell@hospital.com / Doctor123!');
    console.log('    Patient:  john.anderson@email.com / Patient123!');
  } catch (err) {
    console.error('\n✗ FAILED:', err);
    process.exit(1);
  } finally {
    if (mongoClient) await mongoClient.close();
    console.log('\nDone.');
  }
}

main();
