import { unlink } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../modules/auth/auth.model.js';
import { Doctor } from '../modules/doctors/doctor.model.js';
import { MedicalRecord } from '../modules/records/record.model.js';

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  errors?: Array<{ field?: string; message?: string }>;
}

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const port = env.PORT ?? 5000;
const baseUrl = `http://localhost:${port}`;
const marker = `phase4-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createdUserIds: string[] = [];
const createdDoctorIds: string[] = [];
const createdRecordIds: string[] = [];
const uploadedFiles: string[] = [];
const results: TestResult[] = [];

function addResult(name: string, passed: boolean, details?: string): void {
  results.push({ name, passed, details });
  const icon = passed ? 'PASS' : 'FAIL';
  if (details) {
    console.info(`[${icon}] ${name} -> ${details}`);
  } else {
    console.info(`[${icon}] ${name}`);
  }
}

function expectTrue(condition: boolean, name: string, details?: string): void {
  addResult(name, condition, condition ? details : details ?? 'Assertion failed');
}

async function waitForHealth(timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      // keep polling
    }
    await Bun.sleep(600);
  }
  throw new Error(`Server did not become healthy within ${timeoutMs}ms`);
}

async function requestJson(
  method: string,
  endpoint: string,
  options?: {
    token?: string;
    body?: Record<string, unknown>;
  },
): Promise<{ status: number; json: ApiResponse }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (options?.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: ApiResponse = {};
  try {
    json = text ? (JSON.parse(text) as ApiResponse) : {};
  } catch {
    json = { message: text };
  }

  return { status: res.status, json };
}

async function requestMultipart(
  method: string,
  endpoint: string,
  options?: {
    token?: string;
    fields?: Record<string, string>;
    file?: { field: string; filename: string; mimeType: string; content: string };
  },
): Promise<{ status: number; json: ApiResponse }> {
  const form = new FormData();

  if (options?.fields) {
    for (const [key, value] of Object.entries(options.fields)) {
      form.append(key, value);
    }
  }

  if (options?.file) {
    const blob = new Blob([options.file.content], { type: options.file.mimeType });
    form.append(options.file.field, blob, options.file.filename);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options?.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: form,
  });

  const text = await res.text();
  let json: ApiResponse = {};
  try {
    json = text ? (JSON.parse(text) as ApiResponse) : {};
  } catch {
    json = { message: text };
  }

  return { status: res.status, json };
}

async function createUser(params: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'doctor' | 'patient';
}): Promise<string> {
  const user = await User.create(params);
  const id = user._id.toString();
  createdUserIds.push(id);
  return id;
}

async function login(email: string, password: string): Promise<string> {
  const res = await requestJson('POST', '/api/auth/login', { body: { email, password } });
  if (res.status !== 200 || !res.json.data) {
    throw new Error(`Login failed for ${email}. status=${res.status} msg=${res.json.message}`);
  }

  const token = (res.json.data as { token?: string }).token;
  if (!token) throw new Error(`Token missing in login response for ${email}`);
  return token;
}

async function cleanup(): Promise<void> {
  // Remove uploaded files created during tests
  const uploadDirs = [
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(import.meta.dir, '../../uploads'),
    path.resolve(import.meta.dir, '../../../uploads'),
  ];
  for (const filename of uploadedFiles) {
    for (const dir of uploadDirs) {
      try {
        await unlink(path.join(dir, filename));
      } catch {
        // ignore missing file
      }
    }
  }

  if (createdRecordIds.length > 0) {
    await MedicalRecord.deleteMany({ _id: { $in: createdRecordIds } });
  }
  await MedicalRecord.deleteMany({ diagnosis: { $regex: marker, $options: 'i' } });

  if (createdDoctorIds.length > 0) {
    await Doctor.deleteMany({ _id: { $in: createdDoctorIds } });
  }
  if (createdUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: createdUserIds } });
  }
  await User.deleteMany({ email: { $regex: marker, $options: 'i' } });
}

async function run(): Promise<void> {
  await connectDB();
  await waitForHealth();

  const password = 'Passw0rdA';

  const adminEmail = `${marker}-admin@test.local`;
  const doctor1Email = `${marker}-doctor1@test.local`;
  const doctor2Email = `${marker}-doctor2@test.local`;
  const doctorNoProfileEmail = `${marker}-doctornp@test.local`;
  const patient1Email = `${marker}-patient1@test.local`;
  const patient2Email = `${marker}-patient2@test.local`;

  const adminUserId = await createUser({ name: 'Phase4 Admin', email: adminEmail, password, role: 'admin' });
  const doctor1UserId = await createUser({ name: 'Phase4 Doctor One', email: doctor1Email, password, role: 'doctor' });
  const doctor2UserId = await createUser({ name: 'Phase4 Doctor Two', email: doctor2Email, password, role: 'doctor' });
  await createUser({ name: 'Phase4 Doctor NoProfile', email: doctorNoProfileEmail, password, role: 'doctor' });
  const patient1UserId = await createUser({ name: 'Phase4 Patient One', email: patient1Email, password, role: 'patient' });
  const patient2UserId = await createUser({ name: 'Phase4 Patient Two', email: patient2Email, password, role: 'patient' });

  const doctor1 = await Doctor.create({
    userId: doctor1UserId,
    specialization: `Cardiology-${marker}`,
    experienceYears: 6,
    consultationFee: 120,
    availability: 'Available',
    licenseDocumentUrl: `/uploads/${marker}-license-1.pdf`,
  });
  createdDoctorIds.push(doctor1._id.toString());

  const doctor2 = await Doctor.create({
    userId: doctor2UserId,
    specialization: `Neurology-${marker}`,
    experienceYears: 8,
    consultationFee: 180,
    availability: 'Available',
    licenseDocumentUrl: `/uploads/${marker}-license-2.pdf`,
  });
  createdDoctorIds.push(doctor2._id.toString());

  const adminToken = await login(adminEmail, password);
  const doctor1Token = await login(doctor1Email, password);
  const doctor2Token = await login(doctor2Email, password);
  const doctorNoProfileToken = await login(doctorNoProfileEmail, password);
  const patient1Token = await login(patient1Email, password);
  const patient2Token = await login(patient2Email, password);

  // 1) Unauthenticated create should fail
  {
    const res = await requestMultipart('POST', '/api/records', {
      fields: { patientId: patient1UserId, diagnosis: `${marker} unauth attempt` },
    });
    expectTrue(res.status === 401, 'POST /api/records rejects unauthenticated request', `status=${res.status}`);
  }

  // 2) Patient create should fail by role
  {
    const res = await requestMultipart('POST', '/api/records', {
      token: patient1Token,
      fields: { patientId: patient1UserId, diagnosis: `${marker} patient create` },
    });
    expectTrue(res.status === 403, 'POST /api/records rejects patient role', `status=${res.status}`);
  }

  // 3) Doctor without profile should fail
  {
    const res = await requestMultipart('POST', '/api/records', {
      token: doctorNoProfileToken,
      fields: { patientId: patient1UserId, diagnosis: `${marker} no profile` },
    });
    expectTrue(
      res.status === 404,
      'POST /api/records fails when doctor profile is missing',
      `status=${res.status} msg=${res.json.message}`,
    );
  }

  // 4) Invalid patientId validation
  {
    const res = await requestMultipart('POST', '/api/records', {
      token: doctor1Token,
      fields: { patientId: 'not-a-mongo-id', diagnosis: `${marker} invalid patient` },
    });
    expectTrue(res.status === 422, 'POST /api/records validates patientId format', `status=${res.status}`);
  }

  // 5) Create record with spoofed doctorId in body; backend must ignore it and use authenticated doctor profile
  let record1Id = '';
  {
    const filename = `${marker}-lab-report.pdf`;
    const res = await requestMultipart('POST', '/api/records', {
      token: doctor1Token,
      fields: {
        patientId: patient1UserId,
        doctorId: doctor2._id.toString(),
        diagnosis: `${marker} diagnosis one`,
        prescription: `${marker} prescription one`,
      },
      file: {
        field: 'labReport',
        filename,
        mimeType: 'application/pdf',
        content: `%PDF-1.4\n${marker} test report`,
      },
    });

    const record = (res.json.data as { record?: Record<string, unknown> } | undefined)?.record;
    const doctorId = (record?.doctorId as string | undefined) ?? '';
    const labUrl = (record?.labReportUrl as string | undefined) ?? '';

    if (labUrl.startsWith('/uploads/')) {
      uploadedFiles.push(labUrl.replace('/uploads/', ''));
    }

    if (record?._id && typeof record._id === 'string') {
      record1Id = record._id;
      createdRecordIds.push(record1Id);
    }

    expectTrue(res.status === 201, 'POST /api/records creates record with file', `status=${res.status}`);
    expectTrue(
      doctorId === doctor1._id.toString(),
      'POST /api/records ignores body.doctorId spoofing',
      `storedDoctorId=${doctorId}`,
    );
    expectTrue(labUrl.startsWith('/uploads/'), 'POST /api/records stores labReportUrl', `labReportUrl=${labUrl}`);
  }

  // 6) Create second record by doctor1 for sorting checks
  let record2Id = '';
  {
    await Bun.sleep(25);
    const res = await requestMultipart('POST', '/api/records', {
      token: doctor1Token,
      fields: {
        patientId: patient1UserId,
        diagnosis: `${marker} diagnosis two`,
        prescription: `${marker} prescription two`,
      },
    });

    const record = (res.json.data as { record?: Record<string, unknown> } | undefined)?.record;
    if (record?._id && typeof record._id === 'string') {
      record2Id = record._id;
      createdRecordIds.push(record2Id);
    }

    expectTrue(res.status === 201, 'POST /api/records creates second record without file', `status=${res.status}`);
  }

  // 7) Create third record by doctor2 to validate doctor-logs filtering
  let doctor2RecordId = '';
  {
    await Bun.sleep(25);
    const res = await requestMultipart('POST', '/api/records', {
      token: doctor2Token,
      fields: {
        patientId: patient1UserId,
        diagnosis: `${marker} diagnosis by doctor2`,
      },
    });

    const record = (res.json.data as { record?: Record<string, unknown> } | undefined)?.record;
    if (record?._id && typeof record._id === 'string') {
      doctor2RecordId = record._id;
      createdRecordIds.push(doctor2RecordId);
    }

    expectTrue(res.status === 201, 'POST /api/records creates record for second doctor', `status=${res.status}`);
  }

  // 8) Patient can fetch own history with doctor details
  {
    const res = await requestJson('GET', `/api/records/patient/${patient1UserId}`, { token: patient1Token });
    const records = ((res.json.data as { records?: Array<Record<string, unknown>> } | undefined)?.records) ?? [];

    const hasDoctorName = records.some((r) => {
      const doctorObj = r.doctorId as { userId?: { name?: string } } | undefined;
      return Boolean(doctorObj?.userId?.name);
    });

    const sortedDesc = records.every((r, idx) => {
      if (idx === 0) return true;
      const prev = new Date(records[idx - 1]?.dateRecorded as string).getTime();
      const curr = new Date(r.dateRecorded as string).getTime();
      return prev >= curr;
    });

    expectTrue(res.status === 200, 'GET /api/records/patient/:id returns own records', `status=${res.status} count=${records.length}`);
    expectTrue(hasDoctorName, 'GET /api/records/patient/:id populates doctor user name');
    expectTrue(sortedDesc, 'GET /api/records/patient/:id returns dateRecorded desc order');
  }

  // 9) Patient cannot fetch another patient's history
  {
    const res = await requestJson('GET', `/api/records/patient/${patient2UserId}`, { token: patient1Token });
    expectTrue(res.status === 403, 'GET /api/records/patient/:id forbids cross-patient access', `status=${res.status}`);
  }

  // 10) Unauthenticated patient-history request should fail
  {
    const res = await requestJson('GET', `/api/records/patient/${patient1UserId}`);
    expectTrue(res.status === 401, 'GET /api/records/patient/:id rejects unauthenticated', `status=${res.status}`);
  }

  // 11) Doctor logs only include records created by that doctor
  {
    const res = await requestJson('GET', '/api/records/doctor-logs', { token: doctor1Token });
    const records = ((res.json.data as { records?: Array<Record<string, unknown>> } | undefined)?.records) ?? [];

    const allOwnedByDoctor1 = records.every((r) => {
      const patientObj = r.patientId as { name?: string } | undefined;
      const hasPatientName = Boolean(patientObj?.name);
      return hasPatientName;
    });

    const includesDoctor2Record = records.some((r) => r._id === doctor2RecordId);

    expectTrue(res.status === 200, 'GET /api/records/doctor-logs returns doctor records', `status=${res.status} count=${records.length}`);
    expectTrue(allOwnedByDoctor1, 'GET /api/records/doctor-logs populates patient details');
    expectTrue(!includesDoctor2Record, 'GET /api/records/doctor-logs excludes records from other doctors');
  }

  // 12) Patient cannot access doctor logs
  {
    const res = await requestJson('GET', '/api/records/doctor-logs', { token: patient1Token });
    expectTrue(res.status === 403, 'GET /api/records/doctor-logs rejects patient role', `status=${res.status}`);
  }

  // 13) Doctor without profile cannot access doctor logs
  {
    const res = await requestJson('GET', '/api/records/doctor-logs', { token: doctorNoProfileToken });
    expectTrue(
      res.status === 404,
      'GET /api/records/doctor-logs fails when doctor profile is missing',
      `status=${res.status}`,
    );
  }

  // 14) Patient cannot update a record
  {
    const res = await requestJson('PUT', `/api/records/${record1Id}`, {
      token: patient1Token,
      body: { diagnosis: `${marker} patient update attempt` },
    });
    expectTrue(res.status === 403, 'PUT /api/records/:id rejects patient role', `status=${res.status}`);
  }

  // 15) Doctor update with empty diagnosis should fail validation
  {
    const res = await requestJson('PUT', `/api/records/${record1Id}`, {
      token: doctor1Token,
      body: { diagnosis: '   ' },
    });
    expectTrue(res.status === 422, 'PUT /api/records/:id validates empty diagnosis', `status=${res.status}`);
  }

  // 16) Doctor can update prescription
  {
    const newPrescription = `${marker} updated prescription`;
    const res = await requestJson('PUT', `/api/records/${record1Id}`, {
      token: doctor1Token,
      body: { prescription: newPrescription },
    });

    const updated = (res.json.data as { record?: { prescription?: string } } | undefined)?.record;
    expectTrue(res.status === 200, 'PUT /api/records/:id updates doctor record', `status=${res.status}`);
    expectTrue(updated?.prescription === newPrescription, 'PUT /api/records/:id persists updated prescription');
  }

  // 17) Doctor cannot delete records (admin only)
  {
    const res = await requestJson('DELETE', `/api/records/${record1Id}`, { token: doctor1Token });
    expectTrue(res.status === 403, 'DELETE /api/records/:id rejects doctor role', `status=${res.status}`);
  }

  // 18) Admin delete nonexistent record should return 404
  {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await requestJson('DELETE', `/api/records/${fakeId}`, { token: adminToken });
    expectTrue(res.status === 404, 'DELETE /api/records/:id returns 404 for nonexistent id', `status=${res.status}`);
  }

  // 19) Admin can delete an existing record
  {
    const res = await requestJson('DELETE', `/api/records/${record2Id}`, { token: adminToken });
    expectTrue(res.status === 200, 'DELETE /api/records/:id succeeds for admin', `status=${res.status}`);
  }

  // 20) Deleted record should not be retrievable
  {
    const res = await requestJson('GET', `/api/records/${record2Id}`, { token: adminToken });
    expectTrue(res.status === 404, 'GET /api/records/:id returns 404 after deletion', `status=${res.status}`);
  }

  // Safety check: patient2 should have no records from this run
  {
    const res = await requestJson('GET', `/api/records/patient/${patient2UserId}`, { token: patient2Token });
    const records = ((res.json.data as { records?: unknown[] } | undefined)?.records) ?? [];
    expectTrue(res.status === 200, 'GET /api/records/patient/:id works for second patient', `status=${res.status}`);
    expectTrue(records.length === 0, 'Second patient history remains empty after tests', `count=${records.length}`);
  }
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (err) {
    addResult('Test harness execution', false, err instanceof Error ? err.message : String(err));
  } finally {
    try {
      await cleanup();
    } catch (cleanupErr) {
      addResult(
        'Cleanup execution',
        false,
        cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
      );
    }

    await disconnectDB();

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    console.info('\n---------------- Phase 4 Records E2E Summary ----------------');
    console.info(`Total checks: ${results.length}`);
    console.info(`Passed:       ${passed}`);
    console.info(`Failed:       ${failed}`);

    if (failed > 0) {
      console.info('\nFailed checks:');
      for (const r of results.filter((x) => !x.passed)) {
        console.info(` - ${r.name}${r.details ? ` :: ${r.details}` : ''}`);
      }
      process.exitCode = 1;
    } else {
      console.info('All checks passed. Test data and uploaded files were cleaned up.');
      process.exitCode = 0;
    }
  }
}

void main();
