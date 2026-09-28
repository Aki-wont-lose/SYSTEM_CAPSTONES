import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';

// Must stay in sync with roleHome in AuthContext, otherwise COORDINATOR and
// SUPERVISOR were sent to /dashboard, which is a STUDENT-only route, which bounced
// them straight back to /unauthorized.
const HOME_BY_ROLE = {
  ADMIN: '/admin/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  SUPERVISOR: '/supervisor/dashboard',
  STUDENT: '/dashboard'
};

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const goHome = () => {
    navigate(HOME_BY_ROLE[user?.role] || '/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sti-gray-light p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-sti-gray-dark mb-2">Access denied</h1>
        <p className="text-sm text-sti-gray mb-6">
          You don't have permission to view this page. Head back to your dashboard instead.
        </p>
        <Button variant="primary" onClick={goHome}>Back to Dashboard</Button>
      </div>
    </div>
  );
};

export default Unauthorized;
