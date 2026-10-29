# Microsoft account verification (role-based)

This document describes what SIMES enforces, what it deliberately does **not**
pretend to enforce, and the exact configuration the school's Microsoft 365
administrator must provide to close the remaining gap.

The implementation is server-side. The frontend never decides whether an
account is verified, and no client secret or access token ever reaches the
browser.

---

## 1. What is enforced today (no school tenant required)

| Control | Where | Behaviour |
|---|---|---|
| School-only accounts for `STUDENT`, `ADMIN`, `COORDINATOR` | Microsoft sign-in and account linking | The authenticated Microsoft email must be on `@stamaria.sti.edu.ph` or `@stamaria.edu.ph`. Personal Microsoft accounts are rejected with HTTP 403. |
| Personal accounts allowed for `SUPERVISOR` | Microsoft sign-in | Any valid Microsoft account (Outlook.com, Hotmail.com, company account) is accepted — but only if a matching SIMES account already exists. |
| No automatic access from authentication | Microsoft sign-in | A Microsoft identity with no matching SIMES account gets 404. Microsoft authentication alone never creates access, a role, or company data. |
| Verification is never inferred from the email format | Account creation | Creation returns `microsoftVerification.verified: false` unless the Microsoft Graph directory confirmed the mailbox, or the person has already signed in with Microsoft. |
| Students are Microsoft-only | Password sign-in | Student accounts cannot sign in with a password, and neither `change-password` nor password reset can issue one. Microsoft sign-in is their only path, which is what verifies the mailbox. |
| Verified state | First Microsoft sign-in | A successful Microsoft sign-in records the `LinkedAccount` row, which is what marks the account verified. |
| Role changes re-check the policy | Account management | Promoting a supervisor with a personal address to coordinator/admin is rejected unless the address is a school address. |
| Microsoft account linking follows the same rules | Profile → Linked accounts | A staff member cannot attach a personal Microsoft account and later use it to bypass the school-account rule. |
| `tid` tenant claim | Microsoft sign-in | If `MS_SCHOOL_TENANT_ID` is set, school-role tokens must come from that tenant. Supervisors are exempt. |

These controls survive direct API calls; hiding buttons in the UI is not what
enforces them.

## 2. What cannot be enforced without the school tenant

At **creation time**, the administrator is not the account owner, so the only
way to prove that `cruz.352467@stamaria.sti.edu.ph` exists in Microsoft 365 is a
directory lookup against the tenant that owns the domain. Microsoft does not
expose a public "does this mailbox exist?" API, and an app registered in another
tenant cannot see STI's users.

Therefore, without Graph credentials:

* a fabricated address such as `cruz.352466@stamaria.sti.edu.ph` **can still be
  saved**, because there is no authoritative source to reject it;
* it is stored as **unverified**, cannot sign in (students have no password, and
  Microsoft rejects the mailbox), and can never become verified;
* the system never labels it verified.

This is reported honestly rather than implementing a fake existence check.

## 3. Closing the gap with Microsoft Graph

Required from the school's Microsoft 365 administrator (they keep ownership and
can revoke access at any time):

1. An app registration in the **school tenant** (or admin consent to a
   multi-tenant registration).
2. Microsoft Graph **application** permission `User.Read.All`
   (read-only; `User.ReadBasic.All` is sufficient if only existence is needed).
3. **Grant admin consent** for the tenant.
4. The three values below.

Add them to `backend/.env` (server only — never `frontend/.env`):

```dotenv
# Tenant that owns @stamaria.sti.edu.ph
MS_GRAPH_TENANT_ID=<directory (tenant) id>
MS_GRAPH_CLIENT_ID=<application (client) id>
MS_GRAPH_CLIENT_SECRET=<client secret VALUE>

# Tenant allowed to issue school accounts (used to check the token's `tid`).
# Do not use "common" here.
MS_SCHOOL_TENANT_ID=<directory (tenant) id>

# off | warn | enforce
MS_ACCOUNT_VERIFY=warn
```

| Mode | Graph configured | Graph says user does not exist (404) | Graph unavailable / no permission | Missing configuration |
|---|---|---|---|---|
| `off` | not called | account created, unverified | account created, unverified | account created, unverified |
| `warn` (default) | called | **rejected** | account created, unverified, warning logged | account created, unverified |
| `enforce` | called | **rejected** | **rejected** (HTTP 503) | **rejected** (HTTP 503) |

