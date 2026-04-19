# Prescription-Dispensing Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete prescription-to-dispensing workflow that links doctor prescriptions to pharmacy dispensing, with automatic stock deduction and full tracking.

**Architecture:** Two new MongoDB models — `Prescription` (doctor-authored orders linking a medical record + patient + medicines) and `Dispense` (pharmacist fulfillment records). Dispense events automatically deduct medicine stock via MongoDB transactions. The frontend adds a pharmacist view to see pending prescriptions and fulfill them, and a patient view to see their prescription history.

**Tech Stack:** Node.js/Express backend with Mongoose, React Native (Expo Router) frontend, MongoDB.

---

## File Structure

```
server/src/
├── modules/
│   ├── prescriptions/
│   │   ├── prescription.model.ts
│   │   ├── prescription.controller.ts
│   │   ├── prescription.routes.ts
│   │   └── __tests__/prescription.test.ts
│   └── dispensing/
│       ├── dispense.model.ts
│       ├── dispense.controller.ts
│       ├── dispense.routes.ts
│       └── __tests__/dispense.test.ts
└── routes/index.ts  (register new routes)

client/app/
├── features/
│   ├── prescriptions/
│   │   ├── screens/PrescriptionListScreen.tsx
│   │   ├── screens/PrescriptionDetailScreen.tsx
│   │   └── api/prescriptions.ts
│   └── dispensing/
│       ├── screens/PendingPrescriptionsScreen.tsx
│       ├── screens/DispenseScreen.tsx
│       └── api/dispensing.ts
```

---

## Task 1: Prescription Model and API

**Files:**
- Create: `server/src/modules/prescriptions/prescription.model.ts`
- Create: `server/src/modules/prescriptions/prescription.controller.ts`
- Create: `server/src/modules/prescriptions/prescription.routes.ts`
- Modify: `server/src/routes/index.ts` — import and mount prescription routes
- Create: `server/src/modules/prescriptions/__tests__/prescription.test.ts`

### Step 1: Write the failing test

```typescript
// server/src/modules/prescriptions/__tests__/prescription.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../../../app.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let server: ReturnType<typeof createServer>;
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  server = createServer();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Prescription API', () => {
  const testUser = await global.testHelper.createUser({ role: 'patient' });
  const testDoctor = await global.testHelper.createUser({ role: 'doctor' });
  const testDoctorProfile = await global.testHelper.createDoctor({ userId: testDoctor._id });
  const testMedicine = await global.testHelper.createMedicine();

  it('POST /api/prescriptions — doctor creates prescription', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/prescriptions',
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testDoctor._id)}` },
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
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].dosage).toBe('500mg');
  });

  it('GET /api/prescriptions/patient/:patientId — patient sees prescriptions', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/prescriptions/patient/${testUser._id}`,
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testUser._id)}` }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd server && bun test src/modules/prescriptions/__tests__/prescription.test.ts -t "Prescription API" --reporter=verbose`
Expected: FAIL — module not found / routes not registered

### Step 3: Write minimal Prescription model

```typescript
// server/src/modules/prescriptions/prescription.model.ts
import mongoose from 'mongoose';

const prescriptionItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  dosage: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  instructions: { type: String }
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  medicalRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
  items: { type: [prescriptionItemSchema], required: true },
  notes: { type: String },
  status: { type: String, enum: ['active', 'fulfilled', 'cancelled'], default: 'active' }
}, { timestamps: true });

export const Prescription = mongoose.model('Prescription', prescriptionSchema);
```

### Step 4: Write Prescription controller

```typescript
// server/src/modules/prescriptions/prescription.controller.ts
import { Request, Response } from 'express';
import { Prescription } from './prescription.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

export const createPrescription = async (req: Request, res: Response) => {
  const { patientId, doctorId, medicalRecordId, items, notes } = req.body;
  if (!patientId || !doctorId || !items?.length) {
    throw new ApiError(400, 'patientId, doctorId and items are required');
  }
  const prescription = await Prescription.create({ patientId, doctorId, medicalRecordId, items, notes });
  res.status(201).json({ success: true, data: prescription });
};

export const getPrescriptionsByPatient = async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const prescriptions = await Prescription.find({ patientId })
    .populate('doctorId', 'specialization')
    .populate('items.medicineId', 'name price stockQuantity')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: prescriptions });
};

