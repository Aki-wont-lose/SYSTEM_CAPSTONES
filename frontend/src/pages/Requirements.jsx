import { useEffect, useState, useRef } from 'react';
import { FileCheck2, Upload, CheckCircle2, XCircle, Clock3, X, Download, AlertTriangle, ListChecks, CalendarClock, Award } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getMySubmissions, submitRequirementFile, getMyWeeklyTasks, completeWeeklyTask } from '../services/requirementService';

const statusConfig = {
  PENDING: { label: 'Pending Review', style: 'bg-yellow-50 text-sti-yellow-dark', Icon: Clock3 },
  APPROVED: { label: 'Approved', style: 'bg-sti-blue-50 text-sti-blue', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejected — Re-upload', style: 'bg-red-50 text-red-600', Icon: XCircle },
};

const derivedConfig = {
  NOT_STARTED: { label: 'Not Started', style: 'bg-gray-100 text-sti-gray-dark', Icon: Clock3 },
  PENDING: { label: 'Pending Review', style: 'bg-yellow-50 text-sti-yellow-dark', Icon: Clock3 },
  APPROVED: { label: 'Approved', style: 'bg-sti-blue-50 text-sti-blue', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejected — Re-upload', style: 'bg-red-50 text-red-600', Icon: XCircle },
  LATE: { label: 'Late — Submitted', style: 'bg-orange-50 text-orange-600', Icon: AlertTriangle },
  MISSING: { label: 'Missing', style: 'bg-red-50 text-red-600', Icon: AlertTriangle },
  COMPLETED: { label: 'Approved', style: 'bg-sti-blue-50 text-sti-blue', Icon: CheckCircle2 }
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null);

const Requirements = ({ mode = 'all' }) => {
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef(null);
  const activeRequirementId = useRef(null);

  const loadData = async () => {
    try {
      const [subRes, taskRes] = await Promise.all([getMySubmissions(), getMyWeeklyTasks()]);
      setItems(subRes.data);
      setTasks(taskRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load requirements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerUpload = (requirementId) => {
    activeRequirementId.current = requirementId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('File is too large (max 8MB).');
      return;
    }

    setError('');
    setNotice('');
    setUploadingId(activeRequirementId.current);
    try {
      const fileData = await fileToBase64(file);
      const res = await submitRequirementFile(activeRequirementId.current, file.name, fileData);
      setNotice(res.message || 'File submitted');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  const handleCompleteTask = async (taskId) => {
    setError('');
    try {
      await completeWeeklyTask(taskId);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the to-do');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isTemplates = mode === 'templates';
  const isSubmissions = mode === 'submissions';
  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">{isTemplates ? 'Templates' : isSubmissions ? 'My Submissions' : 'Requirements'}</h1>
        <p className="text-sm text-sti-gray">{isTemplates ? 'Download guides for requirements' : isSubmissions ? 'Upload and track your submissions' : 'Upload and track the documents needed for your OJT.'}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
          <X className="w-4 h-4" /> {error}
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl border border-green-100">
          <CheckCircle2 className="w-4 h-4" /> {notice}
        </div>
      )}

      <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />

      {(isSubmissions || mode === 'all') && pendingTasks.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-5 h-5 text-sti-blue" />
            <h2 className="font-bold text-sti-gray-dark dark:text-white">Weekly To-Do</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sti-blue-50 text-sti-blue">{pendingTasks.length}</span>
          </div>
          <div className="space-y-2">
            {pendingTasks.map((task) => {
              const missed = task.derivedStatus === 'MISSING';
              return (
                <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl border ${missed ? 'border-red-100 bg-red-50/60 dark:bg-red-950/30 dark:border-red-900' : 'border-black/5 dark:border-white/10'}`}>
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="mt-0.5 p-1 rounded-lg hover:bg-sti-blue-50 text-sti-blue shrink-0"
                    title="Mark as done"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-sti-gray-dark dark:text-white">{task.title}</p>
                    {task.description && <p className="text-xs text-sti-gray mt-0.5">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-sti-gray flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5" /> Week of {formatDate(task.weekOf)}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${missed ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        {missed ? 'Overdue' : `Due ${formatDate(task.dueDate)}`}
                      </span>
                    </div>
                  </div>
                  {task.requirement?.templateFile && (
                    <button
                      onClick={() => { const a = document.createElement('a'); a.href = task.requirement.templateFile; a.download = task.requirement.templateFileName || 'template.pdf'; a.click(); }}
                      className="p-2 rounded-lg hover:bg-sti-blue-50 text-sti-blue shrink-0"
                      title="Download template"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="text-center py-16">
          <FileCheck2 className="w-10 h-10 text-sti-gray mx-auto mb-3" />
          <p className="text-sti-gray text-sm">No requirements have been posted yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((req) => {
            const submission = req.submission;
            const config = submission ? statusConfig[submission.status] : derivedConfig[req.derivedStatus];
            const derived = derivedConfig[req.derivedStatus] || null;
            const dueDate = formatDate(req.dueDate);

            return (
              <Card key={req.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sti-gray-dark dark:text-white">{req.title}</h3>
                      {req.isRequired && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Required</span>
                      )}
                    </div>
                    {req.description && <p className="text-xs text-sti-gray mt-1">{req.description}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {req.cadence === 'WEEKLY' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">Weekly</span>
                      )}
                      {req.maxScore > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                          {req.autoGradeOnSubmit ? 'Auto-graded' : 'Graded'} • {req.maxScore} pts
                        </span>
                      )}
                      {dueDate && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${req.derivedStatus === 'MISSING' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                          Due {dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                  {config && (
                    <span className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.style}`}>
                      <config.Icon className="w-3.5 h-3.5" /> {config.label}
                    </span>
                  )}
                </div>

                {derived && derived.label !== config?.label && (
                  <p className={`text-xs font-medium mb-3 ${req.derivedStatus === 'MISSING' ? 'text-red-600' : 'text-sti-gray'}`}>
                    {req.derivedStatus === 'MISSING'
                      ? `Deadline passed on ${dueDate} — this counts as a missing requirement.`
                      : req.derivedStatus === 'LATE'
                        ? `Submitted after the ${dueDate} deadline.`
                        : ''}
                  </p>
                )}

                {(isTemplates || mode === 'all') && req.templateFile && (
                  <button
                    onClick={() => { const a = document.createElement('a'); a.href = req.templateFile; a.download = req.templateFileName || `${req.title}_template.pdf`; a.click(); }}
                    className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-sti-blue hover:text-sti-blue-dark border border-sti-blue/20 px-3 py-2 rounded-lg hover:bg-sti-blue-50 w-full justify-center"
                  >
                    <Download className="w-4 h-4" /> Download template: {req.templateFileName || 'template.pdf'} — edit your name then upload
                  </button>
                )}
                {(isSubmissions || mode === 'all') && submission && (
                  <p className="text-xs text-sti-gray mb-3 truncate">📎 {submission.fileName}</p>
                )}
                {(isSubmissions || mode === 'all') && submission?.status === 'REJECTED' && submission.remarks && (
                  <p className="text-xs text-red-600 mb-3">Reason: {submission.remarks}</p>
                )}
                {(isSubmissions || mode === 'all') && req.maxScore > 0 && (
                  <p className="text-xs text-sti-gray-dark dark:text-slate-200 mb-3 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-sti-blue" /> Score:{' '}
                    {submission?.score != null ? (
                      <span className="font-bold">{submission.score}/{req.maxScore}</span>
                    ) : (
                      <span className="text-sti-gray">not graded yet</span>
                    )}
                    {submission?.isAutoGraded && <span className="text-[10px] text-green-600 font-semibold">awarded automatically on upload</span>}
                  </p>
                )}

                {(isSubmissions || mode === 'all') && (
                  <Button
                    variant={submission?.status === 'APPROVED' ? 'secondary' : 'primary'}
                    icon={Upload}
                    className="w-full"
                    loading={uploadingId === req.id}
                    onClick={() => triggerUpload(req.id)}
                  >
                    {!submission ? 'Upload File' : submission.status === 'REJECTED' ? 'Re-upload' : 'Replace File'}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Requirements;
