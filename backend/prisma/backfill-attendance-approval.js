// backend/prisma/backfill-attendance-approval.js
//
// One-time, idempotent data step for the supervisor-recorded attendance change.
//
// New rules: only APPROVED records with both a time in and a time out count
// toward Student.completedHours. Historic records were created by the old
// student-submit workflow, so a completed day may still sit in DRAFT, SUBMITTED
// or REJECTED. Without this backfill those hours would silently disappear from
// every student's total.
//
// What it does:
//   1. Every COMPLETE record (time in + time out) that is not REJECTED becomes
//      APPROVED. Existing reviewer stamps are preserved; a missing one is filled
//      with a clear "legacy" marker so the record stays traceable.
//   2. Incomplete or rejected records are left exactly as they are.
//   3. Student.completedHours is recomputed from the approved, complete records.
//
// Nothing is deleted. Safe to run more than once.
//
// Usage (from backend/):
//   node prisma/backfill-attendance-approval.js            # apply
//   node prisma/backfill-attendance-approval.js --dry-run  # report only

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

const main = async () => {
  console.log(`SIMES attendance approval backfill ${DRY_RUN ? '(DRY RUN)' : ''}`);

  const complete = await prisma.attendance.findMany({
    where: {
      timeIn: { not: null },
      timeOut: { not: null },
      reviewStatus: { not: 'APPROVED' }
    },
    select: {
      id: true,
      studentId: true,
      date: true,
      reviewStatus: true,
      reviewedById: true,
      reviewedByName: true
    },
    orderBy: { date: 'asc' }
  });

  const toApprove = complete.filter((record) => record.reviewStatus !== 'REJECTED');
  const skippedRejected = complete.length - toApprove.length;

  console.log(`  complete records not yet approved : ${complete.length}`);
  console.log(`  will be set to APPROVED           : ${toApprove.length}`);
  console.log(`  rejected records left untouched   : ${skippedRejected}`);

  if (!DRY_RUN && toApprove.length > 0) {
    const keepReviewed = toApprove.filter((record) => record.reviewedById || record.reviewedByName).map((r) => r.id);
    const markLegacy = toApprove.filter((record) => !record.reviewedById && !record.reviewedByName).map((r) => r.id);

    if (markLegacy.length > 0) {
      await prisma.attendance.updateMany({
        where: { id: { in: markLegacy } },
        data: {
          reviewStatus: 'APPROVED',
          reviewedByName: 'Legacy record (student-entered)',
          reviewedAt: new Date()
        }
      });
    }

    if (keepReviewed.length > 0) {
      await prisma.attendance.updateMany({
        where: { id: { in: keepReviewed } },
        data: { reviewStatus: 'APPROVED' }
      });
    }
  }

  // Recompute every student's total from the approved, complete records only.
  const students = await prisma.student.findMany({ select: { id: true, studentId: true } });
  let updatedStudents = 0;

  for (const student of students) {
    const totals = await prisma.attendance.aggregate({
      where: {
        studentId: student.id,
        reviewStatus: 'APPROVED',
        timeIn: { not: null },
        timeOut: { not: null }
      },
      _sum: { renderedHours: true }
    });

    const hours = Math.round(totals._sum.renderedHours || 0);

    if (!DRY_RUN) {
      await prisma.student.update({
        where: { id: student.id },
        data: { completedHours: hours }
      });
    }

    updatedStudents += 1;
    if (hours > 0) {
      console.log(`  ${student.studentId}: ${hours}h`);
    }
  }

  console.log(`  students recalculated             : ${updatedStudents}`);
  console.log(DRY_RUN ? 'Dry run finished. Nothing was written.' : 'Backfill finished.');
};

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