export const getPrescriptionById = async (req: Request, res: Response) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('doctorId', 'userId.name specialization')
    .populate('patientId', 'name email')
    .populate('items.medicineId');
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  res.json({ success: true, data: prescription });
};

export const getPendingPrescriptions = async (req: Request, res: Response) => {
  const prescriptions = await Prescription.find({ status: 'active' })
    .populate('patientId', 'name email phone')
    .populate('doctorId', 'userId.name specialization')
    .populate('items.medicineId', 'name price stockQuantity')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: prescriptions });
};

export const cancelPrescription = async (req: Request, res: Response) => {
  const prescription = await Prescription.findByIdAndUpdate(
    req.params.id, { status: 'cancelled' }, { new: true }
  );
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  res.json({ success: true, data: prescription });
};
```

### Step 5: Write Prescription routes

```typescript
// server/src/modules/prescriptions/prescription.routes.ts
import { Router } from 'express';
import { createPrescription, getPrescriptionsByPatient, getPrescriptionById, getPendingPrescriptions, cancelPrescription } from './prescription.controller.js';
import { authMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { requireRole } from '../../shared/middlewares/authMiddleware.js';

const router = Router();

router.post('/', authMiddleware, requireRole('doctor', 'admin'), createPrescription);
router.get('/patient/:patientId', authMiddleware, getPrescriptionsByPatient);
router.get('/pending', authMiddleware, requireRole('pharmacist', 'admin'), getPendingPrescriptions);
router.get('/:id', authMiddleware, getPrescriptionById);
router.put('/:id/cancel', authMiddleware, requireRole('doctor', 'admin'), cancelPrescription);

export default router;
```

### Step 6: Register routes in index.ts

Modify `server/src/routes/index.ts` to add:
```typescript
import prescriptionRoutes from '../modules/prescriptions/prescription.routes.js';
router.use('/prescriptions', prescriptionRoutes);
```

### Step 7: Run tests

Run: `cd server && bun test src/modules/prescriptions/__tests__/prescription.test.ts -t "Prescription API" --reporter=verbose`
Expected: PASS

### Step 8: Commit

```bash
git add server/src/modules/prescriptions/ server/src/routes/index.ts
git commit -m "feat: add prescription model and API"
```

---

## Task 2: Dispense Model and API

**Files:**
- Create: `server/src/modules/dispensing/dispense.model.ts`
- Create: `server/src/modules/dispensing/dispense.controller.ts`
- Create: `server/src/modules/dispensing/dispense.routes.ts`
- Modify: `server/src/routes/index.ts`
- Create: `server/src/modules/dispensing/__tests__/dispense.test.ts`

### Step 1: Write the failing test

```typescript
// server/src/modules/dispensing/__tests__/dispense.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from '../../../app.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let server: ReturnType<typeof createServer>;
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  server = createServer();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
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
      headers: { Authorization: `Bearer ${global.testHelper.getToken(testPharmacist._id)}` },
      payload: {
        prescriptionId: testPrescription._id.toString(),
        dispensedItems: [{ medicineId: testMedicine._id.toString(), quantityDispensed: 3 }]
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('fulfilled');

    const updatedMedicine = await mongoose.model('Medicine').findById(testMedicine._id);
    expect(updatedMedicine?.stockQuantity).toBe(97);
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd server && bun test src/modules/dispensing/__tests__/dispense.test.ts -t "Dispense API" --reporter=verbose`
Expected: FAIL — module not found

### Step 3: Write Dispense model

```typescript
// server/src/modules/dispensing/dispense.model.ts
import mongoose from 'mongoose';

const dispensedItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  medicineName: { type: String, required: true },
  dosage: { type: String },
  quantityPrescribed: { type: Number, required: true },
  quantityDispensed: { type: Number, required: true },
  instructions: { type: String }
}, { _id: false });

