-- Staff (coordinator/supervisor/admin) name and contact details, previously accepted by Account Management but never stored
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contactNumber" TEXT;
