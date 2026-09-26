-- Partner companies can target specific programs; empty list = open to all
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "programs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "Company_programs_idx" ON "Company" USING GIN ("programs");
