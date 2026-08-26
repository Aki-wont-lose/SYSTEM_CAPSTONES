// config/roles.js — single source of truth for 4 user levels (adviser: ADMIN, COORDINATOR, SUPERVISOR, STUDENT)
// Same UI for all; limits by role.

export const ROLES = {
  ADMIN: 'ADMIN',
  COORDINATOR: 'COORDINATOR',
  SUPERVISOR: 'SUPERVISOR',
  STUDENT: 'STUDENT',
};

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinator',
  SUPERVISOR: 'Supervisor',
  STUDENT: 'Student',
};

export const ROLE_HOME = {
  ADMIN: '/admin/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  SUPERVISOR: '/supervisor/dashboard',
  STUDENT: '/dashboard',
};

// Sidebar visibility per role — same components, limited items
// COORDINATOR = like ADMIN + can upload requirement PDF templates; SUPERVISOR = review only
export const ROLE_NAV = {
  ADMIN:       ['dashboard','students','requirements','companies','logs','announcements','messages','profile'],
  COORDINATOR: ['dashboard','students','requirements','companies','logs','announcements','messages','profile'],
  SUPERVISOR:  ['dashboard','students','logs','messages','profile'],
  STUDENT:     ['dashboard','dtr','logs','requirements','find-company','schedule','profile'],
};

export const isAllowed = (role, key) => (ROLE_NAV[role] || []).includes(key);
