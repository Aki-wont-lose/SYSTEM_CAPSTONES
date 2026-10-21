// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (order matters due to FKs)
  await prisma.logEntry.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.ojtHoursConfig.deleteMany();

  const adminPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin123!', 10);
  // Students sign in ONLY via "Sign in with Microsoft" (their school account), so
  // no password is stored for them — password: null, exactly like createStudent().

  // Admin
  await prisma.user.create({
    data: {
      email: 'mccruz1230@gmail.com',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('✓ Admin user created');

  // Coordinator & Supervisor - passwords from env or default (hidden from code view)
  const coordinatorPassword = await bcrypt.hash(process.env.SEED_COORDINATOR_PASSWORD || 'Coordinator123!', 10);
  const supervisorPassword = await bcrypt.hash(process.env.SEED_SUPERVISOR_PASSWORD || 'Supervisor123!', 10);
  await prisma.user.create({
    data: { email: 'coordinator@stamaria.sti.edu.ph', password: coordinatorPassword, role: 'COORDINATOR', isActive: true }
  });
  await prisma.user.create({
    data: { email: 'supervisor@stamaria.sti.edu.ph', password: supervisorPassword, role: 'SUPERVISOR', isActive: true }
  });
  console.log('✓ Coordinator & Supervisor users created (COORDINATOR / SUPERVISOR)');

  // Student users (exactly the two specified accounts) — Microsoft-only, no password
  const student1User = await prisma.user.create({
    data: {
      email: 'cruz.352467@stamaria.sti.edu.ph',
      password: null,
      role: 'STUDENT',
      isActive: true
    }
  });

  const student2User = await prisma.user.create({
    data: {
      email: 'cabatu.334507@stamaria.sti.edu.ph',
      password: null,
      role: 'STUDENT',
      isActive: true
    }
  });
  console.log('✓ Student users created');

  const student1 = await prisma.student.create({
    data: {
      userId: student1User.id,
      studentId: '352467',
      firstName: 'Marvin',
      lastName: 'Cruz',
      course: 'BSIT',
      section: 'BSIT 4-101',
      email: 'cruz.352467@stamaria.sti.edu.ph',
      contactNumber: '09694808531',
      ojt_status: 'NOT_STARTED',
      requiredHours: 486,
      completedHours: 0
    }
  });

  const student2 = await prisma.student.create({
    data: {
      userId: student2User.id,
      studentId: '334507',
      firstName: 'Wenzer',
      lastName: 'Cabatu',
      course: 'BSIT',
      section: 'BSIT 4-101',
      email: 'cabatu.334507@stamaria.sti.edu.ph',
      contactNumber: '09625780288',
      ojt_status: 'NOT_STARTED',
      requiredHours: 486,
      completedHours: 0
    }
  });
  console.log('✓ Student records created (both NOT_STARTED, no OJT progress yet)');

  // No attendance history seeded — neither student has started OJT yet.
  // Attendance records will be created naturally once they use Time In / Time Out.

  // Requirements - start empty now that PDF upload works (Coordinator/Admin adds templates via UI)
  // No seeded requirements; they are created via AdminRequirements > Add Requirement
  console.log('✓ Requirements skipped (start empty - add via UI)');

  // Partner Companies - start empty now that Add Company works (Admin/Coordinator adds via UI)
  // No sample companies seeded; they are added via Partner Companies > Add Company
  console.log('✓ Companies skipped (start empty - add via UI)');

// Default required OJT hours per course (admin-editable later)
const defaultHours = [
  { course: 'BSIT', requiredHours: 486 },
  { course: 'BSCS', requiredHours: 300 },
  { course: 'BSCPE', requiredHours: 300 },
  { course: 'BSACT', requiredHours: 320 },
  { course: 'BSHM', requiredHours: 600 },
  { course: 'BSTM', requiredHours: 600 },
  { course: 'BSAIS', requiredHours: 400 }
];
for (const h of defaultHours) {
  await prisma.ojtHoursConfig.create({ data: h });
}
console.log('OJT hours config created');

  // Announcements
  const now = new Date();
  await prisma.announcement.createMany({
    data: [
      {
        title: 'Welcome to SIMES',
        content: 'Welcome to the Student Internship Monitoring and Evaluation System. Track your OJT progress, submit requirements, and stay updated here.',
        category: 'General',
        priority: 'HIGH',
        isActive: true,
        publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Submit Your Requirements',
        content: 'Please upload your endorsement letter, parental consent, and medical certificate under the Requirements section before starting your OJT.',
        category: 'Academic',
        priority: 'URGENT',
        isActive: true,
        publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'DTR Reminder',
        content: 'Remember to Time In and Time Out daily using the camera verification feature under My DTR.',
        category: 'System',
        priority: 'NORMAL',
        isActive: true,
        publishedAt: new Date()
      }
    ]
  });
  console.log('✓ Announcements created');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📝 Accounts (4 levels):');
  console.log('Admin:       mccruz1230@gmail.com (Microsoft super-admin)');
  console.log('Coordinator: coordinator@stamaria.sti.edu.ph / Coordinator123!');
  console.log('Supervisor:  supervisor@stamaria.sti.edu.ph / Supervisor123!');
  console.log('Student1: cruz.352467@stamaria.sti.edu.ph (Microsoft-only, no password)');
  console.log('Student2: cabatu.334507@stamaria.sti.edu.ph (Microsoft-only, no password)');
  console.log('\n(Students sign in ONLY with "Sign in with Microsoft" using their school account. Each student\'s Microsoft email must match the email above.)');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
