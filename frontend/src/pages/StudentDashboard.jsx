import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Hourglass, Megaphone } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import CalendarWidget from '../components/CalendarWidget';
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
      {/* Aligned like STI screenshot: main yellow + right calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <div className="bg-[#ffeb00] rounded-2xl p-5 sm:p-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-1">
              <div className="flex-1">
                <h2 className="text-[#0a4a8a] font-black text-xl">How's Your Experience?</h2>
                <p className="text-[#0a4a8a] text-sm mt-1">Tell us more about it and rate us, whether it was great, or you feel there's room for improvement.</p>
                <p className="text-[#0a4a8a] text-xs mt-4">Leave a comment by scanning QR or clicking</p>
                <span className="inline-block mt-2 bg-white border-2 border-[#0a4a8a] text-[#0a4a8a] font-bold text-xs px-3 py-1 rounded">feedback.sti.edu</span>
                <p className="text-[#0a4a8a] text-xs mt-3">Hi, {student?.firstName}! • {student?.company?.name ? `Interning at ${student.company.name}` : 'Keep tracking your progress.'}</p>
              </div>
              <div className="w-32 h-32 bg-white rounded-xl border-2 border-[#0a4a8a] flex items-center justify-center shrink-0">
                <div className="w-20 h-20 border-2 border-dashed border-[#0a4a8a] rounded-lg flex items-center justify-center text-[10px] text-[#0a4a8a] text-center">QR<br/>STI Cares</div>
              </div>
            </div>
            <div className="mt-4 bg-[#0a4a8a] -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 px-5 py-2 rounded-b-2xl flex items-center justify-between">
              <span className="text-white text-xs">STI Feedback Center • {completedHours}h / {requiredHours}h</span>
              <span className="bg-[#ffeb00] text-[#0a4a8a] text-xs font-black px-2 py-1 rounded">STI</span>
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
