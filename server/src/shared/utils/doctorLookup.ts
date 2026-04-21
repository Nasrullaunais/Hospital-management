import { Doctor } from '../../modules/doctors/doctor.model.js';
import { User } from '../../modules/auth/auth.model.js';

export async function findDoctorProfileByUserId(userId: string) {
  let doctor = await Doctor.collection.findOne({ userId }) as any;
  if (doctor) {
    return Doctor.findById(doctor._id).populate('userId', 'name email phone dateOfBirth');
  }
  const user = await User.findOne({ email: userId, role: 'doctor' });
  if (user) {
    const rawDoctor = await Doctor.collection.findOne({ userId: user._id.toString() }) as any;
    if (rawDoctor) {
      return Doctor.findById(rawDoctor._id).populate('userId', 'name email phone dateOfBirth');
    }
  }
  return null;
}

export async function findDoctorByUserId(userId: string) {
  return Doctor.findOne({ userId });
}