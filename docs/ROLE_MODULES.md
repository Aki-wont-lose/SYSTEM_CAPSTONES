# Role → module matrix

The super admin is not a separate database role. It is the `ADMIN` account whose
email matches `SUPER_ADMIN_EMAIL`, exposed to the API and UI as `isSuperAdmin`.
Because it shares the `ADMIN` role, any module the super admin must *not* have
needs an explicit exception on top of `verifyRole(['ADMIN'])`.

## Current exceptions

| Module | ADMIN | SUPER ADMIN | Enforcement |
| --- | --- | --- | --- |
| Announcements | Full | None (dashboard feed only) | `denySuperAdmin` on every route in `backend/src/modules/announcements/routes.js` |

The super admin still reads announcements through the public
`GET /api/announcements/active` feed that every dashboard uses. They cannot list
draft announcements, create, edit, delete, publish, or unpublish.

## Where the rule lives

- Backend: `denySuperAdmin` in `backend/src/middleware/auth.js`, composed after
  `verifyToken` (and `verifyRole(['ADMIN'])` on writes).
- Frontend: `SUPER_ADMIN_HIDDEN_LINKS` in `frontend/src/components/Sidebar.jsx`
  removes the link, and `AnnouncementManagement.jsx` redirects the super admin to
  `/admin/dashboard` if they open the URL directly.
- Regression test: `backend/audit-tests/announcementAccess.test.js` asserts both
  the middleware behaviour and that every non-public announcement route carries
  the guard.

## Adding another exception

1. Add the path to `SUPER_ADMIN_HIDDEN_LINKS` so the link disappears.
2. Put `denySuperAdmin` on the route(s) so the API agrees with the UI.
3. Extend `announcementAccess.test.js` or add a sibling test for the route table.

Do not remove modules from the super admin merely by editing the sidebar. UI-only
hiding is not a permission: the API stays callable with the account's token.
