import { useEffect, useState, useRef, useMemo } from 'react';
import { FileCheck2, Upload, CheckCircle2, XCircle, Clock3, X, Download, AlertTriangle, ListChecks, CalendarClock, Search } from 'lucide-react';
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

const PAGE_SIZES = [10, 25, 50, 100, 'ALL'];

const Requirements = ({ mode = 'all' }) => {
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef(null);
  const activeRequirementId = useRef(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const downloadTemplate = (req) => {
    const a = document.createElement('a');
    a.href = req.templateFile;
    a.download = req.templateFileName || `${req.title}_template.pdf`;
    a.click();
  };

  useEffect(() => { setPage(1); }, [search, pageSize]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      [r.title, r.description, r.category, r.program, r.submission?.fileName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const pageLimit = pageSize === 'ALL' ? filteredItems.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageLimit));
  const paginatedItems = filteredItems.slice((page - 1) * pageLimit, page * pageLimit);

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
        <>
          <Card className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
              <input
                type="text"
                placeholder="Search requirements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-sti-gray">
              Show
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 px-2.5 py-2 text-xs font-medium text-sti-gray-dark dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sti-blue/40"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size === 'ALL' ? 'All' : size}</option>
                ))}
              </select>
            </label>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/10 text-left">
                    <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Requirement</th>
                    <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Due</th>
                    <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">File</th>
                    <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-sti-gray">No requirements found.</td>
                    </tr>
                  ) : (
                    paginatedItems.map((req) => {
                      const submission = req.submission;
                      const config = submission ? statusConfig[submission.status] : derivedConfig[req.derivedStatus];
                      const dueDate = formatDate(req.dueDate);
                      const showSubmissionInfo = isSubmissions || mode === 'all';
                      const showTemplateInfo = isTemplates || mode === 'all';

                      return (
                        <tr key={req.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-3.5 align-top">
                            <p className="font-medium text-sti-gray-dark dark:text-white">{req.title}</p>
                            {req.description && <p className="text-xs text-sti-gray mt-0.5">{req.description}</p>}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {req.cadence === 'WEEKLY' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">Weekly</span>
                              )}
                              {req.maxScore > 0 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">{req.maxScore} pts</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 align-top text-xs text-sti-gray-dark dark:text-slate-200">
                            {dueDate || '-'}
                            {req.derivedStatus === 'MISSING' && (
                              <p className="text-[11px] text-red-600 font-medium mt-0.5">Counts as missing</p>
                            )}
                            {req.derivedStatus === 'LATE' && (
                              <p className="text-[11px] text-orange-600 font-medium mt-0.5">Submitted late</p>
                            )}
                          </td>
                          <td className="px-6 py-3.5 align-top">
                            {config && (
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.style}`}>
                                <config.Icon className="w-3.5 h-3.5" /> {config.label}
                              </span>
                            )}
                            {submission?.status === 'REJECTED' && submission.remarks && (
                              <p className="text-[11px] text-red-600 mt-1">Reason: {submission.remarks}</p>
                            )}
                            {showSubmissionInfo && req.maxScore > 0 && (
                              <p className="text-[11px] text-sti-gray mt-1">
                                Score:{' '}
                                {submission?.score != null ? (
                                  <span className="font-semibold">{submission.score}/{req.maxScore}</span>
                                ) : (
                                  'not graded yet'
                                )}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-3.5 align-top text-xs text-sti-gray">
                            {showSubmissionInfo && submission ? (
                              <span className="break-all">{submission.fileName}</span>
                            ) : showTemplateInfo && req.templateFileName ? (
                              <span className="flex items-center gap-1.5 break-all">
                                <FileCheck2 className="w-3.5 h-3.5 text-sti-blue shrink-0" /> {req.templateFileName}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-3.5 align-top">
                            <div className="flex items-center justify-end gap-1">
                              {showTemplateInfo && req.templateFile && (
                                <button
                                  onClick={() => downloadTemplate(req)}
                                  title="Download template"
                                  className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                              {showSubmissionInfo && (
                                <Button
                                  variant={submission?.status === 'APPROVED' ? 'secondary' : 'primary'}
                                  icon={Upload}
                                  loading={uploadingId === req.id}
                                  onClick={() => triggerUpload(req.id)}
                                >
                                  {!submission ? 'Upload' : submission.status === 'REJECTED' ? 'Re-upload' : 'Replace'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-black/5 dark:border-white/10">
                <p className="text-xs text-sti-gray">
                  {filteredItems.length === 0
                    ? 'No requirements to display'
                    : `Showing ${(page - 1) * pageLimit + 1}-${Math.min(page * pageLimit, filteredItems.length)} of ${filteredItems.length}`}
                </p>
                {pageSize !== 'ALL' && totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <span className="text-xs text-sti-gray px-2">Page {page} of {totalPages}</span>
                    <Button variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Requirements;
