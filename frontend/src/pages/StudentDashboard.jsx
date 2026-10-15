import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, Hourglass, CalendarClock, AlertCircle, BookOpen } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import CalendarWidget from '../components/CalendarWidget';
import WelcomeCarousel from '../components/WelcomeCarousel';
import { useAuth } from '../hooks/useAuth';
import { getStudentSummary } from '../services/attendanceService';
import { getActiveAnnouncements, parseAnnouncementPhotos } from '../services/announcementService';
import { getMyWeeklyTasks, completeWeeklyTask } from '../services/requirementService';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

const isTodayDate = (dateVal) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const isUpcomingDate = (dateVal) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return d > now && d <= sevenDaysLater;
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [summaryRes, announcementsRes, tasksRes] = await Promise.all([
          getStudentSummary(),
          getActiveAnnouncements(4),
          getMyWeeklyTasks(),
        ]);
        setSummary(summaryRes.data);
        setAnnouncements(announcementsRes.data);
        setTasks(tasksRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleComplete = async (taskId) => {
    setBusyId(taskId);
    try {
      await completeWeeklyTask(taskId);
      const res = await getMyWeeklyTasks();
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

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

  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const todayTasks = pendingTasks.filter((t) => isTodayDate(t.dueDate) || isTodayDate(t.weekOf));
  const upcomingTasks = pendingTasks.filter((t) => isUpcomingDate(t.dueDate));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main grid: left/middle (2/3) + right panel (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* ── Left / Middle column ── */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Welcome carousel */}
          <WelcomeCarousel />

          {/* Student greeting bar */}
          <div className="bg-sti-blue rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-sm">
                Hi{student?.firstName ? `, ${student.firstName}` : ''}! •{' '}
                {student?.company?.name ? `Interning at ${student.company.name}` : 'Keep tracking your progress.'}
              </p>
              <p className="text-white/70 text-xs">
                {completedHours}h / {requiredHours}h completed • {remainingHours}h remaining
              </p>
            </div>
          </div>

          {/* Announcements (middle) */}
          <div>
            <h2 className="text-sm font-bold text-sti-gray-dark dark:text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sti-blue" />
              Announcements
            </h2>
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <Card className="text-center py-6">
                  <p className="text-sm text-sti-gray">No announcements yet</p>
                </Card>
              ) : (
                announcements.slice(0, 2).map((a) => {
                  const photos = parseAnnouncementPhotos(a);
                  return (
                    <Card key={a.id} className="p-0 overflow-hidden">
                      {photos.length === 1 && (
                        <img src={photos[0]} alt={a.title} className="w-full max-h-80 object-contain bg-sti-gray-light dark:bg-slate-900" />
                      )}
                      {photos.length > 1 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-sti-gray-light dark:bg-slate-900">
                          {photos.map((src, i) => (
                            <img key={i} src={src} alt={`${a.title} ${i + 1}`} className="w-full aspect-square object-cover" />
                          ))}
                        </div>
                      )}
                      <div className="p-3">
                        <h4 className="font-semibold text-sm text-sti-gray-dark dark:text-white">{a.title}</h4>
                        <p className="text-sm text-sti-gray mt-1 line-clamp-2">{a.content}</p>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel — stacked widgets (Calendar, To-Do, Today, Upcoming) ── */}
        <div className="space-y-4">

          {/* Calendar */}
          <CalendarWidget />

          {/* To-Do */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-black/5 dark:border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-sti-gray-dark dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sti-blue" />
                To-do
              </h3>
              {pendingTasks.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sti-blue-50 text-sti-blue">
                  {pendingTasks.length}
                </span>
              )}
            </div>
            {pendingTasks.length === 0 ? (
              <p className="text-xs text-sti-gray py-1">Nothing pending. Great job!</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-sti-gray-light dark:bg-white/5">
                    <button
                      onClick={() => handleComplete(task.id)}
                      disabled={busyId === task.id}
                      className="w-5 h-5 rounded-full border-2 border-sti-blue/50 flex items-center justify-center shrink-0 hover:bg-sti-blue hover:border-sti-blue transition-colors disabled:opacity-40"
                      title="Mark done"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-sti-gray-dark dark:text-white truncate">{task.title}</p>
                      {task.dueDate && (
                        <p className="text-[10px] text-sti-gray">Due {formatDate(task.dueDate)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {pendingTasks.length > 4 && (
                  <p className="text-[11px] text-sti-gray text-center pt-1">+{pendingTasks.length - 4} more</p>
                )}
              </div>
            )}
          </div>

          {/* Today */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-black/5 dark:border-white/5 p-4">
            <h3 className="font-bold text-sm text-sti-gray-dark dark:text-white flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-sti-blue" />
              Today
            </h3>
            {todayTasks.length === 0 ? (
              <p className="text-xs text-sti-gray py-1">Nothing due today. 🎉</p>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2 p-2.5 rounded-xl border border-sti-blue/20 bg-sti-blue-50/50 dark:bg-sti-blue/10">
                    <CalendarClock className="w-4 h-4 text-sti-blue shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-sti-gray-dark dark:text-white truncate">{task.title}</p>
                      <p className="text-[10px] text-sti-blue font-medium">Due today</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming — things they need to pass */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-black/5 dark:border-white/5 p-4">
            <h3 className="font-bold text-sm text-sti-gray-dark dark:text-white flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Upcoming
            </h3>
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-sti-gray py-1">No deadlines in the next 7 days.</p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start gap-2 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-sti-gray-dark dark:text-white truncate">{task.title}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Due {formatDate(task.dueDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Stats row at the bottom */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Required Hours" value={requiredHours} suffix="h" icon={Hourglass} accent="blue" />
        <StatCard label="Completed Hours" value={Math.round(completedHours)} suffix="h" icon={CheckCircle2} accent="green" />
        <StatCard label="Remaining Hours" value={Math.round(remainingHours)} suffix="h" icon={Clock} accent="yellow" />
      </div>
    </div>
  );
};

export default StudentDashboard;

