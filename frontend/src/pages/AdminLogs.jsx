import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Check, RotateCcw, Plus, X, Filter, Trash2, Paperclip, Download } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getAllLogs, reviewLogEntry, assignTaskToStudent, deleteLogEntryStaff } from '../services/logEntryService';
import { getAllStudents } from '../services/studentService';

const statusStyles = {
  ASSIGNED: 'bg-purple-50 text-purple-600',
  PENDING: 'bg-yellow-50 text-sti-yellow-dark',
  APPROVED: 'bg-sti-blue-50 text-sti-blue',
  REVISION_REQUESTED: 'bg-red-50 text-red-600',
};

const statusLabels = {
  ASSIGNED: 'Assigned',
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REVISION_REQUESTED: 'Revision Requested',
};

// Read a picked file into a base64 data URL for upload
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// Format an ISO date string into a short readable date
const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Show all student log entries for staff to review, score, or assign
const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [comment, setComment] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ studentId: '', date: new Date().toISOString().slice(0, 10), taskDescription: '' });
  const [assignFile, setAssignFile] = useState({ data: null, name: null });
  const [saving, setSaving] = useState(false);
  const assignFileInputRef = useRef(null);

  // Fetch log entries (honoring the status filter) and the student list
  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, studentsRes] = await Promise.all([
        getAllLogs(statusFilter ? { status: statusFilter } : {}),
        getAllStudents()
      ]);
      setLogs(logsRes.data);
      setStudents(studentsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Delete a log entry after asking for confirmation
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

  // Approve a log or request a revision, passing the comment only for revisions
  const handleReview = async (id, status) => {
    try {
      await reviewLogEntry(id, status, status === 'REVISION_REQUESTED' ? comment : undefined);
      setReviewingId(null);
      setComment('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review log');
    }
  };

  // Read a picked attachment for an assigned task (max 3MB, deployed limit is 4.5MB)
  const handleAssignFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('Attachment too large — max 3MB.'); e.target.value = ''; return; }
    const data = await fileToBase64(file);
    e.target.value = '';
    setAssignFile({ data, name: file.name });
  };

  const handleRemoveAssignFile = () => {
    if (assignFileInputRef.current) assignFileInputRef.current.value = '';
    setAssignFile({ data: null, name: null });
  };

  // Create a task assignment for the chosen student
  const handleAssign = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await assignTaskToStudent(assignForm.studentId, assignForm.date, assignForm.taskDescription, assignFile.data, assignFile.name);
      setShowAssign(false);
      setAssignForm({ studentId: '', date: new Date().toISOString().slice(0, 10), taskDescription: '' });
      setAssignFile({ data: null, name: null });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">Student Logs</h1>
          <p className="text-sm text-sti-gray">Review daily task logs, request revisions, and assign new tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field pl-9 pr-8 py-2 w-44"
            >
              <option value="">All statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
            </select>
          </div>
          <Button variant="primary" icon={Plus} onClick={() => setShowAssign(true)}>Assign Task</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="text-center py-16">
          <ClipboardList className="w-10 h-10 text-sti-gray mx-auto mb-3" />
          <p className="text-sti-gray text-sm">No log entries found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-sti-gray-dark dark:text-white">
                      {log.student?.lastName}, {log.student?.firstName}
                    </span>
                    <span className="text-xs text-sti-gray">#{log.student?.studentId}</span>
                    <span className="text-xs text-sti-gray">· {formatDate(log.date)}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyles[log.status]}`}>
                      {statusLabels[log.status] || log.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-sti-gray-dark dark:text-slate-200 whitespace-pre-wrap">{log.taskDescription}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {log.assignedFileName && (
                      <button
                        onClick={() => { const a = document.createElement('a'); a.href = log.assignedFile; a.download = log.assignedFileName; a.click(); }}
                        className="flex items-center gap-1.5 text-xs font-medium text-sti-gray hover:text-sti-blue"
                        title="Task attachment from staff"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> {log.assignedFileName}
                      </button>
                    )}
                    {log.submissionFileName && (
                      <button
                        onClick={() => { const a = document.createElement('a'); a.href = log.submissionFile; a.download = log.submissionFileName; a.click(); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-sti-blue hover:text-sti-blue-dark dark:hover:text-white"
                        title="Student's submitted file"
                      >
                        <Download className="w-3.5 h-3.5" /> {log.submissionFileName}
                      </button>
                    )}
                  </div>
                  {log.comment && (
                    <p className="mt-2 text-xs text-sti-gray italic">Feedback: {log.comment}</p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
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
                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 flex gap-3">
                  <input
                    autoFocus
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What needs to be revised?"
                    className="input-field flex-1"
                  />
                  <Button variant="danger" onClick={() => handleReview(log.id, 'REVISION_REQUESTED')}>Send</Button>
                  <Button variant="secondary" onClick={() => { setReviewingId(null); setComment(''); }}>Cancel</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showAssign && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover w-full max-w-md p-6 relative">
            <button onClick={() => setShowAssign(false)} className="absolute top-4 right-4 text-sti-gray hover:text-sti-gray-dark dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-sti-gray-dark dark:text-white mb-5">Assign Task</h2>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Student</label>
                <select
                  required
                  value={assignForm.studentId}
                  onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.lastName}, {s.firstName} (#{s.studentId})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={assignForm.date}
                  onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Task</label>
                <textarea
                  required
                  rows={4}
                  value={assignForm.taskDescription}
                  onChange={(e) => setAssignForm({ ...assignForm, taskDescription: e.target.value })}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Attachment (optional)</label>
                <input
                  ref={assignFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
                  onChange={handleAssignFile}
                  className="block w-full text-sm text-sti-gray file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sti-blue file:text-white hover:file:bg-sti-blue-dark file:text-xs file:font-semibold"
                />
                {assignFile.name && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-sti-blue">
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{assignFile.name}</span>
                    <button type="button" onClick={handleRemoveAssignFile} className="text-red-600 hover:underline shrink-0">Remove</button>
                  </div>
                )}
              </div>
              <Button type="submit" variant="primary" className="w-full" loading={saving}>Assign Task</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
