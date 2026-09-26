// src/services/attendanceService.js
import { PrismaClient } from '@prisma/client';
import { recordAudit } from './auditLogService.js';

const prisma = new PrismaClient();

// Returns a Date representing midnight UTC of the given date's LOCAL
// calendar day (Y/M/D from the server's local timezone). Passing a plain
// JS Date through `.setHours(0,0,0,0)` and letting Prisma serialize it for
// a `@db.Date` column is ambiguous — Prisma/MySQL ultimately store the UTC
// Y-M-D, which can silently roll back a day for timezones ahead of UTC
// (e.g. Philippines, UTC+8) around local midnight. Building the UTC date
// explicitly from the local Y/M/D avoids that off-by-one entirely.
const toLocalDateOnly = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

export const getAttendanceHistory = async (studentId, limit = 30) => {
  return prisma.attendance.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
    take: limit
  });
};

export const getAttendanceByDate = async (studentId, date) => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return prisma.attendance.findFirst({
    where: {
      studentId,
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  });
};

export const recordTimeIn = async (studentId, date, photo) => {
  try {
    if (!photo) {
      const error = new Error('Camera photo verification is required to time in');
      error.status = 400;
      throw error;
    }

    const today = toLocalDateOnly(date);

    // Check if record already exists
    let attendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        date: today
      }
    });

    if (!attendance) {
      // Create new record
      attendance = await prisma.attendance.create({
        data: {
          studentId,
          date: today,
          timeIn: new Date(),
          timeInPhoto: photo,
          status: 'PRESENT'
        }
      });
    } else if (!attendance.timeIn) {
      // Update existing record with time in
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          timeIn: new Date(),
          timeInPhoto: photo,
          status: 'PRESENT'
        }
      });
    } else {
      const error = new Error('Already timed in for today');
      error.status = 400;
      throw error;
    }

    return attendance;
  } catch (error) {
    throw error;
  }
};

export const recordTimeOut = async (studentId, date, photo) => {
  try {
    if (!photo) {
      const error = new Error('Camera photo verification is required to time out');
      error.status = 400;
      throw error;
    }

    const today = toLocalDateOnly(date);

    const attendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        date: today
      }
    });

    if (!attendance || !attendance.timeIn) {
      const error = new Error('No time in record found for today');
      error.status = 400;
      throw error;
    }

    if (attendance.timeOut) {
      const error = new Error('Already timed out for today');
      error.status = 400;
      throw error;
    }

    const timeOut = new Date();
    const timeIn = new Date(attendance.timeIn);
    
    // Calculate rendered hours
    const diffMs = timeOut - timeIn;
    const diffHours = diffMs / (1000 * 60 * 60);
    const renderedHours = Math.max(0, diffHours);

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        timeOut,
        timeOutPhoto: photo,
        renderedHours: parseFloat(renderedHours.toFixed(2))
      }
    });

    // Update student's completed hours
    const totalHours = await prisma.attendance.aggregate({
      where: { studentId },
      _sum: { renderedHours: true }
    });

    await prisma.student.update({
      where: { id: studentId },
      data: {
        completedHours: Math.round(totalHours._sum.renderedHours || 0)
      }
    });

    return updatedAttendance;
  } catch (error) {
    throw error;
  }
};

export const updateAttendanceRecord = async (attendanceId, updateData) => {
  try {
    // Recalculate hours if timeIn or timeOut changed
    let renderedHours = undefined;
    
    if ((updateData.timeIn || updateData.timeOut)) {
      const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId }
      });

      const timeIn = updateData.timeIn ? new Date(updateData.timeIn) : new Date(attendance.timeIn);
      const timeOut = updateData.timeOut ? new Date(updateData.timeOut) : new Date(attendance.timeOut);

      if (timeIn && timeOut) {
        const diffMs = timeOut - timeIn;
        const diffHours = diffMs / (1000 * 60 * 60);
        renderedHours = parseFloat(Math.max(0, diffHours).toFixed(2));
      }
    }

    const updatePayload = { ...updateData };
    if (renderedHours !== undefined) {
      updatePayload.renderedHours = renderedHours;
    }

    // Changing the times invalidates a previous decision, so send it back to draft
    if (updatePayload.timeIn !== undefined || updatePayload.timeOut !== undefined) {
      updatePayload.reviewStatus = 'DRAFT';
      updatePayload.submittedAt = null;
      updatePayload.reviewedAt = null;
      updatePayload.reviewedById = null;
      updatePayload.reviewedByName = null;
      updatePayload.reviewRemarks = null;
    }

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: updatePayload
    });

    // Recalculate student hours
    const totalHours = await prisma.attendance.aggregate({
      where: { studentId: updated.studentId },
      _sum: { renderedHours: true }
    });

    await prisma.student.update({
      where: { id: updated.studentId },
      data: {
        completedHours: Math.round(totalHours._sum.renderedHours || 0)
      }
    });

    return updated;
  } catch (error) {
    throw error;
  }
};