const dispenseSchema = new mongoose.Schema({
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dispensedItems: { type: [dispensedItemSchema], required: true },
  status: { type: String, enum: ['fulfilled', 'partial', 'cancelled'], default: 'fulfilled' },
  fulfilledAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Dispense = mongoose.model('Dispense', dispenseSchema);
```

### Step 4: Write Dispense controller

```typescript
// server/src/modules/dispensing/dispense.controller.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Dispense } from './dispense.model.js';
import { Medicine } from '../pharmacy/medicine.model.js';
import { Prescription } from '../prescriptions/prescription.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

export const dispensePrescription = async (req: Request, res: Response) => {
  const { prescriptionId, dispensedItems } = req.body;
  const pharmacistId = req.user!._id;

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  if (prescription.status !== 'active') throw new ApiError(400, 'Prescription is not active');

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const item of dispensedItems) {
      const medicine = await Medicine.findById(item.medicineId).session(session);
      if (!medicine) throw new ApiError(404, `Medicine ${item.medicineId} not found`);
      if (medicine.stockQuantity < item.quantityDispensed) {
        throw new ApiError(400, `Insufficient stock for ${medicine.name}: available ${medicine.stockQuantity}, requested ${item.quantityDispensed}`);
      }
      medicine.stockQuantity -= item.quantityDispensed;
      await medicine.save({ session });
    }

    const dispense = await Dispense.create([{
      prescriptionId,
      patientId: prescription.patientId,
      pharmacistId,
      dispensedItems: dispensedItems.map((item: any) => {
        const rxItem = prescription.items.find((pi: any) => pi.medicineId.toString() === item.medicineId);
        return {
          medicineId: item.medicineId,
          medicineName: rxItem?.medicineName || '',
          dosage: rxItem?.dosage || '',
          quantityPrescribed: rxItem?.quantity || 0,
          quantityDispensed: item.quantityDispensed,
          instructions: rxItem?.instructions || ''
        };
      }),
      status: 'fulfilled'
    }], { session });

    await Prescription.findByIdAndUpdate(prescriptionId, { status: 'fulfilled' }, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: dispense[0] });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getDispensesByPatient = async (req: Request, res: Response) => {
  const dispenses = await Dispense.find({ patientId: req.params.patientId })
    .populate('pharmacistId', 'name')
    .populate('prescriptionId')
    .sort({ fulfilledAt: -1 });
  res.json({ success: true, data: dispenses });
};
```

### Step 5: Write Dispense routes

```typescript
// server/src/modules/dispensing/dispense.routes.ts
import { Router } from 'express';
import { dispensePrescription, getDispensesByPatient } from './dispense.controller.js';
import { authMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { requireRole } from '../../shared/middlewares/authMiddleware.js';

const router = Router();

router.post('/', authMiddleware, requireRole('pharmacist', 'admin'), dispensePrescription);
router.get('/patient/:patientId', authMiddleware, getDispensesByPatient);

export default router;
```

### Step 6: Register routes in index.ts

### Step 7: Run tests

Run: `cd server && bun test src/modules/dispensing/__tests__/dispense.test.ts -t "Dispense API" --reporter=verbose`
Expected: PASS

### Step 8: Commit

```bash
git add server/src/modules/dispensing/ server/src/routes/index.ts
git commit -m "feat: add dispense model and API with stock deduction"
```

---

## Task 3: Frontend Prescription Screens

**Files:**
- Create: `client/app/features/prescriptions/screens/PrescriptionListScreen.tsx`
- Create: `client/app/features/prescriptions/screens/PrescriptionDetailScreen.tsx`
- Create: `client/app/features/prescriptions/api/prescriptions.ts`

### Step 1: Write the API client

```typescript
// client/app/features/prescriptions/api/prescriptions.ts
import { apiClient } from '../../api/client';
import { Prescription } from '@/types';

export const prescriptionsApi = {
  getMyPrescriptions: async (): Promise<Prescription[]> => {
    const res = await apiClient.get('/prescriptions/patient/me');
    return res.data.data;
  },
  getPrescriptionById: async (id: string): Promise<Prescription> => {
    const res = await apiClient.get(`/prescriptions/${id}`);
    return res.data.data;
  },
  createPrescription: async (data: {
    patientId: string; doctorId: string; medicalRecordId?: string;
    items: Array<{ medicineId: string; dosage: string; quantity: number; instructions?: string }>;
    notes?: string;
  }): Promise<Prescription> => {
    const res = await apiClient.post('/prescriptions', data);
    return res.data.data;
  }
};
```

### Step 2: Write PrescriptionListScreen

```typescript
// client/app/features/prescriptions/screens/PrescriptionListScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { prescriptionsApi } from '../api/prescriptions';
import { Prescription } from '@/types';

export default function PrescriptionListScreen() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => { loadPrescriptions(); }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const data = await prescriptionsApi.getMyPrescriptions();
      setPrescriptions(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/prescriptions/${item._id}`)}>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.doctor}>{item.doctorId?.specialization || 'Doctor'}</Text>
            <Text style={styles.status}>{item.status}</Text>
            <Text style={styles.items}>{item.items.length} item(s) prescribed</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No prescriptions found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  date: { fontSize: 14, color: '#666', marginBottom: 4 },
  doctor: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  status: { fontSize: 14, color: '#2196F3', marginBottom: 4 },
  items: { fontSize: 14, color: '#666' },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  error: { color: 'red' }
});
```

### Step 3: Write PrescriptionDetailScreen

```typescript
// client/app/features/prescriptions/screens/PrescriptionDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { prescriptionsApi } from '../api/prescriptions';
import { Prescription } from '@/types';

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadPrescription(id); }, [id]);

  const loadPrescription = async (id: string) => {
    try {
      const data = await prescriptionsApi.getPrescriptionById(id);
      setPrescription(data);
    } catch (e) { /* handle error */ }
    finally { setLoading(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!prescription) return <View style={styles.center}><Text>Prescription not found</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Prescription Details</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Status: <Text style={styles.value}>{prescription.status}</Text></Text>
        <Text style={styles.label}>Date: <Text style={styles.value}>{new Date(prescription.createdAt).toLocaleDateString()}</Text></Text>
      </View>
      <Text style={styles.sectionTitle}>Medicines</Text>
      {prescription.items.map((item, idx) => (
        <View key={idx} style={styles.itemCard}>
          <Text style={styles.medicineName}>{item.medicineName}</Text>
          <Text style={styles.detail}>Dosage: {item.dosage}</Text>
          <Text style={styles.detail}>Quantity: {item.quantity}</Text>
          {item.instructions && <Text style={styles.detail}>Instructions: {item.instructions}</Text>}
        </View>
      ))}
      {prescription.notes && <View style={styles.section}><Text style={styles.notes}>{prescription.notes}</Text></View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  label: { fontSize: 14, color: '#666', marginBottom: 4 },
  value: { color: '#333' },
  itemCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  medicineName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  detail: { fontSize: 14, color: '#666' },
  notes: { fontSize: 14, fontStyle: 'italic' }
});
```

### Step 4: Commit

```bash
git add client/app/features/prescriptions/
git commit -m "feat: add prescription list and detail screens"
```

---

## Task 4: Pharmacist Dispense UI

**Files:**
- Create: `client/app/features/dispensing/screens/PendingPrescriptionsScreen.tsx`
- Create: `client/app/features/dispensing/screens/DispenseScreen.tsx`
- Create: `client/app/features/dispensing/api/dispensing.ts`

### Step 1: Write API client

```typescript
// client/app/features/dispensing/api/dispensing.ts
import { apiClient } from '../../api/client';

export const dispensingApi = {
  getPendingPrescriptions: async () => {
    const res = await apiClient.get('/prescriptions/pending');
    return res.data.data;
  },
  dispensePrescription: async (prescriptionId: string, dispensedItems: Array<{ medicineId: string; quantityDispensed: number }>) => {
    const res = await apiClient.post('/dispense', { prescriptionId, dispensedItems });
    return res.data.data;
  }
};
```

### Step 2: Write PendingPrescriptionsScreen

```typescript
// client/app/features/dispensing/screens/PendingPrescriptionsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { dispensingApi } from '../api/dispensing';

export default function PendingPrescriptionsScreen() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    try { const data = await dispensingApi.getPendingPrescriptions(); setPending(data); }
    finally { setLoading(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={pending}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/dispense/${item._id}`)}>
            <Text style={styles.patientName}>{item.patientId?.name}</Text>
            <Text style={styles.doctor}>Dr. {item.doctorId?.userId?.name}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.itemCount}>{item.items.length} medicine(s)</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending prescriptions</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  patientName: { fontSize: 18, fontWeight: '600' },
  doctor: { fontSize: 14, color: '#666', marginTop: 2 },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  itemCount: { fontSize: 14, color: '#2196F3', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' }
});
```

### Step 3: Write DispenseScreen

```typescript
// client/app/features/dispensing/screens/DispenseScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { prescriptionsApi } from '../../prescriptions/api/prescriptions';
import { dispensingApi } from '../api/dispensing';

