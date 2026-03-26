import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: resolve(import.meta.dirname, '../.env') });

const API_BASE = process.env['TEST_API_BASE_URL'] ?? 'http://localhost:5000';
const MONGO_URI = process.env['MONGO_URI'];

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in server/.env');
  process.exit(1);
}
const MONGO_URI_REQUIRED = MONGO_URI;

type TestResult = {
  name: string;
  passed: boolean;
  details?: string;
};

type ApiEnvelope = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

type AuthUser = {
  email: string;
  password: string;
  token: string;
  id: string;
};

const results: TestResult[] = [];

function record(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const mark = passed ? 'PASS' : 'FAIL';
  console.info(`[${mark}] ${name}${details ? ` - ${details}` : ''}`);
}

function expect(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function getObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function getData(body: ApiEnvelope | null): Record<string, unknown> {
  return getObject(body?.data) ?? {};
}

async function req(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: ApiEnvelope | null }> {
  const res = await fetch(`${API_BASE}${path}`, init);
  let body: ApiEnvelope | null;
  try {
    body = (await res.json()) as ApiEnvelope;
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function registerUser(roleLabel: string): Promise<{ email: string; password: string }> {
  const uniq = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const email = `${roleLabel}.${uniq}@example.com`;
  const password = 'StrongPass1';

  const registerRes = await req('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${roleLabel} User`,
      email,
      password,
    }),
  });

  expect(registerRes.status === 201, `Register failed for ${roleLabel}: ${registerRes.status}`);
  return { email, password };
}

async function loginUser(email: string, password: string): Promise<AuthUser> {
  const loginRes = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  expect(loginRes.status === 200, `Login failed for ${email}: ${loginRes.status}`);
  const loginData = getData(loginRes.body);
  const token = typeof loginData['token'] === 'string' ? loginData['token'] : '';
  const user = getObject(loginData['user']);
  const id = typeof user?.['_id'] === 'string' ? user['_id'] : '';
  expect(!!token, `Missing token for ${email}`);
  expect(!!id, `Missing user id for ${email}`);

  return { email, password, token, id };
}

function authHeaders(token: string, extra?: Record<string, string>): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(extra ?? {}),
  };
}

function createMedicineForm(input: {
  name: string;
  category: string;
  price: string;
  stockQuantity: string;
  expiryDate: string;
  includeImage?: boolean;
}): FormData {
  const form = new FormData();
  form.append('name', input.name);
  form.append('category', input.category);
  form.append('price', input.price);
  form.append('stockQuantity', input.stockQuantity);
  form.append('expiryDate', input.expiryDate);

  if (input.includeImage !== false) {
    const imagePath = resolve(import.meta.dirname, '../../client/assets/images/icon.png');
    const imageBytes = readFileSync(imagePath);
    const imageBlob = new Blob([imageBytes], { type: 'image/png' });
    form.append('packagingImage', imageBlob, 'icon.png');
  }

  return form;
}

