import { useEffect, useState } from 'react';
import { Clock, CalendarDays, Search, Image as ImageIcon, X, ShieldCheck, Check, XCircle, Filter, ChevronDown, ChevronRight, Hourglass, CheckCircle2 } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getAllStudents } from '../services/studentService';
import { getStudentAttendanceForStaff, getStudentSummaryForStaff, getDtrReviewQueue, reviewDtr } from '../services/attendanceService';
import { sectionLabel } from '../constants/studentRules';

const reviewStyles = {
  DRAFT: 'bg-gray-100 text-sti-gray-dark',
  SUBMITTED: 'bg-yellow-50 text-sti-yellow-dark',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-600',
};

// Friendly labels so review states read as plain English instead of raw enums.
const reviewLabels = {
  DRAFT: 'Not submitted',
  SUBMITTED: 'Awaiting approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const reviewIcons = {
  DRAFT: Hourglass,
  SUBMITTED: Hourglass,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

const statusLabels = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED: 'Excused',
};

const formatTime = (dateStr) => (dateStr ? new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—');

const formatDate = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const AttendanceMonitoring = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [queue, setQueue] = useState({ records: [], byStudent: [], total: 0 });
  const [queueStatus, setQueueStatus] = useState('SUBMITTED');
  const [queueCourse, setQueueCourse] = useState('');
  const [queueLoading, setQueueLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    getAllStudents().then(res => setStudents(res.data)).catch(console.error).finally(()=>setLoading(false));
  }, []);

  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await getDtrReviewQueue({ status: queueStatus, course: queueCourse || undefined });
      setQueue(res.data);
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not load the approval queue');
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [queueStatus, queueCourse]);

  const filtered = students.filter(s =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (student) => {
    setSelected(student);
    setLoadingDetail(true);
    try {
      const [attRes, sumRes] = await Promise.all([
        getStudentAttendanceForStaff(student.id, 30),
        getStudentSummaryForStaff(student.id)
      ]);
      setHistory(attRes.data || []);
      setSummary(sumRes.data?.attendance || null);
    } catch (e) { console.error(e); } finally { setLoadingDetail(false); }
  };

  const handleDecision = async (record, status) => {
    setActionError('');
    setBusyId(record.id);
    try {
      await reviewDtr(record.id, status, status === 'REJECTED' ? remarks : undefined);
      setRejecting(null);
      setRemarks('');
      await loadQueue();
      if (selected) handleSelect(selected);
    } catch (e) {
      setActionError(e.response?.data?.message || 'Could not save the decision');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-sti-blue" /> Daily Time Record Monitoring</h1>
        <p className="text-sm text-sti-gray">
          Review and approve the daily time records of the students assigned to you.
        </p>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
          <X className="w-4 h-4" /> {actionError}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-black/5 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sti-blue" />
            <h3 className="font-bold text-sti-gray-dark dark:text-white">DTR Approvals</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sti-blue-50 text-sti-blue">{queue.total}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center rounded-xl border border-black/10 dark:border-white/10 p-0.5 bg-sti-gray-light/50 dark:bg-white/5">
              {[
                { value: 'SUBMITTED', label: 'Awaiting' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setQueueStatus(tab.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    queueStatus === tab.value
                      ? 'bg-white dark:bg-slate-700 text-sti-blue shadow-sm'
                      : 'text-sti-gray hover:text-sti-gray-dark dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-44">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
              <select value={queueCourse} onChange={e=>setQueueCourse(e.target.value)} className="input-field pl-9 py-2">
                <option value="">All programs</option>
                <option value="BSIT">BSIT</option>
                <option value="BSCS">BSCS</option>
                <option value="BSCPE">BSCPE</option>
                <option value="BSACT">BSACT</option>
                <option value="BSHM">BSHM</option>
                <option value="BSTM">BSTM</option>
                <option value="BSAIS">BSAIS</option>
              </select>
            </div>
          </div>
        </div>

        {queueLoading ? (
          <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-sti-blue border-t-transparent rounded-full animate-spin" /></div>
        ) : queue.byStudent.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-full bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-sti-blue" />
            </div>
            <p className="text-sm font-medium text-sti-gray-dark dark:text-white">
              {queueStatus === 'SUBMITTED' ? 'Nothing waiting for approval' : 'No records match this filter'}
            </p>
            <p className="text-xs text-sti-gray mt-1">
              {queueStatus === 'SUBMITTED' ? 'Submitted DTRs will appear here for review.' : 'Try a different status or program.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {queue.byStudent.map((entry) => {
              const records = queue.records.filter(r => r.studentId === entry.studentId);
              const isOpen = expanded === entry.studentId;
              return (
                <div key={entry.studentId}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : entry.studentId)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 text-left transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-sti-blue">
                          {(entry.name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{entry.name}</p>
                        <p className="text-xs text-sti-gray">{entry.studentNumber} • {entry.course} {sectionLabel(entry.section, entry.course)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs">
                      {entry.submitted > 0 && <span className="font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-sti-yellow-dark">{entry.submitted} pending</span>}
                      {entry.approved > 0 && <span className="font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">{entry.approved} approved</span>}
                      {entry.rejected > 0 && <span className="font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">{entry.rejected} rejected</span>}
                      <span className="text-sti-gray font-medium hidden sm:inline">{entry.hours.toFixed(2)}h</span>
                      {isOpen ? <ChevronDown className="w-4 h-4 text-sti-gray" /> : <ChevronRight className="w-4 h-4 text-sti-gray" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 space-y-2 bg-sti-gray-light/30 dark:bg-white/[0.03]">
                      {records.map((record) => {
                        const Icon = reviewIcons[record.reviewStatus] || Hourglass;
                        return (
                          <div key={record.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-sti-gray-dark dark:text-white">{formatDate(record.date)}</p>
                                <p className="text-xs text-sti-gray mt-0.5">
                                  {formatTime(record.timeIn)} → {formatTime(record.timeOut)}
                                  <span className="mx-1.5">•</span>
                                  {record.renderedHours?.toFixed(2)}h
                                  <span className="mx-1.5">•</span>
                                  {statusLabels[record.status] || record.status}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${reviewStyles[record.reviewStatus] || reviewStyles.DRAFT}`}>
                                  <Icon className="w-3.5 h-3.5" /> {reviewLabels[record.reviewStatus] || record.reviewStatus}
                                </span>
                                {(record.timeInPhoto || record.timeOutPhoto) && (
                                  <button onClick={()=>setPhotoPreview(record)} className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-black/5 dark:border-white/10 hover:bg-sti-gray-light" title="View verification photos"><ImageIcon className="w-4 h-4 text-sti-blue" /></button>
                                )}
                              </div>
                            </div>

                            {record.reviewStatus === 'SUBMITTED' && (
                              rejecting === record.id ? (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3 pt-3 border-t border-black/5 dark:border-white/10">
                                  <input
                                    autoFocus
                                    value={remarks}
                                    onChange={e=>setRemarks(e.target.value)}
                                    placeholder="Reason for rejection (required)"
                                    className="input-field py-1.5 text-xs flex-1"
                                  />
                                  <div className="flex gap-2 shrink-0">
                                    <Button variant="secondary" onClick={()=>{setRejecting(null);setRemarks('');}} className="text-xs !py-1.5">Cancel</Button>
                                    <Button variant="primary" icon={XCircle} loading={busyId===record.id} onClick={()=>handleDecision(record,'REJECTED')} className="text-xs !py-1.5">Confirm rejection</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-black/5 dark:border-white/10">
                                  <Button variant="primary" icon={Check} loading={busyId===record.id} onClick={()=>handleDecision(record,'APPROVED')} className="text-xs !py-1.5">Approve</Button>
                                  <Button variant="secondary" icon={XCircle} onClick={()=>{setRejecting(record.id);setRemarks('');}} className="text-xs !py-1.5">Reject</Button>
                                </div>
                              )
                            )}

                          {record.reviewedByName && record.reviewStatus !== 'SUBMITTED' && (
                            <p className="text-[11px] text-sti-gray mt-2">
                              {record.reviewStatus === 'REJECTED' ? 'Rejected' : 'Approved'} by {record.reviewedByName}
                              {record.reviewedAt && ` on ${new Date(record.reviewedAt).toLocaleDateString()}`}
                            </p>
                          )}
                          {record.reviewRemarks && record.reviewStatus === 'REJECTED' && (
                            <p className="text-[11px] text-red-600 mt-1">Reason: {record.reviewRemarks}</p>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-0 overflow-hidden flex flex-col h-[70vh]">
          <div className="p-4 border-b border-black/5 dark:border-white/10">
            <p className="text-sm font-bold text-sti-gray-dark dark:text-white mb-2.5">Students</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student name..." className="input-field pl-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length===0 ? (
              <p className="text-sm text-sti-gray p-6 text-center">No students found</p>
            ) : filtered.map(s => {
              const left = Math.max(0, (s.requiredHours || 0) - (s.completedHours || 0));
              return (
                <button key={s.id} onClick={()=>handleSelect(s)} className={`w-full text-left px-4 py-3 border-b border-black/5 dark:border-white/10 hover:bg-sti-gray-light dark:hover:bg-white/5 transition-colors ${selected?.id===s.id?'bg-sti-blue-50 dark:bg-white/10':''}`}>
                  <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-sti-gray">{s.studentId} • {s.completedHours}/{s.requiredHours}h • {left}h left</p>
                </button>
              );
            })}
          </div>
        </Card>
        <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col h-[70vh]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-sti-gray text-sm p-8 text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-sti-gray-light dark:bg-white/5 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-sti-gray" />
              </div>
              <p>Select a student to view their daily time records.</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-sti-blue border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="p-4 border-b border-black/5 dark:border-white/10">
                <h3 className="font-bold text-sti-gray-dark dark:text-white">{selected.firstName} {selected.lastName} <span className="text-xs text-sti-gray">({selected.studentId})</span></h3>
                {summary && <p className="text-xs text-sti-blue mt-1">{summary.totalHours}h rendered • {summary.remainingHours}h left • {summary.presentDays} days present</p>}
                {summary?.review && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-sti-gray-dark">{summary.review.draft} not submitted</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-sti-yellow-dark">{summary.review.submitted} pending</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">{summary.review.approved} approved</span>
                    {summary.review.rejected > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">{summary.review.rejected} rejected</span>}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {history.length===0 ? <p className="text-sm text-sti-gray text-center py-8">No time records yet</p> : history.map(a=>(
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-sti-gray-light/50 dark:bg-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sti-gray-dark dark:text-white">{formatDate(a.date)}</p>
                      <p className="text-xs text-sti-gray flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatTime(a.timeIn)} → {a.timeOut ? formatTime(a.timeOut) : 'Not yet'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold">{a.renderedHours?.toFixed(2)}h</p>
                        <p className="text-xs text-sti-gray">{statusLabels[a.status] || a.status}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${reviewStyles[a.reviewStatus] || reviewStyles.DRAFT}`}>
                        {reviewLabels[a.reviewStatus] || a.reviewStatus}
                      </span>
                      {(a.timeInPhoto || a.timeOutPhoto) && (
                        <button onClick={()=>setPhotoPreview(a)} className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-black/5 dark:border-white/10 hover:bg-sti-gray-light" title="View verification photos"><ImageIcon className="w-4 h-4 text-sti-blue" /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {photoPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setPhotoPreview(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 max-w-md w-full" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm">{formatDate(photoPreview.date)}</h4>
              <button onClick={()=>setPhotoPreview(null)} className="p-1 rounded-full hover:bg-sti-gray-light"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-sti-gray mb-1">Time In</p>
                {photoPreview.timeInPhoto ? <img src={photoPreview.timeInPhoto} className="rounded-lg w-full aspect-square object-cover" /> : <div className="rounded-lg bg-sti-gray-light h-32 flex items-center justify-center text-xs">No photo</div>}
              </div>
              <div>
                <p className="text-xs text-sti-gray mb-1">Time Out</p>
                {photoPreview.timeOutPhoto ? <img src={photoPreview.timeOutPhoto} className="rounded-lg w-full aspect-square object-cover" /> : <div className="rounded-lg bg-sti-gray-light h-32 flex items-center justify-center text-xs">No photo</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMonitoring;
