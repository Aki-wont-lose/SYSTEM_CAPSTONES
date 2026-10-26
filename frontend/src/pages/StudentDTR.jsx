import { useEffect, useState } from 'react';
import { Clock, CalendarDays, CheckCircle2, XCircle, Hourglass, AlertTriangle, Info } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import { getAttendanceHistory, getStudentSummary } from '../services/attendanceService';

const statusStyles = {
  PRESENT: 'bg-sti-blue-50 text-sti-blue',
  ABSENT: 'bg-red-50 text-red-600',
  LATE: 'bg-yellow-50 text-sti-yellow-dark',
  EXCUSED: 'bg-blue-50 text-blue-600',
};

const reviewConfig = {
  DRAFT: { label: 'Not reviewed', style: 'bg-gray-100 text-sti-gray-dark', Icon: Hourglass },
  SUBMITTED: { label: 'Awaiting review', style: 'bg-yellow-50 text-sti-yellow-dark', Icon: Hourglass },
  APPROVED: { label: 'Approved', style: 'bg-green-50 text-green-700', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', style: 'bg-red-50 text-red-600', Icon: XCircle },
};

const formatTime = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const StudentDTR = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    try {
      const [historyRes, summaryRes] = await Promise.all([
        getAttendanceHistory(90),
        getStudentSummary()
      ]);
      setHistory(historyRes.data || []);
      setSummary(summaryRes.data);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not load your attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = summary?.attendance;
  const requiredHours = stats?.requiredHours ?? summary?.student?.requiredHours ?? 0;
  const totalHours = stats?.totalHours ?? 0;
  const remainingHours = stats?.remainingHours ?? Math.max(0, requiredHours - totalHours);
  const progress = stats?.progressPercent ?? 0;
  const incomplete = history.filter((r) => !r.timeIn || !r.timeOut);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-sti-blue" />
          </div>
          <div>
            <p className="font-bold text-sti-gray-dark dark:text-white">My Attendance</p>
            <p className="text-xs text-sti-gray">Read-only record of the hours recorded by your company supervisor.</p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs text-sti-gray bg-sti-blue-50/60 dark:bg-white/5 rounded-xl px-3 py-2 max-w-md">
          <Info className="w-4 h-4 text-sti-blue shrink-0 mt-0.5" />
          <span>Time in and time out are recorded by your assigned supervisor. If a day looks wrong or incomplete, contact your supervisor or coordinator.</span>
        </div>
      </Card>

      {message && (
        <div className="text-sm px-4 py-3 rounded-xl border bg-red-50 text-red-600 border-red-100">{message}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Accumulated Hours" value={totalHours} suffix="h" icon={Clock} accent="green" />
        <StatCard label="Required Hours" value={requiredHours} suffix="h" icon={CalendarDays} accent="blue" />
        <StatCard label="Remaining Hours" value={remainingHours} suffix="h" icon={Clock} accent="yellow" />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-bold text-sti-gray-dark dark:text-white">Internship Progress</p>
          <p className="text-sm font-semibold text-sti-blue">{progress}%</p>
        </div>
        <div className="w-full h-2.5 rounded-full bg-sti-gray-light dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-sti-blue transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-sti-gray mt-2">
          {totalHours} of {requiredHours} required OJT hours completed
          {remainingHours > 0 ? ` · ${remainingHours}h to go` : ' · requirement met'}
        </p>
      </Card>

      {incomplete.length > 0 && (
        <Card className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {incomplete.length} day{incomplete.length > 1 ? 's' : ''} with an incomplete time record
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              A missing time in or time out cannot be counted as duty hours. Please ask your assigned supervisor to complete or correct the record.
            </p>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="font-bold text-sti-gray-dark dark:text-white">Attendance History</h3>
          <p className="text-xs text-sti-gray mt-1">Only approved and complete days count toward your accumulated hours.</p>
        </div>

        {history.length === 0 ? (
          <div className="py-14 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6 text-sti-blue" />
            </div>
            <p className="text-sm font-medium text-sti-gray-dark dark:text-white">No attendance records yet</p>
            <p className="text-xs text-sti-gray mt-1">Your supervisor will record your time in and time out once your duty starts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/10 text-left">
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Time In</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Time Out</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Total Hours</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => {
                  const reviewState = reviewConfig[record.reviewStatus] || reviewConfig.DRAFT;
                  const isIncomplete = !record.timeIn || !record.timeOut;
                  const isCounted = record.reviewStatus === 'APPROVED' && !isIncomplete;

                  return (
                    <tr key={record.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-sti-gray-dark dark:text-slate-200 whitespace-nowrap">{formatDate(record.date)}</td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {record.timeIn
                          ? <span className="text-sti-gray-dark dark:text-slate-300">{formatTime(record.timeIn)}</span>
                          : <span className="text-xs font-semibold text-amber-600">Missing</span>}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {record.timeOut
                          ? <span className="text-sti-gray-dark dark:text-slate-300">{formatTime(record.timeOut)}</span>
                          : <span className="text-xs font-semibold text-amber-600">Missing</span>}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {isIncomplete ? (
                          <span className="text-xs text-sti-gray" title="An incomplete day is not counted">Not counted</span>
                        ) : (
                          <span className={`font-medium ${isCounted ? 'text-sti-gray-dark dark:text-slate-300' : 'text-sti-gray line-through'}`}>
                            {(record.renderedHours || 0).toFixed(2)}h
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[record.status] || 'bg-gray-100 text-sti-gray-dark'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${reviewState.style}`}>
                          <reviewState.Icon className="w-3.5 h-3.5" /> {reviewState.label}
                        </span>
                        {record.reviewedByName && (
                          <p className="text-[11px] text-sti-gray mt-1 whitespace-nowrap">by {record.reviewedByName}</p>
                        )}
                        {record.reviewStatus === 'REJECTED' && record.reviewRemarks && (
                          <p className="text-[11px] text-red-600 mt-1 max-w-[16rem]">{record.reviewRemarks}</p>
                        )}
                        {isIncomplete && (
                          <p className="text-[11px] text-amber-600 mt-1 max-w-[16rem]">Ask your supervisor to complete this record.</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentDTR;