async function main() {
  await mongoose.connect(MONGO_URI_REQUIRED);
  const createdEmails: string[] = [];
  const createdMedicineIds: string[] = [];

  try {
    const noAuthList = await req('/api/medicines');
    record('GET /api/medicines requires auth', noAuthList.status === 401, `status=${noAuthList.status}`);

    const noAuthStockPatch = await req('/api/medicines/invalid-id/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantityChange: 1 }),
    });
    record(
      'PATCH /api/medicines/:id/stock requires auth',
      noAuthStockPatch.status === 401,
      `status=${noAuthStockPatch.status}`,
    );

    const adminSeed = await registerUser('admin');
    const pharmacistSeed = await registerUser('pharmacist');
    const patientSeed = await registerUser('patient');
    createdEmails.push(adminSeed.email, pharmacistSeed.email, patientSeed.email);

    const users = mongoose.connection.collection('users');
    await users.updateOne({ email: adminSeed.email }, { $set: { role: 'admin' } });
    await users.updateOne({ email: pharmacistSeed.email }, { $set: { role: 'pharmacist' } });

    const admin = await loginUser(adminSeed.email, adminSeed.password);
    const pharmacist = await loginUser(pharmacistSeed.email, pharmacistSeed.password);
    const patient = await loginUser(patientSeed.email, patientSeed.password);

    const patientCreate = await req('/api/medicines', {
      method: 'POST',
      headers: authHeaders(patient.token),
      body: createMedicineForm({
        name: 'Patient Forbidden Med',
        category: 'Painkiller',
        price: '5',
        stockQuantity: '10',
        expiryDate: new Date(Date.now() + 86400000 * 60).toString(),
      }),
    });
    record('Patient cannot create medicine', patientCreate.status === 403, `status=${patientCreate.status}`);

    const missingImage = await req('/api/medicines', {
      method: 'POST',
      headers: authHeaders(pharmacist.token),
      body: createMedicineForm({
        name: 'No Image Med',
        category: 'Painkiller',
        price: '5',
        stockQuantity: '10',
        expiryDate: new Date(Date.now() + 86400000 * 60).toString(),
        includeImage: false,
      }),
    });
    record('Create medicine rejects missing packaging image', missingImage.status === 400, `status=${missingImage.status}`);

    const invalidDate = await req('/api/medicines', {
      method: 'POST',
      headers: authHeaders(pharmacist.token),
      body: createMedicineForm({
        name: 'Bad Date Med',
        category: 'Antibiotic',
        price: '10',
        stockQuantity: '5',
        expiryDate: 'not-a-valid-date',
      }),
    });
    record('Create medicine rejects invalid date string', invalidDate.status === 422, `status=${invalidDate.status}`);

    const pastExpiry = await req('/api/medicines', {
      method: 'POST',
      headers: authHeaders(pharmacist.token),
      body: createMedicineForm({
        name: 'Expired Medicine',
        category: 'Antibiotic',
        price: '10',
        stockQuantity: '5',
        expiryDate: new Date(Date.now() - 86400000).toString(),
      }),
    });
    record('Create medicine rejects past expiry date', pastExpiry.status === 422, `status=${pastExpiry.status}`);

    const negativeStock = await req('/api/medicines', {
      method: 'POST',
      headers: authHeaders(pharmacist.token),
      body: createMedicineForm({
        name: 'Negative Stock Med',
        category: 'Antibiotic',
        price: '10',
        stockQuantity: '-1',
        expiryDate: new Date(Date.now() + 86400000 * 60).toString(),
      }),
    });
    record('Create medicine rejects negative stock', negativeStock.status === 422, `status=${negativeStock.status}`);

    const zedCreate = await req('/api/medicines', {
      method: 'POST',
      headers: authHeaders(pharmacist.token),
      body: createMedicineForm({
        name: 'ZedMed',
        category: 'Painkiller',
        price: '12.5',
        stockQuantity: '50',
        expiryDate: new Date(Date.now() + 86400000 * 90).toString(),
      }),
    });
    const zedMedicine = getObject(getData(zedCreate.body)['medicine']);
    const zedMedicineId = typeof zedMedicine?.['_id'] === 'string' ? zedMedicine['_id'] : '';
    if (zedMedicineId) {
      createdMedicineIds.push(zedMedicineId);
    }
    record('Pharmacist can create medicine', zedCreate.status === 201 && !!zedMedicineId, `status=${zedCreate.status}`);

    const packagingImageUrl =
      typeof zedMedicine?.['packagingImageUrl'] === 'string' ? zedMedicine['packagingImageUrl'] : undefined;
    record(
      'Create medicine returns relative packaging image URL',
      typeof packagingImageUrl === 'string' && packagingImageUrl.startsWith('/uploads/'),
      `url=${packagingImageUrl ?? 'undefined'}`,
    );

    const aspirinCreate = await req('/api/medicines', {
      method: 'POST',
      headers: authHeaders(admin.token),
      body: createMedicineForm({
        name: 'Aspirin',
        category: 'Painkiller',
        price: '3.2',
        stockQuantity: '20',
        expiryDate: new Date(Date.now() + 86400000 * 120).toISOString(),
      }),
    });
    const aspirinMedicine = getObject(getData(aspirinCreate.body)['medicine']);
    const aspirinId = typeof aspirinMedicine?.['_id'] === 'string' ? aspirinMedicine['_id'] : '';
    if (aspirinId) {
      createdMedicineIds.push(aspirinId);
    }
    record('Admin can create medicine', aspirinCreate.status === 201 && !!aspirinId, `status=${aspirinCreate.status}`);

    const patientList = await req('/api/medicines', {
      headers: authHeaders(patient.token),
    });
    const medicinesRaw = getData(patientList.body)['medicines'];
    const medicines = Array.isArray(medicinesRaw) ? medicinesRaw : [];
    const names = medicines
      .map((m) => {
        const med = getObject(m);
        return typeof med?.['name'] === 'string' ? med['name'] : '';
      })
      .filter(Boolean);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    record(
      'Medicine listing is alphabetically sorted',
      patientList.status === 200 && JSON.stringify(names) === JSON.stringify(sorted),
      `status=${patientList.status} names=${JSON.stringify(names)}`,
    );

    const updateByAdmin = await req(`/api/medicines/${zedMedicineId}`, {
      method: 'PUT',
      headers: authHeaders(admin.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ category: 'Antiviral', price: 15.75 }),
    });
    const updatedMedicine = getObject(getData(updateByAdmin.body)['medicine']);
    const updatedCategory =
      typeof updatedMedicine?.['category'] === 'string' ? updatedMedicine['category'] : undefined;
    record(
      'Admin can update medicine general fields',
      updateByAdmin.status === 200 && updatedCategory === 'Antiviral',
      `status=${updateByAdmin.status} category=${updatedCategory}`,
    );

    const updateByPharmacist = await req(`/api/medicines/${zedMedicineId}`, {
      method: 'PUT',
      headers: authHeaders(pharmacist.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ category: 'ShouldFail' }),
    });
    record('Pharmacist cannot update medicine', updateByPharmacist.status === 403, `status=${updateByPharmacist.status}`);

    const updateWithNoFields = await req(`/api/medicines/${zedMedicineId}`, {
      method: 'PUT',
      headers: authHeaders(admin.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({}),
    });
    record('Update medicine rejects empty update payload', updateWithNoFields.status === 400, `status=${updateWithNoFields.status}`);

    const stockZero = await req(`/api/medicines/${zedMedicineId}/stock`, {
      method: 'PATCH',
      headers: authHeaders(patient.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ quantityChange: 0 }),
    });
    record('Stock adjust rejects zero quantityChange', stockZero.status === 422, `status=${stockZero.status}`);

    const stockInvalidType = await req(`/api/medicines/${zedMedicineId}/stock`, {
      method: 'PATCH',
      headers: authHeaders(patient.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ quantityChange: 'abc' }),
    });
    record('Stock adjust rejects non-integer quantityChange', stockInvalidType.status === 422, `status=${stockInvalidType.status}`);

    const stockTooLow = await req(`/api/medicines/${zedMedicineId}/stock`, {
      method: 'PATCH',
      headers: authHeaders(patient.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ quantityChange: -9999 }),
    });
    record('Stock adjust rejects insufficient stock decrement', stockTooLow.status === 400, `status=${stockTooLow.status}`);

    const beforeConcurrentRes = await req(`/api/medicines/${zedMedicineId}`, {
      headers: authHeaders(patient.token),
    });
    const beforeMed = getObject(getData(beforeConcurrentRes.body)['medicine']);
    const beforeConcurrent = Number(beforeMed?.['stockQuantity'] ?? 0);

    const incrementCalls = Array.from({ length: 40 }, () =>
      req(`/api/medicines/${zedMedicineId}/stock`, {
        method: 'PATCH',
        headers: authHeaders(patient.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quantityChange: 1 }),
      }),
    );
    const incrementResults = await Promise.all(incrementCalls);
    const incrementAllSuccess = incrementResults.every((r) => r.status === 200);

    const afterConcurrentRes = await req(`/api/medicines/${zedMedicineId}`, {
      headers: authHeaders(patient.token),
    });
    const afterMed = getObject(getData(afterConcurrentRes.body)['medicine']);
    const afterConcurrent = Number(afterMed?.['stockQuantity'] ?? 0);
    record(
      'Concurrent positive stock adjustments are atomic',
      incrementAllSuccess && afterConcurrent === beforeConcurrent + 40,
      `before=${beforeConcurrent} after=${afterConcurrent}`,
    );

    const forceToFive = await req(`/api/medicines/${zedMedicineId}`, {
      method: 'PUT',
      headers: authHeaders(admin.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ price: 15.75, category: 'Antiviral' }),
    });
    expect(forceToFive.status === 200, 'Admin update failed before decrement race test');

    const currentForResetRes = await req(`/api/medicines/${zedMedicineId}`, { headers: authHeaders(patient.token) });
    const resetMed = getObject(getData(currentForResetRes.body)['medicine']);
    const currentForReset = Number(resetMed?.['stockQuantity'] ?? 0);
    if (currentForReset !== 5) {
      await req(`/api/medicines/${zedMedicineId}/stock`, {
        method: 'PATCH',
        headers: authHeaders(patient.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quantityChange: 5 - currentForReset }),
      });
    }

    const decrementCalls = Array.from({ length: 10 }, () =>
      req(`/api/medicines/${zedMedicineId}/stock`, {
        method: 'PATCH',
        headers: authHeaders(patient.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quantityChange: -1 }),
      }),
    );
    const decrementResults = await Promise.all(decrementCalls);
    const decSuccess = decrementResults.filter((r) => r.status === 200).length;
    const decFail = decrementResults.filter((r) => r.status === 400).length;

    const afterDecrementRes = await req(`/api/medicines/${zedMedicineId}`, { headers: authHeaders(patient.token) });
    const decrementedMed = getObject(getData(afterDecrementRes.body)['medicine']);
    const afterDecrement = Number(decrementedMed?.['stockQuantity'] ?? -1);
    record(
      'Concurrent decrements never oversell below zero',
      decSuccess === 5 && decFail === 5 && afterDecrement === 0,
      `success=${decSuccess} fail=${decFail} final=${afterDecrement}`,
    );

    const deleteByPharmacist = await req(`/api/medicines/${aspirinId}`, {
      method: 'DELETE',
      headers: authHeaders(pharmacist.token),
    });
    record('Pharmacist cannot delete medicine', deleteByPharmacist.status === 403, `status=${deleteByPharmacist.status}`);

    const deleteByAdmin = await req(`/api/medicines/${aspirinId}`, {
      method: 'DELETE',
      headers: authHeaders(admin.token),
    });
    record('Admin can delete medicine', deleteByAdmin.status === 200, `status=${deleteByAdmin.status}`);

    const deletedGet = await req(`/api/medicines/${aspirinId}`, {
      headers: authHeaders(patient.token),
    });
    record('Deleted medicine is not found', deletedGet.status === 404, `status=${deletedGet.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record('Test runner fatal error', false, msg);
  } finally {
    const users = mongoose.connection.collection('users');
    const medicines = mongoose.connection.collection('medicines');

    if (createdEmails.length > 0) {
      await users.deleteMany({ email: { $in: createdEmails } });
    }

    if (createdMedicineIds.length > 0) {
      const medicineObjectIds = createdMedicineIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (medicineObjectIds.length > 0) {
        await medicines.deleteMany({ _id: { $in: medicineObjectIds } });
      }
    }

    await mongoose.disconnect();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.info('\n--- Pharmacy Edge Test Summary ---');
  console.info(`Total: ${results.length}`);
  console.info(`Passed: ${passed}`);
  console.info(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

await main();
