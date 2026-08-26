import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, CheckCircle2, Clock3, Megaphone, ArrowRight, UserPlus } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import Button from '../components/Button';
import { getDashboardStats, getAllStudents } from '../services/studentService';
import { getAllAnnouncements } from '../services/announcementService';

const statusStyles = {
  NOT_STARTED: 'bg-gray-100 text-sti-gray-dark',
  ONGOING: 'bg-sti-blue-50 text-sti-blue',
  COMPLETED: 'bg-yellow-50 text-sti-yellow-dark',
  ON_HOLD: 'bg-orange-50 text-orange-600',
  FAILED: 'bg-red-50 text-red-600',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, studentsRes, announcementsRes] = await Promise.all([
          getDashboardStats(),
          getAllStudents(),
          getAllAnnouncements()
        ]);
        setStats(statsRes.data);
        setRecentStudents(studentsRes.data.slice(0, 5));
        setRecentAnnouncements(announcementsRes.data.slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
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
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-sti-blue p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sti-yellow font-semibold text-sm mb-1">Admin Overview</p>
          <h2 className="text-white text-2xl sm:text-3xl font-extrabold">Program Snapshot</h2>
          <p className="text-white/70 text-sm mt-1">Monitor student progress and manage announcements.</p>
        </div>
        <Button variant="accent" icon={UserPlus} onClick={() => navigate('/admin/students')} className="relative">
          Add Student
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.total} icon={Users} accent="blue" />
        <StatCard label="Active Students" value={stats.active} icon={UserCheck} accent="green" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="yellow" />
        <StatCard label="Pending" value={stats.pending} icon={Clock3} accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent students */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="font-bold text-sti-gray-dark dark:text-white">Recent Students</h3>
            <button
              onClick={() => navigate('/admin/students')}
              className="text-sm text-sti-blue font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-black/5 dark:border-white/10 text-left">
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Student</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Course</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Hours</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map((s) => (
                  <tr key={s.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-sti-gray-dark dark:text-white">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-sti-gray">{s.studentId}</p>
                    </td>
                    <td className="px-6 py-3.5 text-sti-gray-dark dark:text-white">{s.course}</td>
                    <td className="px-6 py-3.5 text-sti-gray-dark dark:text-white">{s.completedHours}/{s.requiredHours}h</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[s.ojt_status]}`}>
                        {s.ojt_status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent announcements */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-sti-blue" />
              <h3 className="font-bold text-sti-gray-dark dark:text-white">Announcements</h3>
            </div>
          </div>
          <div className="space-y-3">
            {recentAnnouncements.map((a) => (
              <div key={a.id} className="p-3.5 rounded-xl border border-black/5 dark:border-white/10">
                <h4 className="font-semibold text-sm text-sti-gray-dark dark:text-white">{a.title}</h4>
                <p className="text-xs text-sti-gray mt-1 line-clamp-2">{a.content}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/admin/announcements')}
            className="w-full mt-4 text-sm text-sti-blue font-medium flex items-center justify-center gap-1 hover:gap-2 transition-all"
          >
            Manage announcements <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
