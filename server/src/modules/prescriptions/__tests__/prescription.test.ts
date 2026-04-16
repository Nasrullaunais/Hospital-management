import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set environment variables before importing app
// Use placeholder values to pass validateEnv() - actual connection uses MongoMemoryServer
process.env['NODE_ENV'] = 'test';
process.env['MONGO_URI'] = 'mongodb://127.0.0.1:27017/placeholder';
process.env['JWT_SECRET'] = 'test-secret';
process.env['JWT_EXPIRES_IN'] = '1h';

const { createServer } = await import('../../../app.js');

let server: ReturnType<typeof createServer>;
let mongoServer: MongoMemoryServer;
let testUser: any;
let testDoctor: any;
let testDoctorProfile: any;
let testMedicine: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  server = createServer();

  // Import testHelper and create test data
  await import('../../../tests/testHelper.js');
  testUser = await global.testHelper.createUser({ role: 'patient' });
  testDoctor = await global.testHelper.createUser({ role: 'doctor' });
  testDoctorProfile = await global.testHelper.createDoctor({ userId: testDoctor._id });
  testMedicine = await global.testHelper.createMedicine();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Prescription API', () => {
  it('POST /api/prescriptions — doctor creates prescription', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor)}` },
      payload: {
        patientId: testUser._id.toString(),
        doctorId: testDoctorProfile._id.toString(),
        medicalRecordId: null,
        items: [
          { medicineId: testMedicine._id.toString(), medicineName: testMedicine.name, dosage: '500mg', quantity: 2, instructions: 'Take twice daily' }
        ],
        notes: 'Regular follow-up'
      }
    });
    expect(res.statusCode).toBe(201);
    const body = res.body;
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].dosage).toBe('500mg');
  });

  it('GET /api/prescriptions/patient/:patientId — patient sees prescriptions', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/prescriptions/patient/${testUser._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testUser)}` }
    });
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
