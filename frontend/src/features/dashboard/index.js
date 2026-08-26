// features/dashboard — same UI, limits by role (ADMIN sees full stats, others scoped)
export { default as AdminDashboard } from '../../pages/AdminDashboard.jsx';
export { default as StudentDashboard } from '../../pages/StudentDashboard.jsx';
// SUPERVISOR & COMPANY reuse AdminDashboard with role-filtered data (see Sidebar limits)
export { default as SupervisorDashboard } from '../../pages/AdminDashboard.jsx';
export { default as CompanyDashboard } from '../../pages/AdminDashboard.jsx';
