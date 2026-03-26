import { beforeAll, afterAll, beforeEach, describe, expect, test, setDefaultTimeout } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const testDbName = `hospital_management_doctors_test_${Date.now()}`;
const baseMongoUri = process.env['MONGO_URI'] ?? 'mongodb://127.0.0.1:27017/hospital_management';
const mongoBase = baseMongoUri.replace(/\/?[^/]*$/, '');
const testUploadsDir = path.resolve(process.cwd(), 'uploads-test', testDbName);

process.env['NODE_ENV'] = 'test';
process.env['MONGO_URI'] = process.env['MONGO_URI_TEST'] ?? `${mongoBase}/${testDbName}`;
process.env['JWT_SECRET'] = process.env['JWT_SECRET'] ?? 'test-secret';
process.env['JWT_EXPIRES_IN'] = process.env['JWT_EXPIRES_IN'] ?? '1h';
process.env['UPLOADS_DIR'] = testUploadsDir;

setDefaultTimeout(20_000);

let app: {
  listen: (port: number, cb?: () => void) => Server;
};
type TestUser = {
  _id: mongoose.Types.ObjectId;
  email: string;
  role: string;
  name: string;
};

type UserModel = {
  create: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'doctor' | 'patient';
  }) => Promise<TestUser>;
  deleteMany: (filter: Record<string, never>) => Promise<unknown>;
};

type DoctorModel = {
  deleteMany: (filter: Record<string, never>) => Promise<unknown>;
};

let User: UserModel;
let Doctor: DoctorModel;
let server: Server;
let baseUrl = '';

function authToken(user: { _id: { toString: () => string }; email: string; role: string }) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env['JWT_SECRET']!,
    { expiresIn: '1h' },
  );
}

function buildDoctorForm(params: {
  userId: string;
  specialization?: string;
  experienceYears?: string;
  consultationFee?: string;
  availability?: string;
  fileType?: string;
  fileName?: string;
}) {
  const form = new FormData();
  form.append('userId', params.userId);
  form.append('specialization', params.specialization ?? 'Cardiology');
  form.append('experienceYears', params.experienceYears ?? '8');
  form.append('consultationFee', params.consultationFee ?? '150');
  form.append('availability', params.availability ?? 'Available');

  const fileType = params.fileType ?? 'application/pdf';
  const fileName = params.fileName ?? 'license.pdf';
  form.append('licenseDocument', new File(['license-data'], fileName, { type: fileType }));

  return form;
}

async function api(pathname: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${baseUrl}${pathname}`, init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function cleanupUploadsDir() {
  try {
    const files = await fs.readdir(testUploadsDir);
    await Promise.all(
      files.map(async (fileName) => {
        await fs.unlink(path.join(testUploadsDir, fileName));
      }),
    );
  } catch {
    // Directory may not exist yet.
  }
}

async function createUser(role: 'admin' | 'doctor' | 'patient') {
  const suffix = `${role}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return User.create({
    name: `${role} user`,
    email: `${suffix}@example.com`,
    password: 'Password123!',
    role,
  });
}

