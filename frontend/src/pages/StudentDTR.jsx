import { useEffect, useState } from 'react';
import { LogIn, LogOut as LogOutIcon, Clock, CalendarDays, ImageIcon, Send, CheckCircle2, XCircle, Hourglass, ShieldCheck } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import Button from '../components/Button';
import CameraCapture from '../components/CameraCapture';
import { getAttendanceHistory, getStudentSummary, timeIn, timeOut, submitDtrForReview } from '../services/attendanceService';

const statusStyles = {
  PRESENT: 'bg-sti-blue-50 text-sti-blue',
  ABSENT: 'bg-red-50 text-red-600',
  LATE: 'bg-yellow-50 text-sti-yellow-dark',
  EXCUSED: 'bg-blue-50 text-blue-600',
};

const reviewConfig = {
  DRAFT: { label: 'Not Submitted', style: 'bg-gray-100 text-sti-gray-dark', Icon: Hourglass },
  SUBMITTED: { label: 'Awaiting Approval', style: 'bg-yellow-50 text-sti-yellow-dark', Icon: Hourglass },
  APPROVED: { label: 'Approved', style: 'bg-green-50 text-green-700', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', style: 'bg-red-50 text-red-600', Icon: XCircle },
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
  const [submittingId, setSubmittingId] = useState(null);
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
      setMessage(err.response?.data?.message || 'Could not load your DTR');
      setMessageType('error');
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

  const handleSubmitForReview = async (record) => {
    setSubmittingId(record.id);
    setMessage('');
    try {
      await submitDtrForReview(record.id);
      setMessage(`${formatDate(record.date)} sent for supervisor approval.`);
      setMessageType('success');
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not submit this DTR.');
      setMessageType('error');
    } finally {
      setSubmittingId(null);
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
  const review = stats?.review;
  const submittable = history.filter(
    (r) => r.timeIn && r.timeOut && (r.reviewStatus === 'DRAFT' || r.reviewStatus === 'REJECTED')
  );

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

      {submittable.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-sti-blue" />
            <h3 className="font-bold text-sti-gray-dark dark:text-white">Ready for Approval</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sti-blue-50 text-sti-blue">{submittable.length}</span>
          </div>
          <p className="text-xs text-sti-gray mb-3">Time in and time out are complete. Send each day to your supervisor for approval.</p>
          <div className="space-y-2">
            {submittable.map((record) => (
              <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-black/5 dark:border-white/10">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sti-gray-dark dark:text-white">{formatDate(record.date)}</p>
                  <p className="text-xs text-sti-gray">
                    {formatTime(record.timeIn)} → {formatTime(record.timeOut)} · {record.renderedHours?.toFixed(2)}h
                    {record.reviewStatus === 'REJECTED' && record.reviewRemarks && (
                      <span className="text-red-600"> · Reason: {record.reviewRemarks}</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="primary"
                  icon={Send}
                  className="shrink-0"
                  loading={submittingId === record.id}
                  onClick={() => handleSubmitForReview(record)}
                >
                  Submit
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {review && review.submitted > 0 && (
        <Card className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
          <Hourglass className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">{review.submitted} day(s)</span> awaiting supervisor approval
            {review.rejected > 0 && <> · <span className="font-semibold text-red-600">{review.rejected} rejected</span></>}
            {review.approved > 0 && <> · <span className="font-semibold text-green-700">{review.approved} approved</span></>}
          </p>
        </Card>
      )}

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
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Approval</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Photo</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => {
                  const reviewState = reviewConfig[record.reviewStatus] || reviewConfig.DRAFT;
                  return (
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
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${reviewState.style}`}>
                          <reviewState.Icon className="w-3.5 h-3.5" /> {reviewState.label}
                        </span>
                        {record.reviewStatus === 'REJECTED' && record.reviewRemarks && (
                          <p className="text-[11px] text-red-600 mt-1 max-w-[16rem]">{record.reviewRemarks}</p>
                        )}
                        {record.reviewedByName && record.reviewStatus !== 'REJECTED' && (
                          <p className="text-[11px] text-sti-gray mt-1 whitespace-nowrap">by {record.reviewedByName}</p>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {record.timeInPhoto ? (
                          <button onClick={() => setPreviewRecord(record)} className="text-sti-blue hover:text-sti-blue-dark">
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
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
