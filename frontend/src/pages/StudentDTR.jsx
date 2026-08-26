import { useEffect, useState } from 'react';
import { LogIn, LogOut as LogOutIcon, Clock, CalendarDays, ImageIcon } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import Button from '../components/Button';
import CameraCapture from '../components/CameraCapture';
import { getAttendanceHistory, getStudentSummary, timeIn, timeOut } from '../services/attendanceService';

const statusStyles = {
  PRESENT: 'bg-sti-blue-50 text-sti-blue',
  ABSENT: 'bg-red-50 text-red-600',
  LATE: 'bg-yellow-50 text-sti-yellow-dark',
  EXCUSED: 'bg-blue-50 text-blue-600',
};

const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const StudentDTR = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [cameraMode, setCameraMode] = useState(null); // 'in' | 'out' | null
  const [previewRecord, setPreviewRecord] = useState(null);

  const loadData = async () => {
    try {
      const [historyRes, summaryRes] = await Promise.all([
        getAttendanceHistory(60),
        getStudentSummary()
      ]);
      setHistory(historyRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCapture = async (photo) => {
    const mode = cameraMode;
    setCameraMode(null);
    setActionLoading(true);
    setMessage('');
    try {
      if (mode === 'in') {
        await timeIn(photo);
        setMessage('Time in recorded successfully.');
      } else {
        await timeOut(photo);
        setMessage('Time out recorded successfully.');
      }
      setMessageType('success');
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || `Failed to record time ${mode}.`);
      setMessageType('error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = summary?.attendance;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Time in/out action bar */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-sti-blue" />
          </div>
          <div>
            <p className="font-bold text-sti-gray-dark dark:text-white">Daily Time Record</p>
            <p className="text-xs text-sti-gray">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · Camera verification required</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" icon={LogIn} onClick={() => setCameraMode('in')} loading={actionLoading}>
            Time In
          </Button>
          <Button variant="secondary" icon={LogOutIcon} onClick={() => setCameraMode('out')} loading={actionLoading}>
            Time Out
          </Button>
        </div>
      </Card>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          messageType === 'success'
            ? 'bg-sti-blue-50 text-sti-blue border-sti-blue-100'
            : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Rendered Hours" value={stats?.totalHours ?? 0} suffix="h" icon={Clock} accent="green" />
        <StatCard label="Present Days" value={stats?.presentDays ?? 0} icon={CalendarDays} accent="blue" />
        <StatCard label="Remaining Hours" value={stats?.remainingHours ?? 0} suffix="h" icon={Clock} accent="yellow" />
      </div>

      {/* Attendance history table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="font-bold text-sti-gray-dark dark:text-white mb-4">Attendance History</h3>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-sti-gray py-12 text-center">No attendance records yet. Log your first Time In above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/10 text-left">
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Time In</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Time Out</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Rendered Hours</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Photo</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-sti-gray-dark dark:text-slate-200 whitespace-nowrap">{formatDate(record.date)}</td>
                    <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-300">{formatTime(record.timeIn)}</td>
                    <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-300">{formatTime(record.timeOut)}</td>
                    <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-300 font-medium">{record.renderedHours?.toFixed(2)}h</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[record.status]}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      {record.timeInPhoto ? (
                        <button onClick={() => setPreviewRecord(record)} className="text-sti-blue hover:text-sti-blue-dark">
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {cameraMode && (
        <CameraCapture
          title={cameraMode === 'in' ? 'Verify Time In' : 'Verify Time Out'}
          onCapture={handleCapture}
          onClose={() => setCameraMode(null)}
        />
      )}

      {previewRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setPreviewRecord(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-bold text-sti-gray-dark dark:text-white mb-3">{formatDate(previewRecord.date)}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-sti-gray mb-1">Time In</p>
                {previewRecord.timeInPhoto
                  ? <img src={previewRecord.timeInPhoto} className="rounded-lg w-full aspect-square object-cover" />
                  : <div className="rounded-lg w-full aspect-square bg-sti-gray-light dark:bg-slate-700 flex items-center justify-center text-xs text-sti-gray">No photo</div>}
              </div>
              <div>
                <p className="text-xs text-sti-gray mb-1">Time Out</p>
                {previewRecord.timeOutPhoto
                  ? <img src={previewRecord.timeOutPhoto} className="rounded-lg w-full aspect-square object-cover" />
                  : <div className="rounded-lg w-full aspect-square bg-sti-gray-light dark:bg-slate-700 flex items-center justify-center text-xs text-sti-gray">No photo</div>}
              </div>
            </div>
            <Button variant="secondary" className="w-full mt-4" onClick={() => setPreviewRecord(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDTR;
