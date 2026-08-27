import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import ProtectedRoute from './components/ProtectedRoute';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import CoordinatorLayout from './layouts/CoordinatorLayout';
import SupervisorLayout from './layouts/SupervisorLayout';

import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import StudentDTR from './pages/StudentDTR';
import MyLogs from './pages/MyLogs';
import Requirements from './pages/Requirements';
import FindCompany from './pages/FindCompany';
import Schedule from './pages/Schedule';
import AdminDashboard from './pages/AdminDashboard';
import StudentManagement from './pages/StudentManagement';
import AdminRequirements from './pages/AdminRequirements';
import Companies from './pages/Companies';
import AdminLogs from './pages/AdminLogs';
import AnnouncementManagement from './pages/AnnouncementManagement';
import AdminProfile from './pages/AdminProfile';
import Messages from './pages/Messages';

const ROLE_HOME = {
  ADMIN: '/admin/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  SUPERVISOR: '/supervisor/dashboard',
  STUDENT: '/dashboard',
};

function App() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sti-gray-light dark:bg-slate-900">
        <div className="w-10 h-10 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const defaultRoute = isAuthenticated ? (ROLE_HOME[user?.role] || '/dashboard') : '/login';

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <Login />}
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
        <Route path="/requirements" element={<Requirements />} />
        <Route path="/find-company" element={<FindCompany />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<StudentProfile />} />
      </Route>

      {/* ADMIN — full access */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<StudentManagement />} />
        <Route path="/admin/requirements" element={<AdminRequirements />} />
        <Route path="/admin/companies" element={<Companies />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/admin/announcements" element={<AnnouncementManagement />} />
        <Route path="/admin/messages" element={<Messages />} />
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
        <Route path="/coordinator/students" element={<StudentManagement />} />
        <Route path="/coordinator/requirements" element={<AdminRequirements />} />
        <Route path="/coordinator/companies" element={<Companies />} />
        <Route path="/coordinator/logs" element={<AdminLogs />} />
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
        <Route path="/supervisor/logs" element={<AdminLogs />} />
        <Route path="/supervisor/messages" element={<Messages />} />
        <Route path="/supervisor/profile" element={<AdminProfile />} />
      </Route>

      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

export default App;
