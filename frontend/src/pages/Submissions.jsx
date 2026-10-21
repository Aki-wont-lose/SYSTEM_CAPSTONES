import AdminRequirements from './AdminRequirements';
import { useAuth } from '../hooks/useAuth';

const Submissions = () => {
  const { user } = useAuth();
  const canCheck = user?.role === 'ADMIN' || user?.role === 'COORDINATOR';

  return (
    <AdminRequirements
      defaultTab={canCheck ? 'checklist' : 'submissions'}
      hideRequirements
      hideGrading
      hideChecklist={!canCheck}
    />
  );
};

export default Submissions;
