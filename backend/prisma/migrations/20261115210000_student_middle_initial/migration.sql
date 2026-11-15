-- Add optional middleInitial to Student model for student accounts and document templates
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "middleInitial" TEXT;
