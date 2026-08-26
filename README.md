# SIMES — Student Internship Monitoring and Evaluation System
### STI College Sta. Maria

A full-stack web app for tracking OJT (On-the-Job Training) progress, attendance (with camera-verified DTR), requirements submission, partner companies, and announcements — with separate Admin and Student roles.

**Stack:** React (Vite) + Tailwind CSS · Node.js + Express · MySQL + Prisma ORM · JWT + bcrypt

---

## What's included in this version

- **Two-choice login** — the login screen asks "Log in with Student Account" or "Log in with Admin," nothing else.
  - **Students** sign in via **Sign in with Google** and/or **Sign in with Microsoft**, using their real STI-issued account — no password field exists for students at all. Google is meant as the interim option while STI's IT department finishes provisioning student Microsoft/Office 365 accounts; Microsoft can be switched on later with zero code changes, just filling in its Client ID.
  - **Admin** signs in with a plain email + password.
  - This split is enforced on the backend too, not just hidden in the UI: the password-login endpoint rejects Student accounts outright, and the Google/Microsoft endpoints reject the Admin account outright.
- **Forgot password** — self-service reset flow (Admin only, since that's the only account using a password)
- **Light/dark theme toggle** — saved per account
- **Student side:** Dashboard, My DTR (camera-verified time in/out), My Logs (daily task journal with admin approval), Requirements (document upload), Find Company (map of available partner companies), Schedule (assigned company/supervisor), Profile
- **Admin side:** Dashboard, Student Management, Requirements (define + review submissions), Partner Companies (with click-to-pin map location), Student Logs (review/approve/assign tasks), Announcements, Profile

> **Google/Microsoft sign-in only work for emails that already have a student record in SIMES** (added via Student Management, or Cruz/Cabatu from the seed data). They deliberately won't auto-create a new account — a real student profile needs to exist first. Until at least one of `GOOGLE_CLIENT_ID` / `MS_CLIENT_ID` is configured (see Sections 3.5–3.6), the Student Account option will show a warning — students genuinely can't get in without at least one, since there's no password fallback for that role.

> **Company map pins use Leaflet + OpenStreetMap** (completely free, no API key or billing card needed) instead of the Google Maps JavaScript API, which requires a Google Cloud billing card even on its free tier. The Find Company page's map preview still uses Google Maps' free key-less embed for display.

---

## 0. What you need installed first

| Tool | Version | Check with |
|---|---|---|
| Node.js | 18+ (20 recommended) | `node -v` |
| npm | comes with Node | `npm -v` |
| MySQL | 8.0+ | `mysql --version` |

---

## 1. Get the database ready

```sql
CREATE DATABASE simes;
```

Docker alternative:
```bash
docker run --name simes-mysql -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=simes -p 3306:3306 -d mysql:8.0
```

---

## 2. Backend setup

```bash
cd backend
npm install
```

Edit `.env`:
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/simes"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRE="7d"
PORT=5000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
BCRYPT_ROUNDS=10
```

Create tables and load sample data:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Start the backend:
```bash
npm run dev
```
Confirm at `http://localhost:5000/api/health`. **Keep this terminal running.**

---

## 3. Frontend setup

New terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the printed local URL (typically `http://localhost:5173`).

---

## 3.5 Google Sign-In Setup (the option to use right now)

Students already have real STI-issued Google accounts, so this is the one to set up first — genuinely free, no credit card required.

### Step-by-step: create a free OAuth Client ID in Google Cloud

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)** and sign in with any Google account.
2. If you don't already have a project, create one (top-left project dropdown → **New Project** → name it `SIMES` → **Create**).
3. In the search bar, type **"OAuth consent screen"** and open it.
   - Choose **External** (unless you specifically have a Google Workspace org to restrict it to), click **Create**.
   - Fill in the required fields (app name `SIMES`, your email for support/contact). You can leave scopes and test users as default and click through to **Save and Continue** on each step.
4. In the search bar, type **"Credentials"** and open it.
5. Click **+ Create Credentials → OAuth client ID**.
6. Application type: **Web application**.
7. Under **Authorized JavaScript origins**, click **+ Add URI** and enter `http://localhost:5173`.
8. Click **Create**. Copy the **Client ID** shown — a long string ending in `.apps.googleusercontent.com`. This is your `GOOGLE_CLIENT_ID`.

### Plug the Client ID into SIMES

