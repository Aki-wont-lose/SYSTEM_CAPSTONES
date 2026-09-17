import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, CheckCircle2, Clock3 } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import CalendarWidget from '../components/CalendarWidget';
import WelcomeCarousel from '../components/WelcomeCarousel';
import { getActiveAnnouncements } from '../services/announcementService';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      import('../services/studentService').then(m=>m.getDashboardStats().then(r=>r.data)),
      import('../services/announcementService').then(m=>m.getAllAnnouncements().then(r=>r.data.slice(0,3)).catch(()=>[]))
    ]).then(([statsData, annData])=>{
      setStats(statsData);
      setAnnouncements(annData);
    }).catch(console.error).finally(()=>setLoading(false));
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
      {/* Layer 1: 3-pic carousel + Calendar beside it */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <WelcomeCarousel />
        </div>
        <div className="lg:col-span-1">
          <CalendarWidget />
        </div>
      </div>

      {/* Announcements - fitted whole photo not cropped, aligned to Welcome width (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-3">
          {announcements.length===0 ? (
            <Card className="text-center py-6"><p className="text-sm text-sti-gray">No announcements yet</p></Card>
          ) : announcements.map(a=>(
            <Card key={a.id} className="p-0 overflow-hidden">
              {a.image && <img src={a.image} alt={a.title} className="w-full max-h-80 object-contain bg-sti-gray-light dark:bg-slate-900" />}
              <div className="p-4">
                <h4 className="font-bold text-sm">{a.title}</h4>
                <p className="text-sm text-sti-gray mt-1">{a.content}</p>
                <p className="text-xs text-sti-gray/70 mt-2">{new Date(a.publishedAt || a.createdAt).toLocaleDateString()}</p>
              </div>
            </Card>
          ))}
        </div>
        <div className="hidden lg:block" />
      </div>

      {/* 5 cards aligned to 3 pictures - 3 on first line, 2 on second, like 3 lines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Students" value={stats.total} icon={Users} accent="blue" />
        <StatCard label="Active Students" value={stats.active} icon={UserCheck} accent="green" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="yellow" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Pending" value={stats.pending} icon={Clock3} accent="red" />
          <Card>
            <h3 className="font-bold text-sti-gray-dark dark:text-white text-sm">Recent Students</h3>
            <p className="text-xs text-sti-gray mt-1">Manage via Account Management → Create Account</p>
          </Card>
        </div>
        <div className="hidden lg:block" />
      </div>
    </div>
  );
};

export default AdminDashboard;
