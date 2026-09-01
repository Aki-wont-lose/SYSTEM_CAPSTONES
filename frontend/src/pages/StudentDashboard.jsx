import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Hourglass, Megaphone, ClipboardList, UserCircle, ArrowRight, Camera, FileCheck2, CalendarDays } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import ProgressCircle from '../components/ProgressCircle';
import WelcomeCarousel from '../components/WelcomeCarousel';
import CalendarWidget from '../components/CalendarWidget';
import { useAuth } from '../hooks/useAuth';
import { getStudentSummary } from '../services/attendanceService';
import { getActiveAnnouncements } from '../services/announcementService';

const priorityColors = {
  URGENT: 'bg-red-50 text-red-600 border-red-100',
  HIGH: 'bg-yellow-50 text-sti-yellow-dark border-yellow-100',
  NORMAL: 'bg-sti-blue-50 text-sti-blue border-sti-blue-100',
  LOW: 'bg-gray-50 text-sti-gray border-gray-100',
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [summaryRes, announcementsRes] = await Promise.all([
          getStudentSummary(),
          getActiveAnnouncements(4)
        ]);
        setSummary(summaryRes.data);
        setAnnouncements(announcementsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
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

  const student = summary?.student;
  const stats = summary?.attendance;
  const requiredHours = student?.requiredHours || 486;
  const completedHours = stats?.totalHours ?? student?.completedHours ?? 0;
  const remainingHours = stats?.remainingHours ?? Math.max(0, requiredHours - completedHours);
  const percentage = requiredHours > 0 ? (completedHours / requiredHours) * 100 : 0;

  const quickActions = [
    { to: '/my-dtr', label: 'Time In / Out', desc: 'Camera-verified DTR', icon: Camera },
    { to: '/my-logs', label: 'My Logs', desc: 'Daily task journal', icon: ClipboardList },
    { to: '/requirements', label: 'Requirements', desc: 'Upload documents', icon: FileCheck2 },
    { to: '/schedule', label: 'Schedule', desc: 'Company & supervisor', icon: CalendarDays },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome carousel + small calendar on right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <WelcomeCarousel />
          <div className="mt-2 bg-sti-blue rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-sm">
                Hi, {student?.firstName}! {student?.ojt_status === 'COMPLETED' ? '🎉' : ''}
              </p>
              <p className="text-white/70 text-xs">{student?.company?.name ? `Interning at ${student.company.name}` : 'Keep tracking your progress.'}</p>
            </div>
            <span className="text-sti-yellow font-semibold text-xs hidden sm:block">
              {student?.ojt_status === 'COMPLETED' ? 'OJT Completed' : 'Welcome back'}
            </span>
          </div>
        </div>
        <div className="lg:col-span-1 space-y-4">
          <CalendarWidget />
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-black/5 dark:border-white/5 p-3">
            <h4 className="font-bold text-xs text-sti-gray-dark dark:text-white mb-2">Quick Links</h4>
            <div className="space-y-1.5">
              <button onClick={()=>navigate('/my-dtr')} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/5">📷 Time In / Out</button>
              <button onClick={()=>navigate('/requirements')} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/5">📄 Requirements</button>
              <button onClick={()=>navigate('/find-company')} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/5">🏢 Find Company</button>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Required Hours" value={requiredHours} suffix="h" icon={Hourglass} accent="blue" />
        <StatCard label="Completed Hours" value={Math.round(completedHours)} suffix="h" icon={CheckCircle2} accent="green" />
        <StatCard label="Remaining Hours" value={Math.round(remainingHours)} suffix="h" icon={Clock} accent="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress card */}
        <Card className="lg:col-span-1 flex flex-col items-center justify-center text-center">
          <h3 className="font-bold text-sti-gray-dark dark:text-white mb-4 self-start">OJT Progress</h3>
          <ProgressCircle percentage={percentage} label="Hours completed" />
          <p className="text-sm text-sti-gray mt-4">
            {Math.round(completedHours)} of {requiredHours} hours rendered
          </p>
        </Card>

        {/* Announcements */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-sti-blue" />
              <h3 className="font-bold text-sti-gray-dark dark:text-white">Recent Announcements</h3>
            </div>
          </div>

          {announcements.length === 0 ? (
            <p className="text-sm text-sti-gray py-8 text-center">No announcements yet. Check back soon.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 rounded-xl border border-black/5 dark:border-white/10 hover:border-sti-blue/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold text-sm text-sti-gray-dark dark:text-white">{a.title}</h4>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${priorityColors[a.priority]}`}>
                      {a.priority}
                    </span>
                  </div>
                  <p className="text-sm text-sti-gray mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-sti-gray/70 mt-2">
                    {new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <h3 className="font-bold text-sti-gray-dark dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(({ to, label, desc, icon: Icon }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex items-center justify-between p-4 rounded-xl border border-black/5 dark:border-white/10 hover:border-sti-blue/30 hover:bg-sti-blue-50/50 dark:hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-sti-blue" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-sti-gray-dark dark:text-white">{label}</p>
                  <p className="text-xs text-sti-gray">{desc}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-sti-gray group-hover:text-sti-blue group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StudentDashboard;
