import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Hourglass, Megaphone } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import CalendarWidget from '../components/CalendarWidget';
import WelcomeCarousel from '../components/WelcomeCarousel';
import { useAuth } from '../hooks/useAuth';
import { getStudentSummary } from '../services/attendanceService';
import { getActiveAnnouncements } from '../services/announcementService';

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top: carousel + calendar like admin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <WelcomeCarousel />
          <div className="mt-2 bg-sti-blue rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-sm">Hi, {student?.firstName}! • {student?.company?.name ? `Interning at ${student.company.name}` : 'Keep tracking your progress.'}</p>
              <p className="text-white/70 text-xs">{completedHours}h / {requiredHours}h • {remainingHours}h left</p>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <CalendarWidget />
        </div>
      </div>

      {/* Announcements in middle - fitted whole photo, aligned to Welcome width */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-3">
          {announcements.length === 0 ? (
            <Card className="text-center py-6"><p className="text-sm text-sti-gray">No announcements yet</p></Card>
          ) : (
            announcements.slice(0,2).map((a) => (
              <Card key={a.id} className="p-0 overflow-hidden">
                {a.image && <img src={a.image} alt={a.title} className="w-full max-h-80 object-contain bg-sti-gray-light dark:bg-slate-900" />}
                <div className="p-3">
                  <h4 className="font-semibold text-sm text-sti-gray-dark dark:text-white">{a.title}</h4>
                  <p className="text-sm text-sti-gray mt-1 line-clamp-2">{a.content}</p>
                </div>
              </Card>
            ))
          )}
        </div>
        <div className="hidden lg:block" />
      </div>

      {/* Stats - 3 like STI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Required Hours" value={requiredHours} suffix="h" icon={Hourglass} accent="blue" />
        <StatCard label="Completed Hours" value={Math.round(completedHours)} suffix="h" icon={CheckCircle2} accent="green" />
        <StatCard label="Remaining Hours" value={Math.round(remainingHours)} suffix="h" icon={Clock} accent="yellow" />
      </div>
    </div>
  );
};

export default StudentDashboard;
