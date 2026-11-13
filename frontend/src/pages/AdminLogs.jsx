import { useEffect, useState } from 'react';
import { ClipboardList, Check, RotateCcw, Filter, Trash2, Download, FileText } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { TableSkeleton } from '../components/Skeleton';
import { getAllLogs, reviewLogEntry, deleteLogEntryStaff } from '../services/logEntryService';

const statusStyles = {
  PENDING: 'bg-yellow-50 text-sti-yellow-dark',
  APPROVED: 'bg-sti-blue-50 text-sti-blue',
  REVISION_REQUESTED: 'bg-red-50 text-red-600',
};

const statusLabels = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REVISION_REQUESTED: 'Revision Requested',
};

const formatDateTime = (dateStr) =>
  new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Show all student log entries and Integration Papers for staff to review
const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [comment, setComment] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.logType = typeFilter;
      const logsRes = await getAllLogs(params);
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const handleDelete = async (log) => {
    const name = `${log.student?.firstName ?? ''} ${log.student?.lastName ?? ''}`.trim();
    if (!window.confirm(`Delete this log entry${name ? ` from ${name}` : ''}? This cannot be undone.`)) return;
    try {
      await deleteLogEntryStaff(log.id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete log');
    }
  };

  const handleReview = async (id, status) => {
    if (status === 'REVISION_REQUESTED' && !String(comment || '').trim()) {
      alert('Please specify what needs to be revised.');
      return;
    }
    try {
      await reviewLogEntry(id, status, status === 'REVISION_REQUESTED' ? comment.trim() : undefined);
      setReviewingId(null);
      setComment('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review log');
    }
  };

  const downloadFile = (fileData, fileName) => {
    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || 'document';
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">Student Logs</h1>
          <p className="text-sm text-sti-gray">Review daily task logs and Integration Paper submissions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field py-2 w-44"
          >
            <option value="">All Log Types</option>
            <option value="DAILY_LOG">Daily Logs</option>
            <option value="INTEGRATION_PAPER">Integration Paper</option>
          </select>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field pl-9 pr-8 py-2 w-44"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : logs.length === 0 ? (
        <Card className="text-center py-16">
          <ClipboardList className="w-10 h-10 text-sti-gray mx-auto mb-3" />
          <p className="text-sti-gray text-sm">No log entries found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isIntegration = log.logType === 'INTEGRATION_PAPER';
            return (
              <Card key={log.id}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-sti-gray-dark dark:text-white">
                        {log.student?.lastName}, {log.student?.firstName}
                      </span>
                      <span className="text-xs text-sti-gray">#{log.student?.studentId}</span>
                      {log.student?.course && (
                        <span className="text-xs text-sti-gray">
                          ({log.student.course}{log.student.section ? ` ${log.student.section}` : ''})
                        </span>
                      )}
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isIntegration ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {isIntegration ? 'Integration Paper' : 'Daily Log'}
                      </span>
                      <span className="text-xs text-sti-gray">· {isIntegration ? formatDateTime(log.createdAt || log.date) : formatDate(log.date)}</span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyles[log.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[log.status] || log.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-sti-gray-dark dark:text-slate-200 whitespace-pre-wrap">{log.taskDescription}</p>
                    {log.submissionFileName && (
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <button
                          onClick={() => downloadFile(log.submissionFile, log.submissionFileName)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sti-blue hover:text-sti-blue-dark dark:hover:text-white bg-sti-blue-50/70 dark:bg-sti-blue/20 px-2.5 py-1 rounded-lg"
                          title="Download submitted file"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{log.submissionFileName}</span>
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {log.comment && (
                      <p className="mt-2 text-xs text-sti-gray italic">Feedback: {log.comment}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {log.status === 'PENDING' && (
                      <>
                        <Button variant="primary" icon={Check} onClick={() => handleReview(log.id, 'APPROVED')}>
                          Approve
                        </Button>
                        <Button variant="secondary" icon={RotateCcw} onClick={() => setReviewingId(log.id)}>
                          Request Revision
                        </Button>
                      </>
                    )}
                    <Button variant="danger" icon={Trash2} onClick={() => handleDelete(log)}>
                      Delete
                    </Button>
                  </div>
                </div>

                {reviewingId === log.id && (
                  <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row gap-3">
                    <input
                      autoFocus
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What needs to be revised?"
                      className="input-field flex-1"
                    />
                    <div className="flex gap-2">
                      <Button variant="danger" onClick={() => handleReview(log.id, 'REVISION_REQUESTED')}>Send</Button>
                      <Button variant="secondary" onClick={() => { setReviewingId(null); setComment(''); }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
