import { Mail, Shield } from 'lucide-react';
import Card from '../components/Card';
import { useAuth } from '../hooks/useAuth';

const AdminProfile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Card className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-sti-blue flex items-center justify-center text-white text-3xl font-bold shrink-0">
          {user?.email?.[0]?.toUpperCase()}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-extrabold text-sti-gray-dark dark:text-white">Administrator</h2>
          <p className="text-sti-gray text-sm">{user?.email}</p>
          <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-sti-blue-50 text-sti-blue">
            Admin Account
          </span>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-sti-gray-dark dark:text-white mb-5">Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-sti-gray mb-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </label>
            <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200 py-2.5">{user?.email}</p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-sti-gray mb-1.5">
              <Shield className="w-3.5 h-3.5" /> Role
            </label>
            <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200 py-2.5">Administrator</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminProfile;
