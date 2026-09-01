import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, CheckCircle2, Clock3, ArrowRight } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import CalendarWidget from '../components/CalendarWidget';
import WelcomeCarousel from '../components/WelcomeCarousel';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../services/studentService').then(({ getDashboardStats }) => {
      getDashboardStats().then(res => setStats(res.data)).catch(console.error).finally(()=>setLoading(false));
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top: 3-pic carousel sliding auto every 3s + Calendar beside it */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <WelcomeCarousel />
        </div>
        <div className="lg:col-span-1">
          <CalendarWidget />
        </div>
      </div>

      {/* Stats below - keep small */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.total} icon={Users} accent="blue" />
        <StatCard label="Active Students" value={stats.active} icon={UserCheck} accent="green" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="yellow" />
        <StatCard label="Pending" value={stats.pending} icon={Clock3} accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-6">
            <h3 className="font-bold text-sti-gray-dark dark:text-white">Recent Students</h3>
            <p className="text-sm text-sti-gray">Manage via Account Management → Create Account</p>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-sti-gray-dark dark:text-white mb-3">Announcements</h3>
          <p className="text-sm text-sti-gray">No announcements yet</p>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
