-- Microsoft/Google account linking so a SIMES user can sign in with an external identity
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LinkedAccountProvider') THEN
    CREATE TYPE "LinkedAccountProvider" AS ENUM ('MICROSOFT', 'GOOGLE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LinkedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "LinkedAccountProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LinkedAccount_provider_providerId_key" ON "LinkedAccount"("provider", "providerId");
CREATE INDEX IF NOT EXISTS "LinkedAccount_userId_idx" ON "LinkedAccount"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LinkedAccount_userId_fkey') THEN
    ALTER TABLE "LinkedAccount" ADD CONSTRAINT "LinkedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
