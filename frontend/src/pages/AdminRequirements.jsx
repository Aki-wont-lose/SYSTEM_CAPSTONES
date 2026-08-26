import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, FileCheck2, Check, XCircle, Download, Filter } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  getRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  getAllSubmissions,
  reviewSubmission
} from '../services/requirementService';

const AdminRequirements = () => {
  const [tab, setTab] = useState('requirements'); // 'requirements' | 'submissions'
  const [requirements, setRequirements] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', isRequired: true, templateFile: null, templateFileName: null });
  const [saving, setSaving] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [remarks, setRemarks] = useState('');

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, subRes] = await Promise.all([
        getRequirements(),
        getAllSubmissions(statusFilter ? { status: statusFilter } : {})
      ]);
      setRequirements(reqRes.data);
      setSubmissions(subRes.data);
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

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', isRequired: true, templateFile: null, templateFileName: null });
    setShowModal(true);
  };

  const openEdit = (req) => {
    setEditing(req);
    setForm({ title: req.title, description: req.description || '', isRequired: req.isRequired, templateFile: req.templateFile || null, templateFileName: req.templateFileName || null });
    setShowModal(true);
  };

  const handleTemplateChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Template too large (max 10MB)'); return; }
    const b64 = await fileToBase64(file);
    setForm({ ...form, templateFile: b64, templateFileName: file.name });
  };

  const downloadTemplate = (req) => {
    const link = document.createElement('a');
    link.href = req.templateFile;
    link.download = req.templateFileName || `${req.title}_template.pdf`;
    link.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateRequirement(editing.id, form);
      } else {
        await createRequirement(form);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save requirement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this requirement? All related submissions will also be removed.')) return;
    try {
      await deleteRequirement(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleApprove = async (id) => {
    try {
      await reviewSubmission(id, 'APPROVED');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await reviewSubmission(id, 'REJECTED', remarks);
      setRejectingId(null);
      setRemarks('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  const downloadFile = (submission) => {
    const link = document.createElement('a');
    link.href = submission.fileData;
    link.download = submission.fileName;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">Requirements</h1>
          <p className="text-sm text-sti-gray">Manage required documents and review student submissions.</p>
        </div>
        {tab === 'requirements' && <Button variant="primary" icon={Plus} onClick={openNew}>Add Requirement</Button>}
      </div>

      <div className="flex gap-2 border-b border-black/5 dark:border-white/10">
        <button
          onClick={() => setTab('requirements')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'requirements' ? 'border-sti-blue text-sti-blue' : 'border-transparent text-sti-gray hover:text-sti-gray-dark dark:hover:text-white'
          }`}
        >
          Requirements
        </button>
        <button
          onClick={() => setTab('submissions')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'submissions' ? 'border-sti-blue text-sti-blue' : 'border-transparent text-sti-gray hover:text-sti-gray-dark dark:hover:text-white'
          }`}
        >
          Submissions
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'requirements' ? (
        requirements.length === 0 ? (
          <Card className="text-center py-16">
            <FileCheck2 className="w-10 h-10 text-sti-gray mx-auto mb-3" />
            <p className="text-sti-gray text-sm">No requirements yet. Add the first one.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requirements.map((req) => (
              <Card key={req.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sti-gray-dark dark:text-white">{req.title}</h3>
                      {req.isRequired && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Required</span>
                      )}
                    </div>
                    {req.description && <p className="text-xs text-sti-gray mt-1">{req.description}</p>}
                    {req.templateFile && (
                      <button onClick={() => downloadTemplate(req)} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sti-blue hover:text-sti-blue-dark">
                        <Download className="w-3.5 h-3.5" /> Download template: {req.templateFileName || 'template.pdf'}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(req)} className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(req.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sti-gray hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="relative w-52">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-9 py-2">
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {submissions.length === 0 ? (
            <Card className="text-center py-16">
              <FileCheck2 className="w-10 h-10 text-sti-gray mx-auto mb-3" />
              <p className="text-sti-gray text-sm">No submissions found.</p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/10 text-left">
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Student</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Requirement</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">File</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Status</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="border-b border-black/5 dark:border-white/10 last:border-0">
                        <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">
                          {sub.student?.lastName}, {sub.student?.firstName} <span className="text-xs text-sti-gray">#{sub.student?.studentId}</span>
                        </td>
                        <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{sub.requirement?.title}</td>
                        <td className="px-6 py-3.5">
                          <button onClick={() => downloadFile(sub)} className="flex items-center gap-1 text-sti-blue hover:text-sti-blue-dark text-xs font-medium">
                            <Download className="w-3.5 h-3.5" /> {sub.fileName}
                          </button>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            sub.status === 'APPROVED' ? 'bg-sti-blue-50 text-sti-blue'
                            : sub.status === 'REJECTED' ? 'bg-red-50 text-red-600'
                            : 'bg-yellow-50 text-sti-yellow-dark'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          {sub.status === 'PENDING' && (
                            rejectingId === sub.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  value={remarks}
                                  onChange={(e) => setRemarks(e.target.value)}
                                  placeholder="Reason"
                                  className="input-field py-1.5 text-xs w-32"
                                />
                                <button onClick={() => handleReject(sub.id)} className="text-red-600 text-xs font-semibold">Send</button>
                                <button onClick={() => setRejectingId(null)} className="text-sti-gray text-xs">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <button onClick={() => handleApprove(sub.id)} className="p-1.5 rounded-lg hover:bg-sti-blue-50 text-sti-blue" title="Approve">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setRejectingId(sub.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Reject">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover w-full max-w-md p-4 sm:p-6 relative my-4 sm:my-8 max-h-[92vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1 text-sti-gray hover:text-sti-gray-dark dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-sti-gray-dark dark:text-white mb-4 sm:mb-5 pr-8">
              {editing ? 'Edit Requirement' : 'Add Requirement'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field resize-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-sti-gray-dark dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                  className="rounded border-sti-gray/40 text-sti-blue focus:ring-sti-blue"
                />
                Mark as required
              </label>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Template PDF (Coordinator uploads — student downloads & edits name)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleTemplateChange} className="block w-full text-sm text-sti-gray file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sti-blue file:text-white hover:file:bg-sti-blue-dark file:text-xs file:font-semibold" />
                {form.templateFileName && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-sti-blue">
                    <FileCheck2 className="w-4 h-4" /> {form.templateFileName}
                    <button type="button" onClick={() => setForm({ ...form, templateFile: null, templateFileName: null })} className="text-red-600 hover:underline">Remove</button>
                  </div>
                )}
              </div>
              <Button type="submit" variant="primary" className="w-full" loading={saving}>
                {editing ? 'Save Changes' : 'Add Requirement'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequirements;
