import { useEffect, useState } from 'react';
import { Users, UserCheck, CheckCircle2, Clock3, GraduationCap } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import CalendarWidget from '../components/CalendarWidget';
import WelcomeCarousel from '../components/WelcomeCarousel';
import { getActiveAnnouncements } from '../services/announcementService';

const PROGRAM_ORDER = ['BSIT', 'BSCS', 'BSCPE', 'BSACT', 'BSHM', 'BSTM', 'BSAIS'];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      import('../services/studentService').then(m=>m.getDashboardStats().then(r=>r.data)),
      import('../services/announcementService').then(m=>m.getActiveAnnouncements().then(r=>r.data.slice(0,3)).catch(()=>[]))
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

  const byCourse = stats?.byCourse || {};
  const programRows = [
    ...PROGRAM_ORDER.filter((p) => byCourse[p] != null).map((p) => ({ label: p, value: byCourse[p] })),
    ...Object.entries(byCourse)
      .filter(([key]) => !PROGRAM_ORDER.includes(key))
      .map(([label, value]) => ({ label, value }))
  ];
  const maxProgram = Math.max(1, ...programRows.map((r) => r.value));

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

      {/* Headline status counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total OJT Enrolled Student" value={stats.totalStudents ?? stats.total} icon={Users} accent="blue" />
        <StatCard label="On Going OJT Students" value={stats.active ?? 0} icon={UserCheck} accent="green" />
        <StatCard label="Pending" value={stats.pending ?? 0} icon={Clock3} accent="red" />
        <StatCard label="Completed" value={stats.completed ?? 0} icon={CheckCircle2} accent="yellow" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <Card>
          <h3 className="font-bold text-sti-gray-dark dark:text-white text-sm flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-sti-blue" /> Interns per Program
          </h3>
          {programRows.length === 0 ? (
            <p className="text-sm text-sti-gray mt-3">No program data yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {programRows.map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-sti-gray-dark dark:text-slate-200">{row.label}</span>
                    <span className="text-sti-gray">{row.value} intern{row.value === 1 ? '' : 's'}</span>
                  </div>
                  <div className="h-2 rounded-full bg-sti-gray-light dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-sti-blue" style={{ width: `${Math.round((row.value / maxProgram) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-sti-gray">
          <Clock3 className="w-4 h-4 text-sti-blue" />
          <span>Manage interns, accounts, and requirements from their respective pages.</span>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
