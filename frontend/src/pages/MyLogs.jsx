import { useEffect, useState, useRef } from 'react';
import { Plus, ClipboardList, X, Pencil, Trash2, MessageSquare, Download, Upload, FileText } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getMyLogs, addLogEntry, updateLogEntry, deleteLogEntry } from '../services/logEntryService';

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

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const formatDateTime = (dateStr) =>
  new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// Student daily task journal & Integration Paper submissions
const MyLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [logType, setLogType] = useState('DAILY_LOG');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [taskDescription, setTaskDescription] = useState('');
  const [fileInfo, setFileInfo] = useState({ data: null, name: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const loadLogs = async () => {
    try {
      const res = await getMyLogs();
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const openNew = (type = 'DAILY_LOG') => {
    setEditingLog(null);
    setLogType(type);
    setDate(new Date().toISOString().slice(0, 10));
    setTaskDescription(type === 'INTEGRATION_PAPER' ? 'Integration Paper Submission' : '');
    setFileInfo({ data: null, name: null });
    setError('');
    setShowModal(true);
  };

  const openEdit = (log) => {
    setEditingLog(log);
    setLogType(log.logType || 'DAILY_LOG');
    setDate(new Date(log.date).toISOString().slice(0, 10));
    setTaskDescription(log.taskDescription);
    setFileInfo({ data: log.submissionFile || null, name: log.submissionFileName || null });
    setError('');
    setShowModal(true);
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('File too large — max 3MB.');
      return;
    }
    const data = await fileToBase64(file);
    setFileInfo({ data, name: file.name });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTask = String(taskDescription || '').trim();
    if (!trimmedTask) {
      setError('Description is required.');
      return;
    }
    if (logType === 'INTEGRATION_PAPER' && (!fileInfo.data || !fileInfo.name)) {
      setError('Please attach your Integration Paper file.');
      return;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!editingLog && date > todayStr) {
      setError('Log date cannot be in the future.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (editingLog) {
        await updateLogEntry(editingLog.id, trimmedTask, {
          submissionFile: fileInfo.data,
          submissionFileName: fileInfo.name
        });
      } else {
        await addLogEntry(date, trimmedTask, {
          logType,
          submissionFile: fileInfo.data,
          submissionFileName: fileInfo.name
        });
      }
      setShowModal(false);
      loadLogs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save log entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteLogEntry(id);
      loadLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete log entry');
    }
  };

  const filteredLogs = filterType === 'ALL'
    ? logs
    : logs.filter((l) => (l.logType || 'DAILY_LOG') === filterType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">My Logs</h1>
          <p className="text-sm text-sti-gray">Daily task journal, Integration Paper status, and reviewer feedback.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={FileText} onClick={() => openNew('INTEGRATION_PAPER')}>
            Submit Integration Paper
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => openNew('DAILY_LOG')}>
            New Daily Log
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: `All (${logs.length})` },
          { key: 'DAILY_LOG', label: `Daily Logs (${logs.filter((l) => (l.logType || 'DAILY_LOG') === 'DAILY_LOG').length})` },
          { key: 'INTEGRATION_PAPER', label: `Integration Paper (${logs.filter((l) => l.logType === 'INTEGRATION_PAPER').length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilterType(t.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterType === t.key
                ? 'bg-sti-blue text-white'
                : 'bg-white dark:bg-slate-800 text-sti-gray hover:text-sti-gray-dark dark:hover:text-white border border-black/5 dark:border-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filteredLogs.length === 0 ? (
        <Card className="text-center py-16">
          <ClipboardList className="w-10 h-10 text-sti-gray mx-auto mb-3" />
          <p className="text-sti-gray text-sm">No log entries yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isIntegration = log.logType === 'INTEGRATION_PAPER';
            return (
              <Card key={log.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isIntegration ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {isIntegration ? 'Integration Paper' : 'Daily Log'}
                    </span>
                    <span className="text-xs font-semibold text-sti-gray">
                      {isIntegration ? formatDateTime(log.createdAt || log.date) : formatDate(log.date)}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyles[log.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[log.status] || log.status}
                    </span>
                  </div>
                  <p className="text-sm text-sti-gray-dark dark:text-slate-200 whitespace-pre-wrap">{log.taskDescription}</p>
                  {log.submissionFileName && (
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <button
                        onClick={() => { const a = document.createElement('a'); a.href = log.submissionFile; a.download = log.submissionFileName; a.click(); }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sti-blue hover:text-sti-blue-dark dark:hover:text-white bg-sti-blue-50/70 dark:bg-sti-blue/20 px-2.5 py-1 rounded-lg"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{log.submissionFileName}</span>
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {log.comment && (
                    <div className="mt-2 flex items-start gap-2 bg-sti-gray-light dark:bg-slate-700/50 rounded-lg px-3 py-2">
                      <MessageSquare className="w-3.5 h-3.5 text-sti-blue mt-0.5 shrink-0" />
                      <p className="text-xs text-sti-gray-dark dark:text-slate-300">{log.comment}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {log.status !== 'APPROVED' && (
                    <>
                      <button onClick={() => openEdit(log)} className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(log.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sti-gray hover:text-red-600" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover w-full max-w-md p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-sti-gray hover:text-sti-gray-dark dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-sti-gray-dark dark:text-white mb-5">
              {editingLog
                ? (logType === 'INTEGRATION_PAPER' ? 'Update Integration Paper' : 'Edit Log Entry')
                : (logType === 'INTEGRATION_PAPER' ? 'Submit Integration Paper' : 'New Daily Log Entry')}
            </h2>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingLog && (
                <div>
                  <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Entry Type</label>
                  <select
                    value={logType}
                    onChange={(e) => {
                      const next = e.target.value;
                      setLogType(next);
                      if (next === 'INTEGRATION_PAPER' && !taskDescription) {
                        setTaskDescription('Integration Paper Submission');
                      }
                    }}
                    className="input-field"
                  >
                    <option value="DAILY_LOG">Daily Log</option>
                    <option value="INTEGRATION_PAPER">Integration Paper</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  disabled={!!editingLog}
                  max={new Date().toISOString().slice(0, 10)}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">
                  {logType === 'INTEGRATION_PAPER' ? 'Title / Notes' : 'What did you work on?'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder={logType === 'INTEGRATION_PAPER' ? 'Integration Paper title or notes...' : 'Describe the tasks you completed today...'}
                  className="input-field resize-none"
                />
              </div>
              {logType === 'INTEGRATION_PAPER' && (
                <div>
                  <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Integration Paper File *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFilePick}
                    className="block w-full text-sm text-sti-gray file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sti-blue file:text-white hover:file:bg-sti-blue-dark file:text-xs file:font-semibold"
                  />
                  {fileInfo.name && (
                    <p className="mt-1.5 text-xs text-sti-blue font-medium">Selected: {fileInfo.name}</p>
                  )}
                </div>
              )}
              <Button type="submit" variant="primary" className="w-full" loading={saving}>
                {editingLog ? 'Save Changes' : logType === 'INTEGRATION_PAPER' ? 'Submit Integration Paper' : 'Add Entry'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLogs;