beforeAll(async () => {
  const appModule = await import('../app.js');
  const authModel = await import('../modules/auth/auth.model.js');
  const doctorModel = await import('../modules/doctors/doctor.model.js');

  app = appModule.app;
  User = authModel.User;
  Doctor = doctorModel.Doctor;

  await mongoose.connect(process.env['MONGO_URI']!, {
    serverSelectionTimeoutMS: 5000,
  });

  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  await cleanupUploadsDir();
  await Doctor.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await cleanupUploadsDir();
  await Doctor.deleteMany({});
  await User.deleteMany({});
  await mongoose.connection.dropDatabase();

  await new Promise<void>((resolve, reject) => {
    // closeAllConnections is available in modern Node runtimes and avoids lingering keep-alive sockets.
    if ('closeAllConnections' in server && typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    server.close((err) => {
      if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') reject(err);
      else resolve();
    });
  });

  await mongoose.connection.close();
  await fs.rm(testUploadsDir, { recursive: true, force: true });
});

describe('Doctor API integration', () => {
  test('GET /api/doctors returns empty list when no doctors exist', async () => {
    const res = await api('/api/doctors');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.doctors)).toBe(true);
    expect(res.body.data.doctors.length).toBe(0);
    expect(res.body.data.count).toBe(0);
  });

  test('POST /api/doctors rejects unauthenticated requests', async () => {
    const doctorUser = await createUser('doctor');
    const form = buildDoctorForm({ userId: doctorUser._id.toString() });

    const res = await api('/api/doctors', { method: 'POST', body: form });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/doctors rejects non-admin users', async () => {
    const patient = await createUser('patient');
    const doctorUser = await createUser('doctor');
    const token = authToken(patient);
    const form = buildDoctorForm({ userId: doctorUser._id.toString() });

    const res = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/doctors fails when license document is missing', async () => {
    const admin = await createUser('admin');
    const doctorUser = await createUser('doctor');
    const token = authToken(admin);

    const form = new FormData();
    form.append('userId', doctorUser._id.toString());
    form.append('specialization', 'Cardiology');
    form.append('experienceYears', '10');
    form.append('consultationFee', '200');

    const res = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('License document is required');
  });

  test('POST /api/doctors validates userId format', async () => {
    const admin = await createUser('admin');
    const token = authToken(admin);
    const form = buildDoctorForm({ userId: 'not-an-object-id' });

    const res = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/doctors rejects non-doctor linked users', async () => {
    const admin = await createUser('admin');
    const patientUser = await createUser('patient');
    const token = authToken(admin);
    const form = buildDoctorForm({ userId: patientUser._id.toString() });

    const res = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Linked user must have role doctor');
  });

  test('POST /api/doctors creates doctor profile and stores file path', async () => {
    const admin = await createUser('admin');
    const doctorUser = await createUser('doctor');
    const token = authToken(admin);
    const form = buildDoctorForm({ userId: doctorUser._id.toString() });

    const res = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.doctor.userId).toBe(doctorUser._id.toString());
    expect(res.body.data.doctor.licenseDocumentUrl).toMatch(/^\/uploads\//);
  });

  test('POST /api/doctors rejects duplicate doctor profile for same userId', async () => {
    const admin = await createUser('admin');
    const doctorUser = await createUser('doctor');
    const token = authToken(admin);

    const first = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: buildDoctorForm({ userId: doctorUser._id.toString() }),
    });
    const second = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: buildDoctorForm({ userId: doctorUser._id.toString(), fileName: 'license-2.pdf' }),
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.success).toBe(false);
  });

  test('GET /api/doctors returns populated user details', async () => {
    const admin = await createUser('admin');
    const doctorUser = await createUser('doctor');
    const token = authToken(admin);

    const created = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: buildDoctorForm({ userId: doctorUser._id.toString(), specialization: 'Neurology' }),
    });
    const listRes = await api('/api/doctors');

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.count).toBe(1);
    expect(listRes.body.data.doctors[0].userId.name).toBe(doctorUser.name);
    expect(listRes.body.data.doctors[0].userId.email).toBe(doctorUser.email);
  });

  test('GET /api/doctors validates query params', async () => {
    const res = await api('/api/doctors?availability=Working');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/doctors/:id handles invalid and missing ids', async () => {
    const invalid = await api('/api/doctors/not-a-valid-id');
    const missing = await api(`/api/doctors/${new mongoose.Types.ObjectId().toString()}`);

    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
  });

  test('PUT /api/doctors/:id enforces role and input constraints', async () => {
    const admin = await createUser('admin');
    const patient = await createUser('patient');
    const doctorUser = await createUser('doctor');

    const adminToken = authToken(admin);
    const patientToken = authToken(patient);

    const created = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: buildDoctorForm({ userId: doctorUser._id.toString() }),
    });
    const doctorId = created.body.data.doctor._id as string;

    const forbidden = await api(`/api/doctors/${doctorId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${patientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ consultationFee: 100 }),
    });

    const invalidPayload = await api(`/api/doctors/${doctorId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ consultationFee: -1 }),
    });

    expect(forbidden.status).toBe(403);
    expect(invalidPayload.status).toBe(422);
  });

  test('PUT /api/doctors/:id blocks doctors from editing other doctor profiles', async () => {
    const admin = await createUser('admin');
    const doctorUserA = await createUser('doctor');
    const doctorUserB = await createUser('doctor');

    const adminToken = authToken(admin);
    const doctorTokenB = authToken(doctorUserB);

    const created = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: buildDoctorForm({ userId: doctorUserA._id.toString() }),
    });
    const doctorIdA = created.body.data.doctor._id as string;

    const res = await api(`/api/doctors/${doctorIdA}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${doctorTokenB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ consultationFee: 999 }),
    });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Doctors can only update their own profile');
  });

  test('PUT /api/doctors/:id allows admin updates', async () => {
    const admin = await createUser('admin');
    const doctorUser = await createUser('doctor');
    const token = authToken(admin);

    const created = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: buildDoctorForm({ userId: doctorUser._id.toString() }),
    });
    const doctorId = created.body.data.doctor._id as string;

    const updated = await api(`/api/doctors/${doctorId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ availability: 'On Leave', consultationFee: 220 }),
    });

    expect(updated.status).toBe(200);
    expect(updated.body.data.doctor.availability).toBe('On Leave');
    expect(updated.body.data.doctor.consultationFee).toBe(220);
  });

  test('DELETE /api/doctors/:id enforces auth and removes record', async () => {
    const admin = await createUser('admin');
    const patient = await createUser('patient');
    const doctorUser = await createUser('doctor');

    const adminToken = authToken(admin);
    const patientToken = authToken(patient);

    const created = await api('/api/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: buildDoctorForm({ userId: doctorUser._id.toString() }),
    });
    const doctorId = created.body.data.doctor._id as string;

    const forbidden = await api(`/api/doctors/${doctorId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${patientToken}` },
    });

    const invalidId = await api('/api/doctors/not-a-valid-id', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const deleted = await api(`/api/doctors/${doctorId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const verifyGone = await api(`/api/doctors/${doctorId}`);

    expect(forbidden.status).toBe(403);
    expect(invalidId.status).toBe(400);
    expect(deleted.status).toBe(200);
    expect(verifyGone.status).toBe(404);
  });
});
