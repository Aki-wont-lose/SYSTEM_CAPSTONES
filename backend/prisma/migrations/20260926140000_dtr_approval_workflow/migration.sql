-- DTR approval workflow: student submits a day for review, staff approves or rejects
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DtrReviewStatus') THEN
    CREATE TYPE "DtrReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
  END IF;
END $$;

ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "reviewStatus" "DtrReviewStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "reviewRemarks" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "reviewedByName" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Attendance_reviewStatus_idx" ON "Attendance"("reviewStatus");
CREATE INDEX IF NOT EXISTS "Attendance_date_reviewStatus_idx" ON "Attendance"("date", "reviewStatus");
