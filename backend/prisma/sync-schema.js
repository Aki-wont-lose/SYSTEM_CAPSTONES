// backend/prisma/sync-schema.js - Idempotent schema sync for Supabase PostgreSQL
import 'dotenv/config';
import pg from 'pg';

const sql = `
-- 1. User: coordinatorSections
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "coordinatorSections" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Student: coordinatorId, internship dates, scheduleUpdatedAt
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "coordinatorId" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "internshipStartDate" TIMESTAMP(3);
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "internshipEndDate" TIMESTAMP(3);
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "scheduleUpdatedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Student_coordinatorId_idx" ON "Student"("coordinatorId");

-- 3. ScheduleLog table
CREATE TABLE IF NOT EXISTS "ScheduleLog" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "previousDays" TEXT,
  "previousHours" TEXT,
  "newDays" TEXT NOT NULL,
  "newHours" TEXT NOT NULL,
  "changedById" TEXT NOT NULL,
  "changedByRole" TEXT NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduleLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduleLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ScheduleLog_studentId_idx" ON "ScheduleLog"("studentId");
CREATE INDEX IF NOT EXISTS "ScheduleLog_createdAt_idx" ON "ScheduleLog"("createdAt");

-- 4. CompanyStatus enum values
DO $$ BEGIN
  ALTER TYPE "CompanyStatus" ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "CompanyStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "CompanyStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Company: academicYear, startDate, expirationDate, parentCompanyId
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "expirationDate" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "parentCompanyId" TEXT;
CREATE INDEX IF NOT EXISTS "Company_academicYear_idx" ON "Company"("academicYear");
CREATE INDEX IF NOT EXISTS "Company_expirationDate_idx" ON "Company"("expirationDate");
CREATE INDEX IF NOT EXISTS "Company_parentCompanyId_idx" ON "Company"("parentCompanyId");

-- 6. Requirement: assignedDate, dueTime
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "assignedDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "dueTime" TEXT;

-- 7. LogEntry: logType
ALTER TABLE "LogEntry" ADD COLUMN IF NOT EXISTS "logType" TEXT NOT NULL DEFAULT 'DAILY_LOG';
CREATE INDEX IF NOT EXISTS "LogEntry_logType_idx" ON "LogEntry"("logType");
`;

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log('✓ Database schema synced successfully.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Schema sync failed:', err.message);
  process.exit(1);
});
