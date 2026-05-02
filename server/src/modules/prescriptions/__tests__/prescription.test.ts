import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env['NODE_ENV'] = 'test';
process.env['MONGO_URI'] = 'mongodb://127.0.0.1:27017/placeholder';
process.env['JWT_SECRET'] = 'test-secret';
process.env['JWT_EXPIRES_IN'] = '1h';

const { createServer } = await import('../../../app.js');

let server: ReturnType<typeof createServer>;
let mongoServer: MongoMemoryServer;
let testPatient: any;
let testDoctor: any;
let testDoctorProfile: any;
let testAdminUser: any;
let testMedicine: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  server = await createServer();

  await import('../../../tests/testHelper.js');
  testPatient = await global.testHelper.createUser({ role: 'patient' });
  testDoctor = await global.testHelper.createUser({ role: 'doctor' });
  testDoctorProfile = await global.testHelper.createDoctor({ userId: testDoctor._id });
  testAdminUser = await global.testHelper.createUser({ role: 'admin' });
  testMedicine = await global.testHelper.createMedicine();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Prescription API', () => {
  it('POST /api/prescriptions - doctor creates prescription', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        medicalRecordId: null,
        items: [
          {
            medicineId: testMedicine._id.toString(),
            medicineName: testMedicine.name,
            dosage: '500mg',
            quantity: 2,
            instructions: 'Take twice daily',
          },
        ],
        notes: 'Regular follow-up',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.body;
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].dosage).toBe('500mg');
    expect(body.data.doctorId.toString()).toBe(testDoctorProfile._id.toString());
  });

  it('POST /api/prescriptions - rejects invalid item (quantity <= 0)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [{ medicineId: testMedicine._id.toString(), dosage: '500mg', quantity: 0 }],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/prescriptions - rejects item missing medicineId', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [{ dosage: '500mg', quantity: 2 }],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/prescriptions/patient/:patientId - patient sees own prescriptions', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/prescriptions/patient/${testPatient._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPatient)}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /api/prescriptions/patient/:patientId - admin can view any patient prescriptions', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/prescriptions/patient/${testPatient._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testAdminUser)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/prescriptions/patient/:patientId - another patient cannot view prescriptions', async () => {
    const otherPatient = await global.testHelper.createUser({ role: 'patient' });
    const res = await server.inject({
      method: 'GET',
      url: `/api/prescriptions/patient/${testPatient._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(otherPatient)}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /api/prescriptions/pending - pharmacist views pending prescriptions', async () => {
    const pharmacistUser = await global.testHelper.createUser({ role: 'pharmacist' });
    const res = await server.inject({
      method: 'GET',
      url: '/api/prescriptions/pending',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(pharmacistUser)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/prescriptions/pending - patient cannot view pending prescriptions', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/prescriptions/pending',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPatient)}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /api/prescriptions/:id - patient views own prescription', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [
          {
            medicineId: testMedicine._id.toString(),
            medicineName: testMedicine.name,
            dosage: '250mg',
            quantity: 1,
          },
        ],
      },
    });
    expect(createRes.statusCode).toBe(201);
    const prescriptionId = createRes.body.data._id;

    const res = await server.inject({
      method: 'GET',
      url: `/api/prescriptions/${prescriptionId}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPatient)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/prescriptions/:id - another patient cannot view prescription', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [
          {
            medicineId: testMedicine._id.toString(),
            medicineName: testMedicine.name,
            dosage: '250mg',
            quantity: 1,
          },
        ],
      },
    });
    const prescriptionId = createRes.body.data._id;

    const otherPatient = await global.testHelper.createUser({ role: 'patient' });
    const res = await server.inject({
      method: 'GET',
      url: `/api/prescriptions/${prescriptionId}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(otherPatient)}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('PUT /api/prescriptions/:id/cancel - doctor cancels own prescription', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [
          {
            medicineId: testMedicine._id.toString(),
            medicineName: testMedicine.name,
            dosage: '100mg',
            quantity: 1,
          },
        ],
      },
    });
    const prescriptionId = createRes.body.data._id;

    const res = await server.inject({
      method: 'PUT',
      url: `/api/prescriptions/${prescriptionId}/cancel`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('PUT /api/prescriptions/:id/cancel - admin cancels any prescription', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [
          {
            medicineId: testMedicine._id.toString(),
            medicineName: testMedicine.name,
            dosage: '100mg',
            quantity: 1,
          },
        ],
      },
    });
    const prescriptionId = createRes.body.data._id;

    const res = await server.inject({
      method: 'PUT',
      url: `/api/prescriptions/${prescriptionId}/cancel`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testAdminUser)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('PUT /api/prescriptions/:id/cancel - cannot cancel already cancelled prescription', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [
          {
            medicineId: testMedicine._id.toString(),
            medicineName: testMedicine.name,
            dosage: '100mg',
            quantity: 1,
          },
        ],
      },
    });
    const prescriptionId = createRes.body.data._id;

    await server.inject({
      method: 'PUT',
      url: `/api/prescriptions/${prescriptionId}/cancel`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
    });

    const res = await server.inject({
      method: 'PUT',
      url: `/api/prescriptions/${prescriptionId}/cancel`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('PUT /api/prescriptions/:id/cancel - another doctor cannot cancel prescription', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [
          {
            medicineId: testMedicine._id.toString(),
            medicineName: testMedicine.name,
            dosage: '100mg',
            quantity: 1,
          },
        ],
      },
    });
    const prescriptionId = createRes.body.data._id;

    const otherDoctor = await global.testHelper.createUser({ role: 'doctor' });
    await global.testHelper.createDoctor({ userId: otherDoctor._id });

    const res = await server.inject({
      method: 'PUT',
      url: `/api/prescriptions/${prescriptionId}/cancel`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(otherDoctor)}` },
    });
    expect(res.statusCode).toBe(403);
  });
});
