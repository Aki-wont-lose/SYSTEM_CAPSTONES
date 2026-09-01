import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, CheckCircle2, Clock3 } from 'lucide-react';
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
      {/* Top: 3-pic carousel big + Calendar + Announcement same size */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <WelcomeCarousel />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <CalendarWidget />
          <Card className="p-0 overflow-hidden">
            <button onClick={() => navigate('/admin/announcements')} className="w-full text-left p-4 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
              <h3 className="font-bold text-sti-gray-dark dark:text-white text-sm">Announcements</h3>
              <p className="text-xs text-sti-gray mt-1">View and manage announcements</p>
              <p className="text-xs text-sti-blue font-semibold mt-2">Go to Announcements →</p>
            </button>
          </Card>
        </div>
      </div>

      {/* Stats - 4 cards aligned to 3 picture width, a little more spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard label="Total Students" value={stats.total} icon={Users} accent="blue" />
        <StatCard label="Active Students" value={stats.active} icon={UserCheck} accent="green" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="yellow" />
        <StatCard label="Pending" value={stats.pending} icon={Clock3} accent="red" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4">
          <h3 className="font-bold text-sti-gray-dark dark:text-white">Recent Students</h3>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
