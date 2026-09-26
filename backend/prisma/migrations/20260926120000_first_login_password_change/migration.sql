-- First-login password change: admin-issued accounts start with a temporary password
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Password is optional so Microsoft/Google-only student accounts can exist without one
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
