import { useEffect, useState, useRef } from 'react';
import { Plus, ClipboardList, X, Pencil, Trash2, MessageSquare, Paperclip, Download, Send, Upload } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getMyLogs, addLogEntry, updateLogEntry, deleteLogEntry, submitAssignedTask } from '../services/logEntryService';

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

// Format an ISO date string into a short weekday date
const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

// Let a student add, edit, and delete their daily task log entries
const MyLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [taskDescription, setTaskDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState(null);
  const fileInputRef = useRef(null);
  const activeTaskId = useRef(null);

  // Fetch the signed-in student's log entries
  const loadLogs = async () => {
    try {
      const res = await getMyLogs();
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Open the file picker for the task the student is working on
  const triggerSubmit = (taskId) => {
    activeTaskId.current = taskId;
    fileInputRef.current?.click();
  };

  // Upload the student's file and send the assigned task for review
  const handleSubmitFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('File too large — max 3MB.'); return; }
    setSubmittingId(activeTaskId.current);
    try {
      const fileData = await fileToBase64(file);
      await submitAssignedTask(activeTaskId.current, file.name, fileData);
      loadLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit task');
    } finally {
      setSubmittingId(null);
    }
  };

  // Reset the form and open the modal for a new entry
  const openNew = () => {
    setEditingLog(null);
    setDate(new Date().toISOString().slice(0, 10));
    setTaskDescription('');
    setError('');
    setShowModal(true);
  };

  // Load an existing entry into the form for editing
  const openEdit = (log) => {
    setEditingLog(log);
    setDate(new Date(log.date).toISOString().slice(0, 10));
    setTaskDescription(log.taskDescription);
    setError('');
    setShowModal(true);
  };

  // Create a new log entry or save edits to the one being edited
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingLog) {
        await updateLogEntry(editingLog.id, taskDescription);
      } else {
        await addLogEntry(date, taskDescription);
      }
      setShowModal(false);
      loadLogs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save log entry');
    } finally {
      setSaving(false);
    }
  };

  // Delete a log entry after confirmation
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this log entry?')) return;
    try {
      await deleteLogEntry(id);
      loadLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete log entry');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">My Logs</h1>
          <p className="text-sm text-sti-gray">Daily task journal — assignments, notes, and supervisor feedback.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openNew}>New Entry</Button>
      </div>

      <input ref={fileInputRef} type="file" onChange={handleSubmitFile} className="hidden" />

      {logs.length === 0 ? (
        <Card className="text-center py-16">
          <ClipboardList className="w-10 h-10 text-sti-gray mx-auto mb-3" />
          <p className="text-sti-gray text-sm">No log entries yet. Add your first daily log.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-sti-gray">{formatDate(log.date)}</span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyles[log.status]}`}>
                    {statusLabels[log.status]}
                  </span>
                  {log.assignedBy && (
                    <span className="text-xs text-sti-gray italic">Assigned by {log.assignedBy}</span>
                  )}
                </div>
                <p className="text-sm text-sti-gray-dark dark:text-slate-200 whitespace-pre-wrap">{log.taskDescription}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {log.assignedFileName && (
                    <button
                      onClick={() => { const a = document.createElement('a'); a.href = log.assignedFile; a.download = log.assignedFileName; a.click(); }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-sti-blue hover:text-sti-blue-dark dark:hover:text-white"
                      title="Download the attachment from your supervisor"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> {log.assignedFileName}
                    </button>
                  )}
                  {log.submissionFileName && (
                    <span className="flex items-center gap-1.5 text-xs text-sti-gray" title="Your submitted file">
                      <Upload className="w-3.5 h-3.5" /> {log.submissionFileName}
                    </span>
                  )}
                </div>
                {log.comment && (
                  <div className="mt-2 flex items-start gap-2 bg-sti-gray-light dark:bg-slate-700/50 rounded-lg px-3 py-2">
                    <MessageSquare className="w-3.5 h-3.5 text-sti-blue mt-0.5 shrink-0" />
                    <p className="text-xs text-sti-gray-dark dark:text-slate-300">{log.comment}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {(log.status === 'ASSIGNED' || log.status === 'REVISION_REQUESTED') && (
                  <Button
                    variant="primary"
                    icon={Send}
                    loading={submittingId === log.id}
                    onClick={() => triggerSubmit(log.id)}
                  >
                    {log.status === 'REVISION_REQUESTED' ? 'Re-submit' : 'Submit'}
                  </Button>
                )}
                {log.status !== 'APPROVED' && !log.assignedBy && (
                  <>
                    <button onClick={() => openEdit(log)} className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(log.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sti-gray hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-sti-gray hover:text-sti-gray-dark dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-sti-gray-dark dark:text-white mb-5">
              {editingLog ? 'Edit Log Entry' : 'New Log Entry'}
            </h2>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  disabled={!!editingLog}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">What did you work on?</label>
                <textarea
                  required
                  rows={4}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe the tasks you completed today..."
                  className="input-field resize-none"
                />
              </div>
              <Button type="submit" variant="primary" className="w-full" loading={saving}>
                {editingLog ? 'Save Changes' : 'Add Entry'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLogs;
