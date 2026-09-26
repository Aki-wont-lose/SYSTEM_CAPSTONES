-- Templates: program filtering, deadlines, automated grading, weekly to-dos
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "program" TEXT;
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "cadence" TEXT DEFAULT 'ONCE';
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "dueInDays" INTEGER;
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "maxScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "autoGradeOnSubmit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Requirement_program_idx" ON "Requirement"("program");
CREATE INDEX IF NOT EXISTS "Requirement_dueDate_idx" ON "Requirement"("dueDate");

ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "score" INTEGER;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "isAutoGraded" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "WeeklyTask" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requirementId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyTask_studentId_requirementId_weekOf_key" ON "WeeklyTask"("studentId", "requirementId", "weekOf");
CREATE INDEX IF NOT EXISTS "WeeklyTask_studentId_idx" ON "WeeklyTask"("studentId");
CREATE INDEX IF NOT EXISTS "WeeklyTask_weekOf_idx" ON "WeeklyTask"("weekOf");
CREATE INDEX IF NOT EXISTS "WeeklyTask_status_idx" ON "WeeklyTask"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyTask_studentId_fkey') THEN
    ALTER TABLE "WeeklyTask" ADD CONSTRAINT "WeeklyTask_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyTask_requirementId_fkey') THEN
    ALTER TABLE "WeeklyTask" ADD CONSTRAINT "WeeklyTask_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
