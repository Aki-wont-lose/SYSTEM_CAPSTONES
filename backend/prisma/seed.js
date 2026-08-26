// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  // Students sign in only via "Sign in with Google" or "Sign in with Microsoft"
  // (see googleAuthService.js / microsoftAuthService.js) — the password
  // column is NOT NULL on User, so these are just unusable placeholder
  // hashes; the password login endpoint rejects STUDENT accounts regardless
  // of what's stored here.
  const student1Password = await bcrypt.hash(crypto.randomUUID(), 10);
  const student2Password = await bcrypt.hash(crypto.randomUUID(), 10);

  // Admin
  await prisma.user.create({
    data: {
      email: 'admin@stamaria.sti.edu.ph',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('✓ Admin user created');

  // Coordinator & Supervisor (adviser 4-level: ADMIN, COORDINATOR, SUPERVISOR, STUDENT)
  const coordinatorPassword = await bcrypt.hash('Coordinator123!', 10);
  const supervisorPassword = await bcrypt.hash('Supervisor123!', 10);
  await prisma.user.create({
    data: { email: 'coordinator@stamaria.sti.edu.ph', password: coordinatorPassword, role: 'COORDINATOR', isActive: true }
  });
  await prisma.user.create({
    data: { email: 'supervisor@stamaria.sti.edu.ph', password: supervisorPassword, role: 'SUPERVISOR', isActive: true }
  });
  console.log('✓ Coordinator & Supervisor users created (COORDINATOR / SUPERVISOR)');

  // Student users (exactly the two specified accounts)
  const student1User = await prisma.user.create({
    data: {
      email: 'Cruz.352467@gmail.com',
      password: student1Password,
      role: 'STUDENT',
      isActive: true
    }
  });

  const student2User = await prisma.user.create({
    data: {
      email: 'Cabatu.334507@gmail.com',
      password: student2Password,
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
      course: 'BS Information Technology',
      section: 'IT-401',
      email: 'Cruz.352467@gmail.com',
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
      course: 'BS Information Technology',
      section: 'IT-401',
      email: 'Cabatu.334507@gmail.com',
      contactNumber: '09625780288',
      ojt_status: 'NOT_STARTED',
      requiredHours: 486,
      completedHours: 0
    }
  });
  console.log('✓ Student records created (both NOT_STARTED, no OJT progress yet)');

  // No attendance history seeded — neither student has started OJT yet.
  // Attendance records will be created naturally once they use Time In / Time Out.

  // Requirements (empty submissions, just the requirement definitions)
  await prisma.requirement.createMany({
    data: [
      { title: 'Endorsement Letter', description: 'Signed endorsement letter from the school.', isRequired: true },
      { title: 'Parent Consent Form', description: 'Signed by parent/guardian.', isRequired: true },
      { title: 'Medical Certificate', description: 'Fit-to-work medical certificate.', isRequired: true },
      { title: 'Resume', description: 'Updated resume/CV.', isRequired: false }
    ]
  });
  console.log('✓ Requirements created');

  // Partner Companies — sample OJT host companies near STI Sta. Maria, Bulacan,
  // with real coordinates so the Find Company map has something to pinpoint.
  await prisma.company.createMany({
    data: [
      {
        name: 'Sta. Maria Municipal Hall - IT Office',
        address: 'Poblacion, Sta. Maria, Bulacan',
        latitude: 14.8137,
        longitude: 120.9550,
        contactPerson: 'Engr. Ramon Dela Cruz',
        contactNumber: '09171234501',
        email: 'itoffice@stamaria.gov.ph',
        industryType: 'Local Government / IT Support',
        availableSlots: 3,
        status: 'ACTIVE'
      },
      {
        name: 'NORVERGENCE Data Solutions',
        address: 'McArthur Highway, Guyong, Sta. Maria, Bulacan',
        latitude: 14.8267,
        longitude: 120.9581,
        contactPerson: 'Ms. Ana Reyes',
        contactNumber: '09182345612',
        email: 'hr@norvergence.ph',
        industryType: 'Software Development',
        availableSlots: 2,
        status: 'ACTIVE'
      },
      {
        name: 'Bulacan Networks & Systems Inc.',
        address: 'Pulong Buhangin, Sta. Maria, Bulacan',
        latitude: 14.8355,
        longitude: 120.9660,
        contactPerson: 'Mr. Jerome Santos',
        contactNumber: '09193456723',
        email: 'careers@bulacannetworks.ph',
        industryType: 'IT Infrastructure & Networking',
        availableSlots: 0,
        status: 'ACTIVE'
      },
      {
        name: 'GreenLeaf BPO Services',
        address: 'San Jose Del Monte City, Bulacan',
        latitude: 14.8139,
        longitude: 121.0453,
        contactPerson: 'Ms. Carla Villanueva',
        contactNumber: '09204567834',
        email: 'internships@greenleafbpo.ph',
        industryType: 'Business Process Outsourcing',
        availableSlots: 5,
        status: 'ACTIVE'
      }
    ]
  });
  console.log('✓ Sample partner companies created (with map coordinates)');

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
  console.log('Admin:       admin@stamaria.sti.edu.ph / Admin123! ');
  console.log('Coordinator: coordinator@stamaria.sti.edu.ph / Coordinator123!');
  console.log('Supervisor:  supervisor@stamaria.sti.edu.ph / Supervisor123!');
  console.log('Student1: Cruz.352467@gmail.com (log in with "Log in with Student Account" -> Google)');
  console.log('Student2: Cabatu.334507@gmail.com (log in with "Log in with Student Account" -> Google)');
  console.log('\n(Student Google sign-in requires GOOGLE_CLIENT_ID to be set in backend/.env — see README "Google Sign-In Setup". Each student\'s real Google account email must exactly match the email above.)');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
