import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Hourglass, Megaphone, ClipboardList, Camera, FileCheck2, CalendarDays } from 'lucide-react';
import Card from '../components/Card';
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
  const percentage = requiredHours > 0 ? (completedHours / requiredHours) * 100 : 0;

  // 3 big picture cards like STI screenshot (exempt calendar) - aligned, big images
  const bigCards = [
    {
      title: 'Daily Time Record',
      desc: `${completedHours}h / ${requiredHours}h • ${remainingHours}h left`,
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&h=400&fit=crop',
      to: '/my-dtr',
      accent: 'from-sti-blue to-sti-blue-dark',
      icon: Camera
    },
    {
      title: 'My Logs',
      desc: 'Daily task journal',
      image: 'https://images.unsplash.com/photo-1454165205744-3b78555e5572?w=600&h=400&fit=crop',
      to: '/my-logs',
      accent: 'from-sti-yellow to-sti-yellow-dark',
      icon: ClipboardList
    },
    {
      title: 'Requirements',
      desc: 'Upload documents',
      image: 'https://images.unsplash.com/photo-1523289333742-be46e546b7ef?w=600&h=400&fit=crop',
      to: '/requirements',
      accent: 'from-emerald-500 to-emerald-700',
      icon: FileCheck2
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner - big like STI screenshot */}
      <div className="relative overflow-hidden rounded-2xl bg-sti-blue p-6 sm:p-8 h-48 sm:h-56 flex flex-col justify-center">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-16 w-24 h-24 rounded-full bg-sti-yellow/20" />
        <div className="absolute top-4 right-20 w-3 h-3 bg-sti-yellow rounded-full" />
        <div className="absolute bottom-8 left-10 w-2 h-2 bg-white rounded-full" />
        <div className="relative">
          <p className="text-sti-yellow font-semibold text-sm mb-1">
            {student?.ojt_status === 'COMPLETED' ? 'OJT Completed 🎉' : 'Welcome back'}
          </p>
          <h2 className="text-white text-2xl sm:text-3xl font-extrabold">
            WELCOME TO SIMES
          </h2>
          <p className="text-white/90 text-sm sm:text-base font-semibold mt-1">
            Hi, {student?.firstName}! {student?.company?.name ? `• Interning at ${student.company.name}` : '• STI College Sta. Maria'}
          </p>
          <p className="text-white/70 text-xs sm:text-sm mt-2">
            {Math.round(percentage)}% completed • {remainingHours}h remaining
          </p>
        </div>
      </div>

      {/* 3 big picture cards - aligned like STI screenshot, big images */}
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

      {/* Announcements - below the 3 big cards */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-5 h-5 text-sti-blue" />
          <h3 className="font-bold text-sti-gray-dark dark:text-white">Recent Announcements</h3>
        </div>
        {announcements.length === 0 ? (
          <p className="text-sm text-sti-gray py-8 text-center">No announcements yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {announcements.map((a) => (
              <div key={a.id} className="p-4 rounded-xl border border-black/5 dark:border-white/10 hover:border-sti-blue/20 transition-colors">
                <h4 className="font-semibold text-sm text-sti-gray-dark dark:text-white">{a.title}</h4>
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
  );
};

export default StudentDashboard;
