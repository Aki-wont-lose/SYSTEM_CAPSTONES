import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, CheckCircle2, Clock3 } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import CalendarWidget from '../components/CalendarWidget';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../services/studentService').then(({ getDashboardStats }) => {
      getDashboardStats().then(res => setStats(res.data)).catch(console.error).finally(()=>setLoading(false));
    });
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
      {/* Aligned like STI screenshot: main yellow Welcome + right calendar sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main - How's Your Experience yellow like STI */}
        <div className="lg:col-span-2">
          <div className="bg-[#ffeb00] rounded-2xl p-5 sm:p-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-1">
              <div className="flex-1">
                <h2 className="text-[#0a4a8a] font-black text-xl">How's Your Experience?</h2>
                <p className="text-[#0a4a8a] text-sm mt-1">Tell us more about it and rate us, whether it was great, or you feel there's room for improvement.</p>
                <p className="text-[#0a4a8a] text-xs mt-4">Leave a comment, feedback, or suggestions by scanning the QR code or clicking</p>
                <span className="inline-block mt-2 bg-white border-2 border-[#0a4a8a] text-[#0a4a8a] font-bold text-xs px-3 py-1 rounded">feedback.sti.edu</span>
              </div>
              <div className="w-32 h-32 bg-white rounded-xl border-2 border-[#0a4a8a] flex items-center justify-center shrink-0">
                <div className="w-20 h-20 border-2 border-dashed border-[#0a4a8a] rounded-lg flex items-center justify-center text-[10px] text-[#0a4a8a] text-center">QR<br/>STI Cares</div>
              </div>
            </div>
            <div className="mt-4 bg-[#0a4a8a] -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 px-5 py-2 rounded-b-2xl flex items-center justify-between">
              <span className="text-white text-xs">STI Feedback Center</span>
              <span className="bg-[#ffeb00] text-[#0a4a8a] text-xs font-black px-2 py-1 rounded">STI</span>
            </div>
          </div>
        </div>
        {/* Right sidebar - Calendar like STI */}
        <div className="lg:col-span-1 space-y-4">
          <CalendarWidget />
          <Card>
            <h3 className="font-bold text-sm text-sti-gray-dark dark:text-white">Announcements</h3>
            <p className="text-xs text-sti-gray mt-1">View and manage announcements</p>
            <button onClick={() => navigate('/admin/announcements')} className="text-xs text-sti-blue font-semibold mt-2">Go to Announcements →</button>
          </Card>
        </div>
      </div>

      {/* Stats - 2 and 2, aligned */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Total Students" value={stats.total} icon={Users} accent="blue" />
        <StatCard label="Active Students" value={stats.active} icon={UserCheck} accent="green" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="yellow" />
        <StatCard label="Pending" value={stats.pending} icon={Clock3} accent="red" />
      </div>

      <Card>
        <h3 className="font-bold text-sti-gray-dark dark:text-white">Recent Students</h3>
        <p className="text-sm text-sti-gray mt-1">Manage via Account Management → Create Account</p>
      </Card>
    </div>
  );
};

export default AdminDashboard;
