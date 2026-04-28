import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { WardAssignment } from './wardAssignment.model.js';
import { User } from '../auth/auth.model.js';
import { Ward } from '../wards/ward.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { MS_PER_DAY } from '../../shared/constants/time.js';

// Typed interfaces for populate results
interface PopulatedWard {
  _id: mongoose.Types.ObjectId;
  name: string;
  type?: string;
}

interface PopulatedPatient {
  _id: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  bloodType?: string;
  diagnosis?: string;
}

/** POST /api/assignments — Assign a patient to a bed (receptionist only) */
export const assignPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    const { wardId, bedNumber, patientId, admissionDate, expectedDischarge, notes } = req.body;

    const [patient, ward] = await Promise.all([
      User.findById(patientId),
      Ward.findById(wardId),
    ]);
    if (!patient) return next(ApiError.notFound('Patient not found'));
    if (!ward) return next(ApiError.notFound('Ward not found'));

    const existingAssignment = await WardAssignment.findOne({
      patientId,
      status: 'active',
    });
    if (existingAssignment) {
      return next(ApiError.conflict('Patient already has an active ward assignment'));
    }

    if (ward.currentOccupancy >= ward.totalBeds) {
      return next(ApiError.conflict(`Ward ${ward.name} is at full capacity (${ward.currentOccupancy}/${ward.totalBeds} beds)`));
    }

    const assignment = await WardAssignment.findOneAndUpdate(
      { wardId, bedNumber, status: 'active' },
      {
        $setOnInsert: {
          wardId,
          patientId,
          bedNumber,
          admissionDate: new Date(admissionDate),
          expectedDischarge: expectedDischarge ? new Date(expectedDischarge) : undefined,
          notes,
          assignedBy: new mongoose.Types.ObjectId(userId),
          assignedDate: new Date(),
          status: 'active',
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    if (!assignment.assignedDate || assignment.status !== 'active') {
      return next(ApiError.conflict(`Bed ${bedNumber} in Ward ${ward.name} is already occupied`));
    }

    await Ward.findByIdAndUpdate(wardId, { $inc: { currentOccupancy: 1 } });

    res.status(201).json({ success: true, message: 'Patient assigned to bed', data: { assignment } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/assignments/ward/:wardId — List all assignments for a ward (receptionist only) */
export const getWardAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const wardId = req.params.wardId as string;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;

    const ward = await Ward.findById(wardId);
    if (!ward) return next(ApiError.notFound('Ward not found'));

    const [assignments, totalCount] = await Promise.all([
      WardAssignment.find({ wardId })
        .populate('patientId', 'name email phone dateOfBirth')
        .sort({ bedNumber: 1 })
        .skip(skip)
        .limit(limit),
      WardAssignment.countDocuments({ wardId }),
    ]);

    res.json({ success: true, data: { assignments, count: assignments.length, totalCount } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/assignments/:id — Get a single assignment by ID (receptionist only) */
export const getAssignmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(ApiError.badRequest('Invalid assignment ID'));
    }

    const assignment = await WardAssignment.findById(id)
      .populate('patientId', 'name email phone dateOfBirth')
      .populate('wardId', 'name type');

    if (!assignment) return next(ApiError.notFound('Assignment not found'));

    // Verify patient is assigned to a ward (404 prevents info leakage)
    if (!assignment.wardId) return next(ApiError.notFound('Patient is not assigned to any ward'));

    res.json({ success: true, data: { assignment } });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/assignments/:id — Update notes, expectedDischarge, or status (receptionist only) */
export const updateAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(ApiError.badRequest('Invalid assignment ID'));
    }

    const assignment = await WardAssignment.findById(id);
    if (!assignment) return next(ApiError.notFound('Assignment not found'));

    if (req.body.notes !== undefined) assignment.notes = req.body.notes;
    if (req.body.expectedDischarge !== undefined) assignment.expectedDischarge = new Date(req.body.expectedDischarge);
    if (req.body.status !== undefined) assignment.status = req.body.status;

    await assignment.save();

    const updated = await WardAssignment.findById(assignment._id)
      .populate('patientId', 'name email phone dateOfBirth')
      .populate('wardId', 'name type');

    res.json({ success: true, message: 'Assignment updated', data: { assignment: updated } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/assignments/:id — Discharge a patient (receptionist only) */
export const dischargePatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(ApiError.badRequest('Invalid assignment ID'));
    }

    const assignment = await WardAssignment.findById(id);
    if (!assignment) return next(ApiError.notFound('Assignment not found'));

    if (assignment.status !== 'active') {
      return next(ApiError.badRequest(`Assignment is already '${assignment.status}' and cannot be discharged`));
    }

    assignment.status = 'discharged';
    assignment.actualDischarge = new Date();
    await assignment.save();

    await Ward.findByIdAndUpdate(assignment.wardId, { $inc: { currentOccupancy: -1 } });

    const updated = await WardAssignment.findById(assignment._id)
      .populate('patientId', 'name email phone dateOfBirth')
      .populate('wardId', 'name type');

    res.json({ success: true, message: 'Patient discharged', data: { assignment: updated } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/assignments/stats — Get ward assignment statistics (receptionist only) */
export const getWardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wardId = req.query.wardId as string | undefined;

    const filter: Record<string, unknown> = {};
    if (wardId) {
      if (!mongoose.Types.ObjectId.isValid(wardId)) {
        return next(ApiError.badRequest('Invalid ward ID'));
      }
      filter.wardId = new mongoose.Types.ObjectId(wardId);
    }

    const [totalAssignments, activeAssignments, dischargedToday, upcomingDischarges, wardsWithBeds] = await Promise.all([
      WardAssignment.countDocuments(filter),
      WardAssignment.countDocuments({ ...filter, status: 'active' }),
      WardAssignment.countDocuments({
        ...filter,
        status: 'discharged',
        actualDischarge: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      WardAssignment.countDocuments({
        ...filter,
        status: 'active',
        expectedDischarge: {
          $lte: new Date(Date.now() + MS_PER_DAY),
          $gte: new Date(),
        },
      }),
      wardId
        ? Ward.findById(wardId).then(w => (w ? [w] : []))
        : Ward.find().then(ws => ws),
    ]);

    const totalBeds = wardsWithBeds.reduce((sum, w) => sum + (w.totalBeds || 0), 0);
    const occupiedBeds = activeAssignments;
    const vacantBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const totalWards = wardsWithBeds.length;

    res.json({
      success: true,
      data: {
        totalWards,
        totalBeds,
        occupiedBeds,
        vacantBeds,
        occupancyRate,
        activeAssignments,
        dischargedToday,
        upcomingDischarges,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/assignments/bed-statuses — Get all bed statuses for a ward (receptionist only) */
export const getBedStatuses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wardId = req.query.wardId as string | undefined;

    if (wardId) {
      if (!mongoose.Types.ObjectId.isValid(wardId)) {
        return next(ApiError.badRequest('Invalid ward ID'));
      }
      const ward = await Ward.findById(wardId);
      if (!ward) return next(ApiError.notFound('Ward not found'));
    }

    const wards = wardId
      ? await Ward.find({ _id: new mongoose.Types.ObjectId(wardId) })
      : await Ward.find();

    const wardFilter = wardId ? { wardId: new mongoose.Types.ObjectId(wardId) } : {};
    const activeAssignments = await WardAssignment.find({
      ...wardFilter,
      status: 'active',
    }).populate<{ patientId: PopulatedPatient }>('patientId', 'name');

    // Build a map: wardId -> bedNumber -> assignment (for occupied beds)
    const assignmentMap = new Map<string, typeof activeAssignments[0] | undefined>();
    for (const assignment of activeAssignments) {
      const key = `${assignment.wardId.toString()}:${assignment.bedNumber}`;
      assignmentMap.set(key, assignment);
    }

    const beds: Array<{
      _id: string;
      bedId: string;
      wardId: string;
      wardName: string;
      bedNumber: number;
      status: 'occupied' | 'vacant' | 'reserved' | 'maintenance';
      patientId?: string;
      patientName?: string;
      admissionDate?: string;
      expectedDischarge?: string;
    }> = [];

    for (const ward of wards) {
      for (let bedNumber = 1; bedNumber <= ward.totalBeds; bedNumber++) {
        const key = `${ward._id.toString()}:${bedNumber}`;
        const assignment = assignmentMap.get(key);

        if (assignment) {
          beds.push({
            _id: ward._id.toString(),
            bedId: assignment._id.toString(),
            wardId: ward._id.toString(),
            wardName: ward.name,
            bedNumber,
            status: 'occupied',
            patientId: assignment.patientId?._id?.toString(),
            patientName: assignment.patientId?.name,
            admissionDate: assignment.admissionDate.toISOString(),
            expectedDischarge: assignment.expectedDischarge?.toISOString(),
          });
        } else {
          const vacantStatus: 'vacant' | 'reserved' | 'maintenance' =
            ward.status === 'maintenance' ? 'maintenance' : 'vacant';
          beds.push({
            _id: ward._id.toString(),
            bedId: '',
            wardId: ward._id.toString(),
            wardName: ward.name,
            bedNumber,
            status: vacantStatus,
          });
        }
      }
    }

    res.json({ success: true, data: { beds } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/assignments/ward/:wardId/patients — Get patient summaries for a ward (receptionist only) */
export const getWardPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wardId = req.params.wardId as string;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!mongoose.Types.ObjectId.isValid(wardId)) {
      return next(ApiError.badRequest('Invalid ward ID'));
    }

    const ward = await Ward.findById(wardId);
    if (!ward) return next(ApiError.notFound('Ward not found'));

    const [assignments, totalCount] = await Promise.all([
      WardAssignment.find({
        wardId: new mongoose.Types.ObjectId(wardId),
        status: 'active',
      })
        .populate<{ patientId: { _id: mongoose.Types.ObjectId; name: string; dateOfBirth?: Date; phone?: string; gender?: string; bloodType?: string; diagnosis?: string } }>(
          'patientId',
          'name dateOfBirth phone gender bloodType diagnosis',
        )
        .sort({ bedNumber: 1 })
        .skip(skip)
        .limit(limit),
      WardAssignment.countDocuments({
        wardId: new mongoose.Types.ObjectId(wardId),
        status: 'active',
      }),
    ]);

    const patients = assignments.map((assignment) => ({
      _id: assignment.patientId?._id?.toString(),
      name: assignment.patientId?.name || '',
      dateOfBirth: assignment.patientId?.dateOfBirth?.toISOString(),
      phone: assignment.patientId?.phone,
      gender: assignment.patientId?.gender,
      bloodType: assignment.patientId?.bloodType,
      diagnosis: assignment.patientId?.diagnosis,
      admissionDate: assignment.admissionDate.toISOString(),
      wardId: wardId,
      wardName: ward.name,
      bedId: assignment._id.toString(),
      bedNumber: assignment.bedNumber,
    }));

    res.json({ success: true, data: { patients, count: patients.length, totalCount } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/assignments/patient/:patientId — Get a patient by patientId (receptionist only) */
export const getPatientById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patientId = req.params.patientId as string;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return next(ApiError.badRequest('Invalid patient ID'));
    }

    const assignment = await WardAssignment.findOne({
      patientId: new mongoose.Types.ObjectId(patientId),
      status: 'active',
    })
      .populate<{ patientId: PopulatedPatient }>('patientId', 'name email phone dateOfBirth gender bloodType diagnosis')
      .populate<{ wardId: PopulatedWard }>('wardId', 'name type');

    if (!assignment) return next(ApiError.notFound('Patient not found'));

    const patientData = {
      _id: (assignment.patientId as PopulatedPatient | null)?._id?.toString(),
      name: (assignment.patientId as PopulatedPatient | null)?.name || '',
      email: (assignment.patientId as PopulatedPatient | null)?.email || '',
      phone: (assignment.patientId as PopulatedPatient | null)?.phone,
      dateOfBirth: (assignment.patientId as PopulatedPatient | null)?.dateOfBirth?.toISOString(),
      gender: (assignment.patientId as PopulatedPatient | null)?.gender,
      bloodType: (assignment.patientId as PopulatedPatient | null)?.bloodType,
      diagnosis: (assignment.patientId as PopulatedPatient | null)?.diagnosis,
      wardId: assignment.wardId?.toString(),
      wardName: (assignment.wardId as PopulatedWard | null)?.name || '',
      wardType: (assignment.wardId as PopulatedWard | null)?.type || '',
      bedId: assignment._id.toString(),
      bedNumber: assignment.bedNumber,
      admissionDate: assignment.admissionDate.toISOString(),
      expectedDischarge: assignment.expectedDischarge?.toISOString(),
      status: assignment.status,
    };

    res.json({ success: true, data: { patient: patientData } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/assignments/patients — Get all patients with optional pagination (receptionist only) */
export const getAllPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;
    const wardId = req.query.wardId as string | undefined;

    const filter: Record<string, unknown> = { status: 'active' };
    if (wardId) {
      if (!mongoose.Types.ObjectId.isValid(wardId)) {
        return next(ApiError.badRequest('Invalid ward ID'));
      }
      filter.wardId = new mongoose.Types.ObjectId(wardId);
    }

    const [assignments, totalCount] = await Promise.all([
      WardAssignment.find(filter)
      .populate<{ patientId: PopulatedPatient }>('patientId', 'name email phone dateOfBirth gender bloodType diagnosis')
      .populate<{ wardId: PopulatedWard }>('wardId', 'name type')
        .sort({ admissionDate: -1 })
        .skip(skip)
        .limit(limit),
      WardAssignment.countDocuments(filter),
    ]);

    const patients = assignments.map((assignment) => ({
      _id: (assignment.patientId as PopulatedPatient | null)?._id?.toString(),
      name: (assignment.patientId as PopulatedPatient | null)?.name || '',
      email: (assignment.patientId as PopulatedPatient | null)?.email || '',
      phone: (assignment.patientId as PopulatedPatient | null)?.phone,
      dateOfBirth: (assignment.patientId as PopulatedPatient | null)?.dateOfBirth?.toISOString(),
      gender: (assignment.patientId as PopulatedPatient | null)?.gender,
      bloodType: (assignment.patientId as PopulatedPatient | null)?.bloodType,
      diagnosis: (assignment.patientId as PopulatedPatient | null)?.diagnosis,
      wardId: assignment.wardId?.toString(),
      wardName: (assignment.wardId as PopulatedWard | null)?.name || '',
      wardType: (assignment.wardId as PopulatedWard | null)?.type || '',
      bedId: assignment._id.toString(),
      bedNumber: assignment.bedNumber,
      admissionDate: assignment.admissionDate.toISOString(),
      expectedDischarge: assignment.expectedDischarge?.toISOString(),
    }));

    res.json({ success: true, data: { patients, count: patients.length, totalCount } });
  } catch (err) {
    next(err);
  }
};
