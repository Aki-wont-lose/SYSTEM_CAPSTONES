import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import ProtectedRoute from './components/ProtectedRoute';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import CoordinatorLayout from './layouts/CoordinatorLayout';
import SupervisorLayout from './layouts/SupervisorLayout';

import Login from './pages/Login';
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const StudentDTR = lazy(() => import('./pages/StudentDTR'));
const MyLogs = lazy(() => import('./pages/MyLogs'));
const Requirements = lazy(() => import('./pages/Requirements'));
const FindCompany = lazy(() => import('./pages/FindCompany'));
const Schedule = lazy(() => import('./pages/Schedule'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AccountManagement = lazy(() => import('./pages/AccountManagement'));
const StudentManagement = lazy(() => import('./pages/StudentManagement'));
const AdminRequirements = lazy(() => import('./pages/AdminRequirements'));
const Templates = lazy(() => import('./pages/Templates'));
const Submissions = lazy(() => import('./pages/Submissions'));
const Companies = lazy(() => import('./pages/Companies'));
const AdminLogs = lazy(() => import('./pages/AdminLogs'));
const AnnouncementManagement = lazy(() => import('./pages/AnnouncementManagement'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const Messages = lazy(() => import('./pages/Messages'));
const AttendanceMonitoring = lazy(() => import('./pages/AttendanceMonitoring'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Archive = lazy(() => import('./pages/Archive'));
const OjtHours = lazy(() => import('./pages/OjtHours'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
  </div>
);

const ROLE_HOME = {
  ADMIN: '/admin/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  SUPERVISOR: '/supervisor/dashboard',
  STUDENT: '/dashboard',
};

function App() {
  const { isAuthenticated, user, mustChangePassword } = useAuth();

  const defaultRoute = mustChangePassword ? '/change-password' : isAuthenticated ? (ROLE_HOME[user?.role] || '/dashboard') : '/login';

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <Login />}
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* STUDENT — own dashboard, DTR, logs, requirements, company search, schedule, profile */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/my-dtr" element={<StudentDTR />} />
          <Route path="/my-logs" element={<MyLogs />} />
          <Route path="/templates" element={<Requirements mode="templates" />} />
          <Route path="/submissions" element={<Requirements mode="submissions" />} />
          <Route path="/requirements" element={<Requirements />} />
          <Route path="/find-company" element={<FindCompany />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<StudentProfile />} />
        </Route>

        {/* ADMIN — Create Account for all roles, no attendance (coordinator/supervisor only) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/accounts" element={<AccountManagement />} />
          <Route path="/admin/students" element={<Navigate to="/admin/accounts?tab=students" replace />} />
          <Route path="/admin/templates" element={<Templates />} />
          <Route path="/admin/submissions" element={<ProtectedRoute disallowSuperAdmin><Submissions /></ProtectedRoute>} />
          <Route path="/admin/requirements" element={<ProtectedRoute disallowSuperAdmin><AdminRequirements /></ProtectedRoute>} />
          <Route path="/admin/grading" element={<ProtectedRoute disallowSuperAdmin><Navigate to="/admin/submissions" replace /></ProtectedRoute>} />
          <Route path="/admin/companies" element={<Companies />} />
          <Route path="/admin/logs" element={<ProtectedRoute disallowSuperAdmin><AdminLogs /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/archive" element={<Archive />} />
          <Route path="/admin/announcements" element={<ProtectedRoute disallowSuperAdmin><AnnouncementManagement /></ProtectedRoute>} />
          <Route path="/admin/messages" element={<Messages />} />
          <Route path="/admin/ojt-hours" element={<ProtectedRoute disallowSuperAdmin><OjtHours /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<AdminProfile />} />
        </Route>

        {/* COORDINATOR — same UI as ADMIN: dashboard, students, requirements (+PDF templates), companies, logs, announcements, profile */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['COORDINATOR']}>
              <CoordinatorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/coordinator/dashboard" element={<AdminDashboard />} />
          <Route path="/coordinator/accounts" element={<AccountManagement />} />
          <Route path="/coordinator/students" element={<Navigate to="/coordinator/accounts?tab=students" replace />} />
          <Route path="/coordinator/attendance" element={<AttendanceMonitoring />} />
          <Route path="/coordinator/templates" element={<Templates />} />
          <Route path="/coordinator/submissions" element={<Submissions />} />
          <Route path="/coordinator/requirements" element={<AdminRequirements />} />
          <Route path="/coordinator/grading" element={<Navigate to="/coordinator/submissions" replace />} />
          <Route path="/coordinator/companies" element={<Companies />} />
          <Route path="/coordinator/logs" element={<AdminLogs />} />
          <Route path="/coordinator/archive" element={<Archive />} />
          <Route path="/coordinator/announcements" element={<AnnouncementManagement />} />
          <Route path="/coordinator/messages" element={<Messages />} />
          <Route path="/coordinator/profile" element={<AdminProfile />} />
        </Route>

        {/* SUPERVISOR — same UI, limited: dashboard, students (view), logs (review), profile */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
              <SupervisorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/supervisor/dashboard" element={<AdminDashboard />} />
          <Route path="/supervisor/students" element={<StudentManagement />} />
          <Route path="/supervisor/attendance" element={<AttendanceMonitoring />} />
          <Route path="/supervisor/submissions" element={<Submissions />} />
          <Route path="/supervisor/grading" element={<Navigate to="/supervisor/submissions" replace />} />
          <Route path="/supervisor/logs" element={<AdminLogs />} />
          <Route path="/supervisor/messages" element={<Messages />} />
          <Route path="/supervisor/profile" element={<AdminProfile />} />
        </Route>

        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
