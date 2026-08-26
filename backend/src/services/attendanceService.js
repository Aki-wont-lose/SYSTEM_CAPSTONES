// src/services/attendanceService.js
import { PrismaClient } from '@prisma/client';

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
      remainingHours: Math.max(0, student.requiredHours - Math.round(totalHours))
    }
  };
};