In `frontend/.env`, set:
```
VITE_GOOGLE_CLIENT_ID=paste-your-client-id-here
```

In `backend/.env`, set the same Client ID:
```
GOOGLE_CLIENT_ID=paste-your-client-id-here
```

Restart both `npm run dev` terminals after editing `.env` files.

### If the consent screen says "unverified app"

That's expected while your OAuth consent screen is in "Testing" mode — Google shows a warning screen but still lets you continue (click **Advanced → Go to SIMES (unsafe)**). To remove that warning for real use, you'd submit the app for Google's verification review, which is free but takes some time — not necessary just to get this working for testing.

---

## 3.6 Microsoft Sign-In Setup (for later, once STI provisions student accounts)

Once STI's IT department finishes setting up student Office 365/Microsoft accounts, this can be turned on the same way as Google above — no code changes needed, just fill in the Client ID. Until then, feel free to skip this section entirely; Google alone is enough for students to log in.

This step is genuinely free too (no credit card required), but does need to be done by a real person with a Microsoft account — I can't create this for you.

### Step-by-step: register a free app in Azure

1. Go to **[portal.azure.com](https://portal.azure.com)** and sign in with any Microsoft account (a personal Outlook/Hotmail account works fine for this — it does *not* need to be a school account, and does not need to be an STI-managed account).
2. In the search bar at the top, type **"App registrations"** and open it.
3. Click **+ New registration**.
4. Fill in:
   - **Name:** `SIMES` (or anything you like — it's just a label)
   - **Supported account types:** choose **"Accounts in any organizational directory and personal Microsoft accounts"** — this is the option that lets your school's Office 365 accounts (like the students' `@stamaria.sti.edu.ph` logins) sign in
   - **Redirect URI:** choose platform **"Single-page application (SPA)"**, and enter `http://localhost:5173`
5. Click **Register**.
6. On the app's Overview page, copy the **Application (client) ID** — a long string like `a1b2c3d4-...`. This is your `MS_CLIENT_ID`.
7. In the left sidebar, go to **Authentication** → confirm `http://localhost:5173` is listed under the SPA redirect URIs (add it if it isn't, then **Save**).
8. In the left sidebar, go to **API permissions** → confirm `User.Read`, `openid`, `profile`, and `email` are listed (these are added by default). No admin consent should be needed for these basic ones in most tenants.

### Plug the Client ID into SIMES

In `frontend/.env`, set:
```
VITE_MS_CLIENT_ID=paste-your-client-id-here
VITE_MS_TENANT=common
```

In `backend/.env`, set the same Client ID:
```
MS_CLIENT_ID=paste-your-client-id-here
MS_TENANT=common
```

Restart both `npm run dev` terminals after editing `.env` files. Once both Google and Microsoft are configured, students will see both buttons and can use either.

### If your school's tenant blocks it

Some schools lock down consent so only an IT admin can approve new apps. If students see a "needs admin approval" screen when clicking the Microsoft button, that's your school's Azure AD tenant policy, not something in this code — you'd need STI's IT department to approve the app (or grant admin consent) on their end.

---

## 4. Log in

Click **"Log in with Admin"** or **"Log in with Student Account"** — there's no single combined form anymore.

| Choice | Account | Password |
|---|---|---|
| Log in with Admin | `admin@stamaria.sti.edu.ph` | `Admin123!` |
| Log in with Student Account | `Cruz.352467@gmail.com` | *(none — Google sign-in only)* |
| Log in with Student Account | `Cabatu.334507@gmail.com` | *(none — Google sign-in only)* |

Both student accounts start with **no OJT progress yet** (0 hours, no attendance history, status "Not Started") — that's intentional, not a bug. Progress only appears once they actually use Time In / Time Out on the My DTR page.

**Important:** these two students sign in with the real Gmail accounts above — the email on each student's actual Google account must exactly match the email stored on their SIMES student record. If either student's real Google account email ever changes, update it via Student Management (or directly in the seed data) to keep them matching.

Students can only get in once Section 3.5 (Google) or 3.6 (Microsoft) is completed — there's no password fallback for that role by design.

---


## Upgrading from an earlier copy of this project

The login flow changed significantly in this version — no more OTP step, no more Google sign-in, and passwords now only work for Admin (students are Microsoft-only). If you already have a `simes` database from a previous zip:
- Run `npx prisma migrate dev --name student_microsoft_only` in `backend/` to apply the schema change, then `npx prisma db seed` to refresh the account data, or
- Start fresh: `npx prisma migrate reset` (wipes and re-seeds everything)

This version also uses `leaflet` on the frontend and `jwks-rsa` on the backend — if you're replacing an older `simes` folder, delete both `node_modules` folders and run `npm install` fresh in each rather than reusing an old install.

---

## 5. Project structure

```
simes/
├── backend/
│   ├── src/
│   │   ├── controllers/     # request handlers (auth, student, attendance, company, requirement, logEntry, announcement)
│   │   ├── services/        # business logic + Prisma queries
│   │   ├── routes/          # Express route definitions
│   │   ├── middleware/      # JWT auth, error handling
│   │   └── server.js        # app entrypoint
│   ├── prisma/
│   │   ├── schema.prisma    # DB models
│   │   └── seed.js          # sample data
│   └── .env
│
└── frontend/
    └── src/
        ├── components/      # Sidebar, TopNav, Card, Modal, ProgressCircle, CameraCapture, etc.
        ├── layouts/          # StudentLayout, AdminLayout
        ├── pages/            # Dashboard, DTR, My Logs, Requirements, Schedule, Students, Companies, etc.
        ├── context/          # AuthContext (session + theme state)
        ├── services/         # axios wrappers per API resource
        └── App.jsx           # routes
```

---

## 6. Useful commands

**Backend**
```bash
npm run dev
npx prisma studio    # visual DB browser at http://localhost:5555
npx prisma migrate dev --name <change_name>
npm run seed
```

**Frontend**
```bash
npm run dev
npm run build
npm run preview
```

---

## 7. Troubleshooting

**"Can't reach database server"** → MySQL isn't running, or `DATABASE_URL` is wrong.

**"Access denied for user"** → wrong username/password in `DATABASE_URL`.

**CORS error** → `CORS_ORIGIN` in `backend/.env` must match the frontend's actual URL.

**Camera doesn't open on DTR page** → browsers require HTTPS or `localhost` for camera access — `localhost:5173` is fine; a LAN IP is not, without HTTPS.

**"Time Out" camera fails right after "Time In"** → the browser sometimes hasn't fully released the camera from the previous use yet. The app now retries automatically after a short delay, and shows a **"Try Again"** button if it still fails — just tap it once and it should connect.

**"File too large" on requirement upload** → files are capped at 8MB client-side and the server accepts up to ~15MB JSON payloads (base64 adds ~33% overhead).

**Reset the database from scratch:**
```bash
npx prisma migrate reset
```

---

## 8. API overview

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/login` | Public — Admin only (email+password), issues JWT |
| POST | `/api/auth/google` | Public — Student only (Google ID token), issues JWT |
| POST | `/api/auth/microsoft` | Public — Student only (Microsoft ID token), issues JWT |
| POST | `/api/auth/forgot-password` | Public |
| POST | `/api/auth/reset-password` | Public |
| POST | `/api/auth/theme` | Authenticated |
| GET/POST/PUT/DELETE | `/api/students` | Admin (own profile: authenticated) |
| GET/POST/PUT/DELETE | `/api/attendance/*` | Authenticated (DTR, requires photo) |
| GET/POST/PUT/DELETE | `/api/companies` | Admin write, authenticated read |
| GET/POST/PUT/DELETE | `/api/requirements` | Admin write, authenticated read/submit |
| GET/POST/PUT/DELETE | `/api/logs` | Authenticated (own), Admin (review/assign) |
| GET/POST/PUT/DELETE | `/api/announcements` | Admin write, public read (active) |

---

## 9. Known scope notes

- File uploads (requirements) and DTR photos are stored as base64 directly in MySQL (`LongText` columns) rather than in external object storage — fine for a school-scale deployment, but for production at larger scale, consider moving to S3/Cloud Storage.
- Password-reset tokens have no real email delivery mechanism — the token is printed to the backend terminal and returned in the dev API response so the flow is testable end to end. Wiring up a real email provider (e.g. SendGrid) is a small, contained change inside `backend/src/services/authService.js`.
- `npm audit` on the frontend flags a moderate open-redirect issue in `react-router-dom` 6.x (fixed only in the 7.x major line). Upgrading to router v7 changes routing APIs across every page, so it wasn't done blind here — if you want it fixed, it's a deliberate, testable upgrade rather than a quick patch.

