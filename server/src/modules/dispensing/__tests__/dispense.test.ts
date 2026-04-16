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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  server = createServer();

  await import('../../../tests/testHelper.js');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Dispense API', () => {
  it('POST /api/dispense — pharmacist dispenses medicines and stock is deducted', async () => {
    const testPatient = await global.testHelper.createUser({ role: 'patient' });
    const testDoctor = await global.testHelper.createUser({ role: 'doctor' });
    const testDoctorProfile = await global.testHelper.createDoctor({ userId: testDoctor._id });
    const testMedicine = await global.testHelper.createMedicine({ stockQuantity: 100 });
    const testPharmacist = await global.testHelper.createUser({ role: 'pharmacist' });
    const testPrescription = await global.testHelper.createPrescription({
      patientId: testPatient._id,
      doctorId: testDoctorProfile._id,
      items: [{ medicineId: testMedicine._id, medicineName: testMedicine.name, dosage: '500mg', quantity: 3 }]
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacist)}` },
      payload: {
        prescriptionId: testPrescription._id.toString(),
        dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 3 }]
      }
    });
    console.log('DISPENSE RESPONSE:', res.statusCode, JSON.stringify(res.body));
    expect(res.statusCode).toBe(201);
    const body = res.body;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('fulfilled');

    const updatedMedicine = await mongoose.model('Medicine').findById(testMedicine._id);
    expect(updatedMedicine?.stockQuantity).toBe(97);
  });

  it('POST /api/dispense — rejects if prescription not active', async () => {
    const testPatient = await global.testHelper.createUser({ role: 'patient' });
    const testDoctor = await global.testHelper.createUser({ role: 'doctor' });
    const testDoctorProfile = await global.testHelper.createDoctor({ userId: testDoctor._id });
    const testMedicine = await global.testHelper.createMedicine();
    const testPharmacist = await global.testHelper.createUser({ role: 'pharmacist' });
    const testPrescription = await global.testHelper.createPrescription({
      patientId: testPatient._id,
      doctorId: testDoctorProfile._id,
      items: [{ medicineId: testMedicine._id, medicineName: testMedicine.name, dosage: '500mg', quantity: 2 }]
    });

    await mongoose.model('Prescription').findByIdAndUpdate(testPrescription._id, { status: 'cancelled' });

    const res = await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacist)}` },
      payload: {
        prescriptionId: testPrescription._id.toString(),
        dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 2 }]
      }
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/dispense — rejects if stock insufficient', async () => {
    const testPatient = await global.testHelper.createUser({ role: 'patient' });
    const testDoctor = await global.testHelper.createUser({ role: 'doctor' });
    const testDoctorProfile = await global.testHelper.createDoctor({ userId: testDoctor._id });
    const testMedicine = await global.testHelper.createMedicine({ stockQuantity: 1 });
    const testPharmacist = await global.testHelper.createUser({ role: 'pharmacist' });
    const testPrescription = await global.testHelper.createPrescription({
      patientId: testPatient._id,
      doctorId: testDoctorProfile._id,
      items: [{ medicineId: testMedicine._id, medicineName: testMedicine.name, dosage: '500mg', quantity: 5 }]
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacist)}` },
      payload: {
        prescriptionId: testPrescription._id.toString(),
        dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 5 }]
      }
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/dispense/patient/:patientId — patient sees own dispenses', async () => {
    const testPatient = await global.testHelper.createUser({ role: 'patient' });
    const testDoctor = await global.testHelper.createUser({ role: 'doctor' });
    const testDoctorProfile = await global.testHelper.createDoctor({ userId: testDoctor._id });
    const testMedicine = await global.testHelper.createMedicine();
    const testPharmacist = await global.testHelper.createUser({ role: 'pharmacist' });
    const testPrescription = await global.testHelper.createPrescription({
      patientId: testPatient._id,
      doctorId: testDoctorProfile._id,
      items: [{ medicineId: testMedicine._id, medicineName: testMedicine.name, dosage: '500mg', quantity: 1 }]
    });

    await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacist)}` },
      payload: {
        prescriptionId: testPrescription._id.toString(),
        dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 1 }]
      }
    });

    const res = await server.inject({
      method: 'GET',
      url: `/api/dispense/patient/${testPatient._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPatient)}` }
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/dispense/patient/:patientId — admin can view any patient dispenses', async () => {
    const testPatient = await global.testHelper.createUser({ role: 'patient' });
    const testDoctor = await global.testHelper.createUser({ role: 'doctor' });
    const testDoctorProfile = await global.testHelper.createDoctor({ userId: testDoctor._id });
    const testMedicine = await global.testHelper.createMedicine();
    const testPharmacist = await global.testHelper.createUser({ role: 'pharmacist' });
    const testAdmin = await global.testHelper.createUser({ role: 'admin' });
    const testPrescription = await global.testHelper.createPrescription({
      patientId: testPatient._id,
      doctorId: testDoctorProfile._id,
      items: [{ medicineId: testMedicine._id, medicineName: testMedicine.name, dosage: '500mg', quantity: 1 }]
    });

    await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacist)}` },
      payload: {
        prescriptionId: testPrescription._id.toString(),
        dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 1 }]
      }
    });

    const res = await server.inject({
      method: 'GET',
      url: `/api/dispense/patient/${testPatient._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testAdmin)}` }
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/dispense/patient/:patientId — another patient cannot view dispenses', async () => {
    const testPatient = await global.testHelper.createUser({ role: 'patient' });
    const testDoctor = await global.testHelper.createUser({ role: 'doctor' });
    const testDoctorProfile = await global.testHelper.createDoctor({ userId: testDoctor._id });
    const testMedicine = await global.testHelper.createMedicine();
    const testPharmacist = await global.testHelper.createUser({ role: 'pharmacist' });
    const otherPatient = await global.testHelper.createUser({ role: 'patient' });
    const testPrescription = await global.testHelper.createPrescription({
      patientId: testPatient._id,
      doctorId: testDoctorProfile._id,
      items: [{ medicineId: testMedicine._id, medicineName: testMedicine.name, dosage: '500mg', quantity: 1 }]
    });

    await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacist)}` },
      payload: {
        prescriptionId: testPrescription._id.toString(),
        dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 1 }]
      }
    });

    const res = await server.inject({
      method: 'GET',
      url: `/api/dispense/patient/${testPatient._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(otherPatient)}` }
    });
    expect(res.statusCode).toBe(403);
  });
});
