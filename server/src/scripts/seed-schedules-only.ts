/**
 * One-shot seed script — seeds DoctorSchedule collection for existing doctors.
 * Usage: cd server && bun run src/scripts/seed-schedules-only.ts
 */
import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://it24101774_db_user:hospital123@hospital-management-clu.0v47ubw.mongodb.net/?appName=hospital-management-cluster';

const DoctorSchema = new mongoose.Schema({}, { strict: false, collection: 'doctors' });
const Doctor = mongoose.model('DoctorQuick', DoctorSchema);

const ScheduleSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  weeklySlots: [{ dayOfWeek: Number, startTime: String, endTime: String, isActive: Boolean }],
  slotDuration: { type: Number, default: 30 },
  exceptions: [{ date: Date, isAvailable: Boolean, reason: String }],
}, { timestamps: true, collection: 'doctorschedules' });
const DoctorSchedule = mongoose.model('DoctorScheduleQuick', ScheduleSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const doctors = await Doctor.find({}).lean();
  console.log(`Found ${doctors.length} doctors`);

  if (doctors.length === 0) {
    console.log('No doctors found. Run reseed first.');
    process.exit(1);
  }

  const schedules = doctors.map((doc, i) => {
    const patterns = [
      { // Mon-Fri 9-17
        weeklySlots: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '15:00', isActive: true },
        ],
        slotDuration: 30,
      },
      { // Tue-Thu 10-18
        weeklySlots: [
          { dayOfWeek: 2, startTime: '10:00', endTime: '18:00', isActive: true },
          { dayOfWeek: 3, startTime: '10:00', endTime: '18:00', isActive: true },
          { dayOfWeek: 4, startTime: '10:00', endTime: '18:00', isActive: true },
        ],
        slotDuration: 30,
      },
      { // Mon/Wed/Fri 10-16
        weeklySlots: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '16:00', isActive: true },
          { dayOfWeek: 3, startTime: '10:00', endTime: '16:00', isActive: true },
          { dayOfWeek: 5, startTime: '10:00', endTime: '14:00', isActive: true },
        ],
        slotDuration: 45,
      },
      { // Mon-Sat 8-14
        weeklySlots: [
          { dayOfWeek: 1, startTime: '08:00', endTime: '14:00', isActive: true },
          { dayOfWeek: 2, startTime: '08:00', endTime: '14:00', isActive: true },
          { dayOfWeek: 3, startTime: '08:00', endTime: '14:00', isActive: true },
          { dayOfWeek: 4, startTime: '08:00', endTime: '14:00', isActive: true },
          { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', isActive: true },
          { dayOfWeek: 6, startTime: '09:00', endTime: '12:00', isActive: true },
        ],
        slotDuration: 30,
      },
      { // Mon-Fri 8-16
        weeklySlots: [
          { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', isActive: true },
          { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', isActive: true },
          { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', isActive: true },
          { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', isActive: true },
          { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', isActive: true },
        ],
        slotDuration: 30,
      },
    ];

    return {
      doctorId: doc._id,
      weeklySlots: patterns[i % patterns.length].weeklySlots,
      slotDuration: patterns[i % patterns.length].slotDuration,
      exceptions: [],
    };
  });

  await DoctorSchedule.deleteMany({});
  await DoctorSchedule.insertMany(schedules);
  console.log(`Seeded ${schedules.length} doctor schedules`);

  // Verify
  const count = await DoctorSchedule.countDocuments();
  console.log(`Verification: ${count} schedules in DB`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(console.error);