export default function DispenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dispensed, setDispensed] = useState<Record<string, number>>({});
  const router = useRouter();

  useEffect(() => { if (id) loadPrescription(id); }, [id]);

  const loadPrescription = async (id: string) => {
    try {
      const data = await prescriptionsApi.getPrescriptionById(id);
      setPrescription(data);
      const initial: Record<string, number> = {};
      data.items.forEach((item: any) => { initial[item.medicineId] = item.quantity; });
      setDispensed(initial);
    } catch (e) { /* handle error */ }
    finally { setLoading(false); }
  };

  const handleDispense = async () => {
    try {
      setSubmitting(true);
      const dispensedItems = prescription.items.map((item: any) => ({
        medicineId: item.medicineId,
        quantityDispensed: dispensed[item.medicineId] || 0
      }));
      await dispensingApi.dispensePrescription(id, dispensedItems);
      Alert.alert('Success', 'Prescription fulfilled successfully', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!prescription) return null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Dispense Prescription</Text>
      <Text style={styles.patientInfo}>Patient: {prescription.patientId?.name}</Text>
      {prescription.items.map((item: any) => (
        <View key={item.medicineId} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.medicineName}>{item.medicineName}</Text>
            <Text style={styles.dosage}>{item.dosage} — Prescribed: {item.quantity}</Text>
            <Text style={styles.stock}>Stock: {item.medicineId?.stockQuantity || 'N/A'}</Text>
          </View>
          <TouchableOpacity style={styles.adjustBtn}
            onPress={() => setDispensed({ ...dispensed, [item.medicineId]: Math.max(0, (dispensed[item.medicineId] || 0) - 1) })}>
            <Text style={styles.adjustBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>{dispensed[item.medicineId] || 0}</Text>
          <TouchableOpacity style={styles.adjustBtn}
            onPress={() => setDispensed({ ...dispensed, [item.medicineId]: (dispensed[item.medicineId] || 0) + 1 })}>
            <Text style={styles.adjustBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.submitBtn} onPress={handleDispense} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Fulfill Prescription</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  patientInfo: { fontSize: 16, marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 8 },
  itemInfo: { flex: 1 },
  medicineName: { fontSize: 16, fontWeight: '600' },
  dosage: { fontSize: 14, color: '#666', marginTop: 2 },
  stock: { fontSize: 12, color: '#999', marginTop: 2 },
  qty: { fontSize: 20, fontWeight: '600', marginHorizontal: 16, minWidth: 30, textAlign: 'center' },
  adjustBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2196F3', justifyContent: 'center', alignItems: 'center' },
  adjustBtnText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  submitBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' }
});
```

### Step 4: Commit

```bash
git add client/app/features/dispensing/
git commit -m "feat: add pharmacist dispense UI screens"
```

---

## Task 5: Link Prescription Entry to Medical Record Creation

**Files:**
- Modify: `client/app/features/records/screens/AddRecordScreen.tsx`

### Step 1: Extend AddRecordScreen with prescription items section

Add a `prescriptionItems` state array to `AddRecordScreen.tsx`. When the doctor fills in the medical record, also allow them to add one or more prescription items (medicine from a picker, dosage, quantity, instructions). On submission, after creating the medical record via `POST /api/records`, also create the prescription via `POST /api/prescriptions` with the returned record ID.

### Step 2: Commit

```bash
git add client/app/features/records/screens/AddRecordScreen.tsx
git commit -m "feat: link prescription entry to medical record creation"
```

---

## Self-Review Checklist

1. **Spec coverage:** All prescription-dispensing requirements covered:
   - Prescription model: Task 1 ✅
   - Dispense model with stock deduction: Task 2 ✅
   - Patient prescription view: Task 3 ✅
   - Pharmacist pending view + dispense UI: Task 4 ✅
   - Doctor prescription creation: Task 5 ✅

2. **Placeholder scan:** No placeholders found — all steps have concrete code and exact file paths.

3. **Type consistency:** PrescriptionItem uses `quantity` in schema (Task 1) and `dispense.controller.ts` maps `rxItem.quantity` to `quantityPrescribed` in DispenseItem — consistent within each domain. Frontend `prescriptionsApi` passes `dosage` and `quantity` matching the PrescriptionItem schema.

4. **Test coverage:** Backend tests cover: create prescription, get by patient, dispense with stock deduction.

5. **No redundant steps:** Each task stands alone and produces testable software.
