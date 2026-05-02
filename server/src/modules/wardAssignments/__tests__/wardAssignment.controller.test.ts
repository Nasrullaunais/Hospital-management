/// <reference types="vitest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env['NODE_ENV'] = 'test';
process.env['MONGO_URI'] = 'mongodb://127.0.0.1:27017/placeholder';
process.env['JWT_SECRET'] = 'test-secret';
process.env['JWT_EXPIRES_IN'] = '1h';

const { createServer } = await import('../../../app.js');

let server: ReturnType<typeof createServer>;
let mongoServer: MongoMemoryServer;

// ── Test Data ─────────────────────────────────────────────────────────────────

let testWardId: mongoose.Types.ObjectId;
let testPatientId: mongoose.Types.ObjectId;
let receptionistToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  server = await createServer();
  await import('../../../tests/testHelper.js');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const th = (globalThis as any).testHelper;

  const ward = await th.createWard();
  testWardId = ward._id as mongoose.Types.ObjectId;

  const patient = await th.createUser({ role: 'patient' });
  testPatientId = patient._id as mongoose.Types.ObjectId;

  const receptionist = await th.createUser({ role: 'receptionist' });
  receptionistToken = th.getToken(receptionist);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('wardAssignment.controller (via HTTP)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. assignPatient — success
  it('POST /api/wardAssignments — 201 with assignment on success', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/wardAssignments',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      payload: {
        wardId: testWardId.toString(),
        bedNumber: 1,
        patientId: testPatientId.toString(),
        admissionDate: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.body;
    expect(body.success).toBe(true);
    expect(body.data.assignment.status).toBe('active');
    expect(body.data.assignment.bedNumber).toBe(1);
  });

  // 2. assignPatient — 409 bed already occupied
  it('POST /api/wardAssignments — 409 when bed already occupied', async () => {
    const res1 = await server.inject({
      method: 'POST',
      url: '/api/wardAssignments',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      payload: {
        wardId: testWardId.toString(),
        bedNumber: 2,
        patientId: testPatientId.toString(),
        admissionDate: new Date().toISOString(),
      },
    });
    expect(res1.statusCode).toBe(201);

    const res2 = await server.inject({
      method: 'POST',
      url: '/api/wardAssignments',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      payload: {
        wardId: testWardId.toString(),
        bedNumber: 2,
        patientId: testPatientId.toString(),
        admissionDate: new Date().toISOString(),
      },
    });
    expect(res2.statusCode).toBe(409);
    expect(res2.body.message).toContain('already occupied');
  });

  // 3. assignPatient — 404 patient not found
  it('POST /api/wardAssignments — 404 when patient not found', async () => {
    const fakePatientId = new mongoose.Types.ObjectId();
    const res = await server.inject({
      method: 'POST',
      url: '/api/wardAssignments',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      payload: {
        wardId: testWardId.toString(),
        bedNumber: 3,
        patientId: fakePatientId.toString(),
        admissionDate: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Patient not found');
  });

  // 4. assignPatient — 404 ward not found
  it('POST /api/wardAssignments — 404 when ward not found', async () => {
    const fakeWardId = new mongoose.Types.ObjectId();
    const res = await server.inject({
      method: 'POST',
      url: '/api/wardAssignments',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      payload: {
        wardId: fakeWardId.toString(),
        bedNumber: 3,
        patientId: testPatientId.toString(),
        admissionDate: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Ward not found');
  });

  // 5. getWardAssignments — returns assignments for a ward
  it('GET /api/wardAssignments/ward/:wardId — returns assignments', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/wardAssignments/ward/${testWardId}`,
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.assignments)).toBe(true);
  });

  // 6. getAssignmentById — 404 when not found
  it('GET /api/wardAssignments/:id — 404 when assignment not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await server.inject({
      method: 'GET',
      url: `/api/wardAssignments/${fakeId}`,
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Assignment not found');
  });

  // 7. dischargePatient — success (status=discharged, actualDischarge set)
  it('DELETE /api/wardAssignments/:id — discharges patient, status becomes discharged', async () => {
    // First create an assignment
    const assignRes = await server.inject({
      method: 'POST',
      url: '/api/wardAssignments',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      payload: {
        wardId: testWardId.toString(),
        bedNumber: 4,
        patientId: testPatientId.toString(),
        admissionDate: new Date().toISOString(),
      },
    });
    expect(assignRes.statusCode).toBe(201);
    const assignmentId = assignRes.body.data.assignment._id;

    // Discharge it
    const dischargeRes = await server.inject({
      method: 'DELETE',
      url: `/api/wardAssignments/${assignmentId}`,
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    expect(dischargeRes.statusCode).toBe(200);
    expect(dischargeRes.body.success).toBe(true);
    expect(dischargeRes.body.data.assignment.status).toBe('discharged');
    expect(dischargeRes.body.data.assignment.actualDischarge).toBeDefined();
  });
});
