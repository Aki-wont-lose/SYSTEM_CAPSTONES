import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, CheckCircle2, Clock3, Megaphone, ArrowRight, UserPlus, Building2, FileCheck2 } from 'lucide-react';
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

  // 3 big picture cards aligned like STI screenshot (exempt calendar) - admin version
  const bigCards = [
    {
      title: 'Students',
      desc: `${stats.total} total • ${stats.active} active`,
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop',
      to: '/admin/students',
      accent: 'from-sti-blue to-sti-blue-dark',
      icon: Users
    },
    {
      title: 'Companies',
      desc: 'Partner companies',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop',
      to: '/admin/companies',
      accent: 'from-sti-yellow to-sti-yellow-dark',
      icon: Building2
    },
    {
      title: 'Requirements',
      desc: 'Documents review',
      image: 'https://images.unsplash.com/photo-1454165205744-3b78555e5572?w=600&h=400&fit=crop',
      to: '/admin/requirements',
      accent: 'from-emerald-500 to-emerald-700',
      icon: FileCheck2
    },
  ];

  // For coordinator/supervisor, adjust links
  const isCoordinator = window.location.pathname.startsWith('/coordinator');
  const isSupervisor = window.location.pathname.startsWith('/supervisor');
  const prefix = isCoordinator ? '/coordinator' : isSupervisor ? '/supervisor' : '/admin';
  bigCards[0].to = `${prefix}/students`;
  bigCards[1].to = `${prefix}/companies`;
  if (isSupervisor) {
    bigCards[1].title = 'Attendance';
    bigCards[1].desc = 'Time In/Out';
    bigCards[1].to = `${prefix}/attendance`;
  }
  bigCards[2].to = isSupervisor ? `${prefix}/logs` : `${prefix}/requirements`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner - big like STI screenshot */}
      <div className="relative overflow-hidden rounded-2xl bg-sti-blue p-6 sm:p-8 h-48 sm:h-56 flex flex-col justify-center">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-16 w-24 h-24 rounded-full bg-sti-yellow/20" />
        <div className="relative">
          <p className="text-sti-yellow font-semibold text-sm mb-1">Admin Overview</p>
          <h2 className="text-white text-2xl sm:text-3xl font-extrabold">WELCOME TO SIMES</h2>
          <p className="text-white/90 text-sm sm:text-base font-semibold mt-1">STI College Sta. Maria • Program Snapshot</p>
          <p className="text-white/70 text-xs sm:text-sm mt-2">Monitor student progress and manage announcements.</p>
        </div>
      </div>

      {/* 3 big picture cards - aligned like STI screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {bigCards.map((card) => (
          <button
            key={card.to}
            onClick={() => navigate(card.to)}
            className="group relative overflow-hidden rounded-2xl h-48 sm:h-56 text-left shadow-card hover:shadow-cardHover transition-all"
          >
            <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className={`absolute inset-0 bg-gradient-to-t ${card.accent} opacity-80 group-hover:opacity-90 transition-opacity`} />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className="w-5 h-5 text-white" />
                <h3 className="text-white font-bold text-base sm:text-lg">{card.title}</h3>
              </div>
              <p className="text-white/90 text-xs sm:text-sm">{card.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Stats - smaller below */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              onClick={() => navigate(`${prefix}/students`)}
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
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">OJT Hours</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map((s) => {
                  const left = Math.max(0, s.requiredHours - s.completedHours);
                  const pct = s.requiredHours ? Math.round((s.completedHours / s.requiredHours) * 100) : 0;
                  return (
                  <tr key={s.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-sti-gray-dark dark:text-white">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-sti-gray">{s.studentId}</p>
                    </td>
                    <td className="px-6 py-3.5 text-sti-gray-dark dark:text-white">{s.course}</td>
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-sti-gray-dark dark:text-white">{s.completedHours}/{s.requiredHours}h</p>
                      <p className="text-xs text-sti-gray">{left}h left • {pct}%</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[s.ojt_status]}`}>
                        {s.ojt_status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                  );
                })}
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
            onClick={() => navigate(`${prefix}/announcements`)}
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