export const getMonthlyAttendance = async (studentId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return prisma.attendance.findMany({
    where: {
      studentId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { date: 'asc' }
  });
};

export const getStudentSummary = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  const attendance = await prisma.attendance.findMany({
    where: { studentId }
  });

  const totalHours = attendance.reduce((sum, rec) => sum + rec.renderedHours, 0);
  const presentDays = attendance.filter(rec => rec.status === 'PRESENT').length;
  const absentDays = attendance.filter(rec => rec.status === 'ABSENT').length;
  const lateDays = attendance.filter(rec => rec.status === 'LATE').length;

  return {
    student,
    attendance: {
      totalRecords: attendance.length,
      totalHours: Math.round(totalHours),
      presentDays,
      absentDays,
      lateDays,
      remainingHours: Math.max(0, student.requiredHours - Math.round(totalHours)),
      review: {
        draft: attendance.filter((rec) => rec.reviewStatus === 'DRAFT').length,
        submitted: attendance.filter((rec) => rec.reviewStatus === 'SUBMITTED').length,
        approved: attendance.filter((rec) => rec.reviewStatus === 'APPROVED').length,
        rejected: attendance.filter((rec) => rec.reviewStatus === 'REJECTED').length
      }
    }
  };
};

const REVIEW_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'REJECTED', 'DRAFT'],
  REJECTED: ['DRAFT'],
  APPROVED: ['DRAFT']
};

export const canTransitionReview = (from, to) => (REVIEW_TRANSITIONS[from] || []).includes(to);

// Student locks a finished day and sends it to the supervisor for approval
export const submitDtrForReview = async (attendanceId, studentId) => {
  const record = await prisma.attendance.findUnique({ where: { id: attendanceId } });
  if (!record || record.studentId !== studentId) {
    const error = new Error('DTR record not found');
    error.status = 404;
    throw error;
  }

  if (!record.timeIn || !record.timeOut) {
    const error = new Error('Time in and time out are both required before submitting');
    error.status = 400;
    throw error;
  }

  if (record.reviewStatus === 'APPROVED') {
    const error = new Error('This DTR is already approved');
    error.status = 400;
    throw error;
  }

  if (record.reviewStatus === 'SUBMITTED') {
    const error = new Error('This DTR is already awaiting review');
    error.status = 400;
    throw error;
  }

  return prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      reviewStatus: 'SUBMITTED',
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      reviewedByName: null,
      reviewRemarks: null
    }
  });
};

// Supervisor / Coordinator / Admin approves or rejects a submitted DTR
export const reviewDtr = async (attendanceId, reviewer, status, remarks) => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    const error = new Error('Status must be APPROVED or REJECTED');
    error.status = 400;
    throw error;
  }

  if (status === 'REJECTED' && !remarks) {
    const error = new Error('A reason is required when rejecting a DTR');
    error.status = 400;
    throw error;
  }

  const record = await prisma.attendance.findUnique({ where: { id: attendanceId } });
  if (!record) {
    const error = new Error('DTR record not found');
    error.status = 404;
    throw error;
  }

  if (!canTransitionReview(record.reviewStatus, status)) {
    const error = new Error(
      record.reviewStatus === 'SUBMITTED'
        ? 'This DTR was already reviewed'
        : 'Only a submitted DTR can be reviewed'
    );
    error.status = 400;
    throw error;
  }

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      reviewStatus: status,
      reviewRemarks: remarks ? String(remarks) : null,
      reviewedById: reviewer?.userId || null,
      reviewedByName: reviewer ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || reviewer.email || 'Staff' : null,
      reviewedAt: new Date()
    }
  });

  await recordAudit({
    userId: reviewer?.userId || null,
    userEmail: reviewer?.email || null,
    userRole: reviewer?.role || null,
    action: 'REVIEW',
    entity: 'Attendance',
    entityId: attendanceId,
    description: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} the DTR for ${record.date}${remarks ? ` — ${String(remarks).slice(0, 160)}` : ''}`,
    metadata: { status, date: record.date, studentId: record.studentId },
  });

  return updated;
};

// Staff review queue: submitted DTRs awaiting a decision, newest first
export const getDtrReviewQueue = async (filters = {}) => {
  const where = {};
  if (filters.status) where.reviewStatus = filters.status;
  else where.reviewStatus = 'SUBMITTED';
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.course) where.student = { course: filters.course };
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) where.date.lte = new Date(filters.to);
  }

  const records = await prisma.attendance.findMany({
    where,
    include: {
      student: { select: { id: true, studentId: true, firstName: true, lastName: true, course: true, section: true } }
    },
    orderBy: [{ date: 'desc' }],
    take: Math.min(parseInt(filters.limit) || 100, 500)
  });

  const grouped = records.reduce((acc, record) => {
    const key = record.studentId;
    if (!acc[key]) {
      acc[key] = {
        studentId: record.student.id,
        studentNumber: record.student.studentId,
        name: `${record.student.firstName} ${record.student.lastName}`,
        course: record.student.course,
        section: record.student.section,
        submitted: 0,
        approved: 0,
        rejected: 0,
        draft: 0,
        hours: 0,
        oldest: null
      };
    }
    const entry = acc[key];
    if (record.reviewStatus === 'SUBMITTED') entry.submitted += 1;
    if (record.reviewStatus === 'APPROVED') entry.approved += 1;
    if (record.reviewStatus === 'REJECTED') entry.rejected += 1;
    if (record.reviewStatus === 'DRAFT') entry.draft += 1;
    entry.hours += record.renderedHours;
    if (!entry.oldest || record.date < new Date(entry.oldest)) entry.oldest = record.date;
    return acc;
  }, {});

  return {
    total: records.length,
    records,
    byStudent: Object.values(grouped)
  };
};

// Editing a DTR after review sends it back to draft so it can be resubmitted
export const reopenDtr = async (attendanceId) =>
  prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      reviewStatus: 'DRAFT',
      submittedAt: null,
      reviewedAt: null,
      reviewedById: null,
      reviewedByName: null,
      reviewRemarks: null
    }
  });
