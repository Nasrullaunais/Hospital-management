import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { WardAssignment } from './wardAssignment.model.js';
import { User } from '../auth/auth.model.js';
import { Ward } from '../wards/ward.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

/** POST /api/assignments — Assign a patient to a bed (receptionist only) */
export const assignPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const { wardId, bedNumber, patientId, admissionDate, expectedDischarge, notes } = req.body;

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient) return next(new ApiError.notFound('Patient not found'));

    // Verify ward exists
    const ward = await Ward.findById(wardId);
    if (!ward) return next(new ApiError.notFound('Ward not found'));

    // Atomic check: fail if an active assignment already exists for this bed in this ward
    const existing = await WardAssignment.findOne({ wardId, bedNumber, status: 'active' });
    if (existing) {
      return next(new ApiError.conflict(`Bed ${bedNumber} in Ward ${ward.name} is already occupied`));
    }

    const assignment = await WardAssignment.create({
      wardId,
      patientId,
      bedNumber,
      admissionDate: new Date(admissionDate),
      expectedDischarge: expectedDischarge ? new Date(expectedDischarge) : undefined,
      notes,
      status: 'active',
    });

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

    const ward = await Ward.findById(wardId);
    if (!ward) return next(new ApiError.notFound('Ward not found'));

    const assignments = await WardAssignment.find({ wardId })
      .populate('patientId', 'name email phone dateOfBirth')
      .sort({ bedNumber: 1 });

    res.json({ success: true, data: { assignments, count: assignments.length } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/assignments/:id — Get a single assignment by ID (receptionist only) */
export const getAssignmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ApiError.badRequest('Invalid assignment ID'));
    }

    const assignment = await WardAssignment.findById(id)
      .populate('patientId', 'name email phone dateOfBirth')
      .populate('wardId', 'name type');

    if (!assignment) return next(new ApiError.notFound('Assignment not found'));

    // Verify patient is assigned to a ward (404 prevents info leakage)
    if (!assignment.wardId) return next(new ApiError.notFound('Patient is not assigned to any ward'));

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
      return next(new ApiError.badRequest('Invalid assignment ID'));
    }

    const assignment = await WardAssignment.findById(id);
    if (!assignment) return next(new ApiError.notFound('Assignment not found'));

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
      return next(new ApiError.badRequest('Invalid assignment ID'));
    }

    const assignment = await WardAssignment.findById(id);
    if (!assignment) return next(new ApiError.notFound('Assignment not found'));

    assignment.status = 'discharged';
    assignment.actualDischarge = new Date();
    await assignment.save();

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
        return next(new ApiError.badRequest('Invalid ward ID'));
      }
      filter.wardId = new mongoose.Types.ObjectId(wardId);
    }

    const [totalAssignments, activeAssignments, dischargedToday, upcomingDischarges, wards] = await Promise.all([
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
          $lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
          $gte: new Date(),
        },
      }),
      wardId ? Ward.findById(wardId) : Promise.resolve(null),
    ]);

    const totalBeds = wards ? wards.totalBeds : 0;
    const occupiedBeds = activeAssignments;

    res.json({
      success: true,
      data: {
        totalBeds,
        occupiedBeds,
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
        return next(new ApiError.badRequest('Invalid ward ID'));
      }
      const ward = await Ward.findById(wardId);
      if (!ward) return next(new ApiError.notFound('Ward not found'));
    }

    const activeAssignments = await WardAssignment.find({
      ...(wardId ? { wardId: new mongoose.Types.ObjectId(wardId) } : {}),
      status: 'active',
    }).populate<{ patientId: { _id: mongoose.Types.ObjectId; name: string } }>('patientId', 'name');

    const beds = activeAssignments.map((assignment) => ({
      bedNumber: assignment.bedNumber,
      status: 'occupied' as const,
      patientId: assignment.patientId?._id?.toString(),
      patientName: assignment.patientId?.name,
      admissionDate: assignment.admissionDate.toISOString(),
      expectedDischarge: assignment.expectedDischarge?.toISOString(),
    }));

    res.json({ success: true, data: { beds } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/assignments/ward/:wardId/patients — Get patient summaries for a ward (receptionist only) */
export const getWardPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wardId = req.params.wardId as string;

    if (!mongoose.Types.ObjectId.isValid(wardId)) {
      return next(new ApiError.badRequest('Invalid ward ID'));
    }

    const ward = await Ward.findById(wardId);
    if (!ward) return next(new ApiError.notFound('Ward not found'));

    const assignments = await WardAssignment.find({
      wardId: new mongoose.Types.ObjectId(wardId),
      status: 'active',
    })
      .populate<{ patientId: { _id: mongoose.Types.ObjectId; name: string } }>('patientId', 'name')
      .sort({ bedNumber: 1 });

    const patients = assignments.map((assignment) => ({
      patientId: assignment.patientId?._id?.toString(),
      patientName: assignment.patientId?.name,
      bedNumber: assignment.bedNumber,
      admissionDate: assignment.admissionDate.toISOString(),
      expectedDischarge: assignment.expectedDischarge?.toISOString(),
    }));

    res.json({ success: true, data: { patients } });
  } catch (err) {
    next(err);
  }
};
