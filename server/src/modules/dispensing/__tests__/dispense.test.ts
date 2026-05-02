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
let testPharmacistUser: any;
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
  testPharmacistUser = await global.testHelper.createUser({ role: 'pharmacist' });
  testMedicine = await global.testHelper.createMedicine();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Dispense API', () => {
  it('POST /api/dispense — pharmacist dispenses and stock is deducted', async () => {
    // Create prescription first
    const rxRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [{ medicineId: testMedicine._id.toString(), medicineName: testMedicine.name, dosage: '500mg', quantity: 3, instructions: 'Take with food' }]
      }
    });
    expect(rxRes.statusCode).toBe(201);
    const prescriptionId = rxRes.body.data._id;
    const initialStock = testMedicine.stockQuantity;

    const res = await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacistUser)}` },
      payload: {
        prescriptionId,
        dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 3 }]
      }
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('fulfilled');
    expect(res.body.data.dispensedItems).toHaveLength(1);
    expect(res.body.data.dispensedItems[0].quantityDispensed).toBe(3);
    expect(res.body.data.dispensedItems[0].quantityPrescribed).toBe(3);

    // Stock deducted
    const updated = await mongoose.model('Medicine').findById(testMedicine._id);
    expect(updated?.stockQuantity).toBe(initialStock - 3);
  });

  it('POST /api/dispense — rejects inactive prescription', async () => {
    const rxRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [{ medicineId: testMedicine._id.toString(), medicineName: testMedicine.name, dosage: '250mg', quantity: 1 }]
      }
    });
    const prescriptionId = rxRes.body.data._id;

    // Cancel it first
    await server.inject({
      method: 'PUT',
      url: `/api/prescriptions/${prescriptionId}/cancel`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` }
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacistUser)}` },
      payload: { prescriptionId, dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 1 }] }
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/dispense — rejects insufficient stock', async () => {
    const rxRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [{ medicineId: testMedicine._id.toString(), medicineName: testMedicine.name, dosage: '100mg', quantity: 9999 }]
      }
    });
    const prescriptionId = rxRes.body.data._id;

    const res = await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacistUser)}` },
      payload: { prescriptionId, dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 9999 }] }
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Insufficient stock');
  });

  it('POST /api/dispense — patient cannot dispense', async () => {
    const rxRes = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testPatient._id.toString(),
        items: [{ medicineId: testMedicine._id.toString(), medicineName: testMedicine.name, dosage: '50mg', quantity: 1 }]
      }
    });
    const prescriptionId = rxRes.body.data._id;

    const res = await server.inject({
      method: 'POST',
      url: '/api/dispense',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPatient)}` },
      payload: { prescriptionId, dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 1 }] }
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /api/dispense/patient/:patientId — patient sees own dispenses', async () => {
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
    const admin = await global.testHelper.createUser({ role: 'admin' });
    const res = await server.inject({
      method: 'GET',
      url: `/api/dispense/patient/${testPatient._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(admin)}` }
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/dispense/patient/:patientId — another patient cannot view dispenses', async () => {
    const otherPatient = await global.testHelper.createUser({ role: 'patient' });
    const res = await server.inject({
      method: 'GET',
      url: `/api/dispense/patient/${testPatient._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(otherPatient)}` }
    });
    expect(res.statusCode).toBe(403);
  });
});
