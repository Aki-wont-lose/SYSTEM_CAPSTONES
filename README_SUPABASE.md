# SYSTEM_CAPSTONE_SUPABASE - Deploy Ready

Copy of SYSTEM_CAPSTONE but using Supabase PostgreSQL instead of local MySQL.

## What changed
- `backend/prisma/schema.prisma` provider `mysql` -> `postgresql`, `@db.LongText` -> `@db.Text`
- `backend/.env` DATABASE_URL now expects `postgresql://...` (Supabase pooled connection)

## 1. Create Supabase project
1. Go to supabase.com -> New project (free)
2. Project Settings -> Database -> Connection string -> **Pooled** (port 6543) -> copy
3. Paste into `backend/.env` as DATABASE_URL
   Example: `DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"`

## 2. Run locally with Supabase
```powershell
cd backend
npm install
npx prisma db push --accept-data-loss
node prisma/seed.js
npm run dev

# new terminal
cd frontend
npm install
npm run dev
```

## 3. Deploy
- Push to GitHub
- Frontend -> Vercel (root `frontend`)
  Env: `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`
- Backend -> Render or Vercel (root `backend`)
  Env: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `CORS_ORIGIN=https://your-frontend.vercel.app`
  Build cmd: `npm install && npx prisma generate`
