import { Doctor } from '../../modules/doctors/doctor.model.js';

export async function findDoctorProfileByUserId(userId: string) {
  return Doctor.findOne({ userId }).populate('userId', 'name email phone dateOfBirth');
}

export async function findDoctorByUserId(userId: string) {
  return Doctor.findOne({ userId });
}