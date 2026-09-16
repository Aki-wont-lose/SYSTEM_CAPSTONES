import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, CheckCircle2, Clock3 } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import CalendarWidget from '../components/CalendarWidget';
import WelcomeCarousel from '../components/WelcomeCarousel';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      import('../services/studentService').then(m=>m.getDashboardStats()),
      import('../services/announcementService').then(m=>m.getAllAnnouncements())
    ]).then(async ([statsRes, annRes])=>{
      setStats((await statsRes).data);
      setAnnouncements((await annRes).data.slice(0,3));
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
    <div className="space-y-4 animate-fade-in">
      {/* Top: 3-pic carousel big height, calendar smaller length beside it */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <WelcomeCarousel />
        </div>
        <div className="lg:col-span-1">
          <div className="scale-90 origin-top">
            <CalendarWidget />
          </div>
        </div>
      </div>

      {/* Announcement in the middle - shows latest posts like announcing */}
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl p-0 overflow-hidden">
          <div className="p-4 border-b border-black/5 dark:border-white/10">
            <h3 className="font-bold text-sti-gray-dark dark:text-white text-center">📢 Announcements</h3>
          </div>
          {announcements.length===0 ? (
            <p className="text-sm text-sti-gray text-center py-6">No announcements yet - create one and it will appear here</p>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {announcements.map(a=>(
                <div key={a.id} className="p-4">
                  {a.image && <img src={a.image} alt={a.title} className="w-full h-40 object-cover rounded-xl mb-3" />}
                  <h4 className="font-bold text-sm text-sti-gray-dark dark:text-white">{a.title}</h4>
                  <p className="text-sm text-sti-gray mt-1">{a.content}</p>
                  <p className="text-xs text-sti-gray/70 mt-2">{new Date(a.publishedAt || a.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/admin/announcements')} className="w-full text-center py-3 text-sm text-sti-blue font-semibold hover:bg-sti-gray-light/30">Go to Announcements →</button>
        </Card>
      </div>

      {/* Stats - 2 and 2, moved upward near 3 pics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 -mt-2">
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
