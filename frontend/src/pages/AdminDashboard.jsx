import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, CheckCircle2, Clock3, GraduationCap, Building2, FileCheck2, ClipboardList, ArrowRight, Sparkles } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import CalendarWidget from '../components/CalendarWidget';
import WelcomeCarousel from '../components/WelcomeCarousel';
import { CardSkeleton } from '../components/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { getDashboardStats } from '../services/studentService';
import { getActiveAnnouncements } from '../services/announcementService';

const PROGRAM_ORDER = ['BSIT', 'BSCS', 'BSCPE', 'ACT', 'BSHM', 'BSTM', 'BSAIS'];

// Show the admin/coordinator dashboard with announcements, program stats, and status counts
const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard stats and latest announcements together on mount
  useEffect(() => {
    Promise.all([
      getDashboardStats().then((r) => r.data),
      getActiveAnnouncements().then((r) => r.data.slice(0, 3)).catch(() => [])
    ])
      .then(([statsData, annData]) => {
        setStats(statsData);
        setAnnouncements(annData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <CardSkeleton count={4} />
      </div>
    );
  }

  const byCourse = stats?.byCourse || {};
  // Build the program rows, known programs first then any extras
  const programRows = [
    ...PROGRAM_ORDER.filter((p) => byCourse[p] != null).map((p) => ({ label: p, value: byCourse[p] })),
    ...Object.entries(byCourse)
      .filter(([key]) => !PROGRAM_ORDER.includes(key))
      .map(([label, value]) => ({ label, value }))
  ];
  // Largest program count so bars can be scaled to 100%
  const maxProgram = Math.max(1, ...programRows.map((r) => r.value));
  const totalInterns = stats?.totalStudents ?? stats?.total ?? 0;
  const activeInterns = stats?.active ?? 0;
  const completedInterns = stats?.completed ?? 0;
  const pendingInterns = stats?.pending ?? 0;
  const partnerCompanies = stats?.partnerCompanies ?? 0;
  const placementRate = totalInterns > 0 ? Math.round(((activeInterns + completedInterns) / totalInterns) * 100) : 0;
  const completionRate = totalInterns > 0 ? Math.round((completedInterns / totalInterns) * 100) : 0;

  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const rolePrefix = user?.role === 'COORDINATOR' ? '/coordinator' : user?.role === 'SUPERVISOR' ? '/supervisor' : '/admin';
  const quickLinks = isSuperAdmin
    ? [
        { to: '/admin/accounts', label: 'Account Management', icon: Users },
        { to: '/admin/companies', label: 'Partner Companies', icon: Building2 },
        { to: '/admin/templates', label: 'Templates', icon: FileCheck2 }
      ]
    : user?.role === 'COORDINATOR'
      ? [
          { to: '/coordinator/accounts', label: 'Account Management', icon: Users },
          { to: '/coordinator/companies', label: 'Partner Companies', icon: Building2 },
          { to: '/coordinator/templates', label: 'Templates', icon: FileCheck2 },
          { to: '/coordinator/submissions', label: 'Submissions', icon: ClipboardList }
        ]
      : user?.role === 'SUPERVISOR'
        ? [
            { to: '/supervisor/students', label: 'View Students', icon: Users },
            { to: '/supervisor/attendance', label: 'Record Attendance', icon: Clock3 },
            { to: '/supervisor/submissions', label: 'Submissions', icon: ClipboardList }
          ]
        : [
            { to: '/admin/accounts', label: 'Account Management', icon: Users },
            { to: '/admin/companies', label: 'Partner Companies', icon: Building2 },
            { to: '/admin/templates', label: 'Templates', icon: FileCheck2 },
            { to: '/admin/submissions', label: 'Submissions', icon: ClipboardList }
          ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main content (left) + quick info (right). items-start keeps every card at
          its natural height so a short card never stretches into empty space. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <WelcomeCarousel />

          {/* Upgraded Quick Overview & Shortcuts Bar */}
          <Card className="p-4 sm:p-5 bg-gradient-to-r from-sti-blue/5 via-white to-sti-yellow/10 dark:from-sti-blue/15 dark:via-slate-800 dark:to-slate-800 border border-sti-blue/15">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sti-blue shrink-0" />
                  <h3 className="font-bold text-sm sm:text-base text-sti-gray-dark dark:text-white">
                    Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
                  </h3>
                  {user?.coordinatorCourse && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sti-blue text-white">
                      {user.coordinatorCourse}
                    </span>
                  )}
                </div>
                <p className="text-xs text-sti-gray mt-1">
                  {placementRate}% placement rate • {completionRate}% completion rate • {partnerCompanies} active partner {partnerCompanies === 1 ? 'company' : 'companies'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-700 text-sti-gray-dark dark:text-slate-100 border border-black/10 dark:border-white/10 hover:border-sti-blue hover:text-sti-blue transition-colors shadow-sm"
                    >
                      <Icon className="w-3.5 h-3.5 text-sti-blue" />
                      {item.label}
                      <ArrowRight className="w-3 h-3 opacity-60" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </Card>

          {announcements.length === 0 ? (
            <Card><p className="text-sm text-sti-gray text-center py-6">No announcements yet</p></Card>
          ) : announcements.map((a) => (
            <Card key={a.id} className="p-0 overflow-hidden">
              {a.image && <img src={a.image} alt={a.title} className="w-full h-56 object-cover" />}
              <div className="p-4">
                <h4 className="font-bold text-sm">{a.title}</h4>
                <p className="text-sm text-sti-gray mt-1">{a.content}</p>
                <p className="text-xs text-sti-gray/70 mt-2">{new Date(a.publishedAt || a.createdAt).toLocaleDateString()}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <CalendarWidget />
          <Card>
            <h3 className="font-bold text-sti-gray-dark dark:text-white text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sti-blue" /> Interns per Program
            </h3>
            {programRows.length === 0 ? (
              <p className="text-sm text-sti-gray mt-3">No program data yet.</p>
            ) : (
              <div className="space-y-3 mt-4">
                {programRows.map(({ label, value }) => {
                  const percent = Math.round((value / maxProgram) * 100);
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-sti-gray-dark dark:text-slate-200">{label}</span>
                        <span className="text-sti-gray">{value} {value === 1 ? 'intern' : 'interns'}</span>
                      </div>
                      <div className="w-full bg-sti-gray-light dark:bg-slate-700/60 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-sti-blue h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Headline status counts */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Enrolled Interns" value={totalInterns} icon={Users} accent="blue" />
        <StatCard label="Ongoing Interns" value={activeInterns} icon={UserCheck} accent="green" />
        <StatCard label="Pending Placement" value={pendingInterns} icon={Clock3} accent="red" />
        <StatCard label="Completed OJT" value={completedInterns} icon={CheckCircle2} accent="yellow" />
        <StatCard label="Partner Companies" value={partnerCompanies} icon={Building2} accent="blue" />
      </div>

      <Card className="flex items-center gap-2 text-sm text-sti-gray">
        <Clock3 className="w-4 h-4 text-sti-blue shrink-0" />
        <span>Manage interns, accounts, and requirements from their respective pages.</span>
      </Card>
    </div>
  );
};

export default AdminDashboard;