A definitive "user does not exist" answer from Graph is rejected in both `warn`
and `enforce`. `enforce` is the fail-closed setting to use once the credentials
are in place.

### Expected results after Graph is configured

| Scenario | Result |
|---|---|
| Create student `cruz.352467@stamaria.sti.edu.ph` (exists) | Created, `microsoftVerification.status = verified`, `source = graph` |
| Create student `cruz.352466@stamaria.sti.edu.ph` (does not exist) | HTTP 400: *"This school email does not exist in the authorized Microsoft 365 tenant"* |
| Create coordinator/admin with a school mailbox that does not exist | HTTP 400, same gate |
| Create supervisor with `someone@outlook.com` | Created, `status = not-required`; verified on first Microsoft sign-in |
| Any personal account used for student/admin/coordinator sign-in | HTTP 403 |
| Graph outage while `MS_ACCOUNT_VERIFY=enforce` | HTTP 503, nothing created |
| Duplicate student ID or email | Existing duplicate checks still apply first |

### Testing without the school tenant

A free Azure tenant can be used to exercise the full path:

1. Create a free Azure account → Microsoft Entra ID.
2. Register an app, add `User.Read.All` (application), grant admin consent.
3. Create test users such as `cruz.352467@yourtenant.onmicrosoft.com`.
4. Point `MS_GRAPH_*` at the test tenant and try creating a real test user
   (passes) and a fake one (404 → rejected).
5. When the school supplies its values, only the environment variables change —
   no code changes.

## 4. Platform note: Supabase

SIMES uses Supabase **only as a PostgreSQL database** through Prisma. Supabase
Auth is not used, there is no Supabase identity provider configured, and no
Supabase table stores verification state. Microsoft Entra ID is the identity
provider; Microsoft Graph is the directory source.

The `LinkedAccount` table already existed and is reused, so **no database
migration is required** for this work. "Verified" is derived from the presence
of a Microsoft link created by a successful sign-in, not from a new column.

## 5. Super-admin transition note (important before deploying)

The current super-admin is `mccruz1230@gmail.com` (a personal account) and has
no password. Under the new rule, a personal account cannot hold an `ADMIN` role,
so the super-admin would be locked out.

Two safe options:

1. **Recommended:** create/obtain a school Microsoft account for the super-admin,
   set `SUPER_ADMIN_EMAIL` to it, and sign in with it.
2. **Temporary transition:** add `SUPER_ADMIN_BOOTSTRAP_PERSONAL=true` to
   `backend/.env` while the migration is in progress. This allows the single
   configured `SUPER_ADMIN_EMAIL` to keep using a personal account; every other
   admin/coordinator/student is still rejected. Remove the flag once the
   super-admin has a school account.

The flag is **off by default** — it is never enabled implicitly.

## 6. Files involved

| File | Purpose |
|---|---|
| `backend/src/services/microsoftAccountPolicy.js` | Role → allowed Microsoft account rules, `tid` check, bootstrap exception |
| `backend/src/services/graphDirectoryService.js` | Server-side Graph lookup, token cache, `off/warn/enforce` gate |
| `backend/src/services/microsoftAuthService.js` | Enforces the policy on Microsoft sign-in and records verification |
| `backend/src/services/studentService.js` | Verification gate on student create/edit |
| `backend/src/modules/accounts/service.js` | Verification gate on staff create/edit and role changes |
| `backend/src/modules/profile/service.js` | Policy gate on linking a Microsoft account |
| `backend/src/services/authService.js` | Exposes verification state on password sign-in (does not set it) |
| `backend/audit-tests/microsoftAccountPolicy.test.js` | Unit tests for all of the above |

## 7. Security properties

* Secrets, tokens and Graph calls stay on the server.
* Verification failures never fall through to "verified".
* A Microsoft directory match never grants SIMES access by itself — a local
  account must exist and be active.
* Company information is still gated by `supervisorCompanyId` and the existing
  company assignment rules; authentication alone grants nothing.
* Existing student eligibility, section, hour and duplicate rules are unchanged.
