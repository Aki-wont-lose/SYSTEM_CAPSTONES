import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, FileCheck2, Check, XCircle, Download, Filter, FileSpreadsheet, BarChart3, Award, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import {
  getRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  getAllSubmissions,
  getGradingSummary,
  reviewSubmission
} from '../services/requirementService';

const PROGRAMS = [
  { value: 'ALL', label: 'All programs' },
  { value: 'BSHM', label: 'BSHM' },
  { value: 'BSIT', label: 'BSIT' },
  { value: 'BSTM', label: 'BSTM' },
];

const emptyForm = {
  title: '',
  description: '',
  isRequired: true,
  program: 'ALL',
  category: '',
  cadence: 'ONCE',
  dueInDays: '',
  maxScore: 0,
  autoGradeOnSubmit: false,
  sortOrder: 0,
  templateFile: null,
  templateFileName: null
};

const BATCH_COLUMNS = ['title', 'description', 'program', 'category', 'cadence', 'dueInDays', 'maxScore', 'autoGradeOnSubmit', 'isRequired'];

const AdminRequirements = ({ defaultTab = 'requirements', hideRequirements = false, hideSubmissions = false, hideBatchUpload = false, hideGrading = false }) => {
  const [tab, setTab] = useState(defaultTab);
  const [requirements, setRequirements] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [grading, setGrading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [scoringId, setScoringId] = useState(null);
  const [scoreValue, setScoreValue] = useState('');
  const [remarks, setRemarks] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

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
        getRequirements(programFilter === 'ALL' ? {} : { program: programFilter }),
        getAllSubmissions(statusFilter ? { status: statusFilter } : {})
      ]);
      setRequirements(reqRes.data);
      setSubmissions(subRes.data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not load requirements.');
    } finally {
      setLoading(false);
    }
  };

  const loadGrading = async () => {
    setLoading(true);
    try {
      const res = await getGradingSummary(courseFilter ? { course: courseFilter } : {});
      setGrading(res.data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not load grading summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, programFilter]);

  useEffect(() => {
    if (tab === 'grading') loadGrading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, courseFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, program: programFilter === 'ALL' ? 'ALL' : programFilter });
    setActionError('');
    setShowModal(true);
  };

  const openEdit = (req) => {
    setEditing(req);
    setForm({
      title: req.title,
      description: req.description || '',
      isRequired: req.isRequired,
      program: req.program || 'ALL',
      category: req.category || '',
      cadence: req.cadence || 'ONCE',
      dueInDays: req.dueInDays ?? '',
      maxScore: req.maxScore ?? 0,
      autoGradeOnSubmit: req.autoGradeOnSubmit ?? false,
      sortOrder: req.sortOrder ?? 0,
      templateFile: req.templateFile || null,
      templateFileName: req.templateFileName || null
    });
    setActionError('');
    setShowModal(true);
  };

  const handleTemplateChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setActionError('Template too large (max 10MB)'); return; }
    const b64 = await fileToBase64(file);
    setForm({ ...form, templateFile: b64, templateFileName: file.name });
  };

  const downloadTemplate = (req) => {
    const link = document.createElement('a');
    link.href = req.templateFile;
    link.download = req.templateFileName || `${req.title}_template.pdf`;
    link.click();
  };

  const downloadBatchTemplate = () => {
    const sample = [{
      title: 'Week 1 Report',
      description: 'Narrative of activities for the week',
      program: 'BSIT',
      category: 'Weekly Report',
      cadence: 'WEEKLY',
      dueInDays: 5,
      maxScore: 10,
      autoGradeOnSubmit: true,
      isRequired: true
    }];
    const worksheet = XLSX.utils.json_to_sheet(sample, { header: BATCH_COLUMNS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Requirements');
    XLSX.writeFile(workbook, 'requirements_batch_template.xlsx');
  };

  const downloadGradingExcel = () => {
    if (!grading) return;
    const rows = grading.rows.map((row) => ({
      'Student ID': row.studentNumber,
      Name: row.name,
      Program: row.course,
      Section: row.section,
      'Total Requirements': row.totalRequirements,
      Completed: row.completed,
      Pending: row.pending,
      Rejected: row.rejected,
      'Missing (past deadline)': row.missing,
      Late: row.late,
      'Auto-Graded': row.autoGradedCount,
      'Points Earned': row.earnedPoints,
      'Points Possible': row.possiblePoints,
      'Score %': row.percentage == null ? '' : row.percentage
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grading Summary');
    XLSX.writeFile(workbook, 'requirements_grading_summary.xlsx');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionError('');
    try {
      const payload = {
        ...form,
        program: form.program === 'ALL' ? null : form.program,
        dueInDays: form.dueInDays === '' ? null : Number(form.dueInDays),
        maxScore: Number(form.maxScore) || 0,
        sortOrder: Number(form.sortOrder) || 0
      };
      if (editing) {
        await updateRequirement(editing.id, payload);
      } else {
        await createRequirement(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save requirement');
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
      setActionError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleApprove = async (id, score) => {
    setActionError('');
    try {
      await reviewSubmission(id, 'APPROVED', undefined, score === '' ? undefined : Number(score));
      setScoringId(null);
      setScoreValue('');
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    setActionError('');
    try {
      await reviewSubmission(id, 'REJECTED', remarks);
      setRejectingId(null);
      setRemarks('');
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reject');
    }
  };

  const downloadFile = (submission) => {
    const link = document.createElement('a');
    link.href = submission.fileData;
    link.download = submission.fileName;
    link.click();
  };

  const parseBoolean = (value, fallback = true) => {
    const raw = String(value || '').toLowerCase().trim();
    if (!raw) return fallback;
    return ['true', '1', 'yes', 'required', 'y'].includes(raw);
  };

  const handleBatchFile = async (file) => {
    if (!file) return;
    setActionError('');
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    if (!isExcel && !isCsv) { setBatchResult({ created: 0, failed: 1, errors: ['Please use CSV or Excel (.csv, .xlsx)'] }); return; }
    const normalize = (h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
    let reqs = [];
    try {
      if (isExcel) {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows.length) { setBatchResult({ created: 0, failed: 1, errors: ['File is empty'] }); return; }
        const headers = rows[0].map(normalize);
        if (!headers.includes('title')) { setBatchResult({ created: 0, failed: 1, errors: ['Missing required column: title'] }); return; }
        reqs = rows.slice(1).map(vals=>{
          const obj={}; headers.forEach((h,i)=>obj[h]= vals[i]!=null?String(vals[i]).trim():'' );
          if (!Object.values(obj).some(v=>v)) return null;
          return {
            title: obj['title']||'',
            description: obj['description']||'',
            program: ['bshm','bsit','bstm'].includes(String(obj['program']||'').toLowerCase()) ? String(obj['program']).toUpperCase() : null,
            category: obj['category']||'',
            cadence: String(obj['cadence']||'').toUpperCase() === 'WEEKLY' ? 'WEEKLY' : 'ONCE',
            dueInDays: obj['duedays'] ? Number(obj['duedays']) : null,
            maxScore: obj['maxscore'] ? Number(obj['maxscore']) : 0,
            autoGradeOnSubmit: parseBoolean(obj['autogradeonsubmit'], false),
            isRequired: parseBoolean(obj['isrequired'], true)
          };
        }).filter(Boolean);
      } else {
        const text = await file.text();
        const lines = text.trim().split(/\r?\n/).filter(l=>l.trim());
        if (lines.length<2){ setBatchResult({ created:0, failed:1, errors:['CSV needs header + at least 1 row'] }); return; }
        const headers = lines[0].split(',').map(h=>normalize(h.replace(/^"|"$/g,'')));
        if (!headers.includes('title')) { setBatchResult({ created:0, failed:1, errors:['Missing required column: title'] }); return; }
        reqs = lines.slice(1).map(line=>{
          const vals=[]; let cur=''; let inQuote=false;
          for(let ch of line){ if(ch==='"') inQuote=!inQuote; else if(ch===',' && !inQuote){ vals.push(cur.trim()); cur=''; } else cur+=ch; }
          vals.push(cur.trim());
          const cleaned = vals.map(v=>v.replace(/^"|"$/g,'').trim());
          const obj={}; headers.forEach((h,i)=>obj[h]=cleaned[i]||'');
          if (!Object.values(obj).some(v=>v)) return null;
          return {
            title: obj['title']||'',
            description: obj['description']||'',
            program: ['bshm','bsit','bstm'].includes(String(obj['program']||'').toLowerCase()) ? String(obj['program']).toUpperCase() : null,
            category: obj['category']||'',
            cadence: String(obj['cadence']||'').toUpperCase() === 'WEEKLY' ? 'WEEKLY' : 'ONCE',
            dueInDays: obj['duedays'] ? Number(obj['duedays']) : null,
            maxScore: obj['maxscore'] ? Number(obj['maxscore']) : 0,
            autoGradeOnSubmit: parseBoolean(obj['autogradeonsubmit'], false),
            isRequired: parseBoolean(obj['isrequired'], true)
          };
        }).filter(Boolean);
      }
      if (!reqs.length){ setBatchResult({ created:0, failed:1, errors:['No valid rows - need at least a "title" column with one row'] }); return; }
      let created=0, failed=0; const errors=[];
      for(const r of reqs){
        if(!r.title){ failed++; errors.push('(blank row): title is required'); continue; }
        if (Number.isNaN(r.dueInDays) || r.dueInDays < 0) { failed++; errors.push(`${r.title}: dueInDays must be a positive number`); continue; }
        if (Number.isNaN(r.maxScore) || r.maxScore < 0) { failed++; errors.push(`${r.title}: maxScore must be a positive number`); continue; }
        try{ await createRequirement(r); created++; }catch(e){ failed++; errors.push(`${r.title}: ${e.response?.data?.message||e.message}`); }
      }
      loadData();
      setBatchResult({ created, failed, errors });
    } catch(e){ setBatchResult({ created:0, failed:1, errors:[e.message||'Batch failed'] }); }
  };

  const tabTitle = tab === 'requirements' ? 'Templates' : tab === 'grading' ? 'Automated Grading' : 'Submissions';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">{tabTitle}</h1>
          <p className="text-sm text-sti-gray">
            {tab === 'requirements' ? 'Document requirements per program' : tab === 'grading' ? 'Scores, missing deadlines, and auto-graded submissions' : 'Student submissions'}
          </p>
        </div>
        {tab === 'requirements' && (
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Button variant="primary" icon={Plus} onClick={openNew} className="flex-1 sm:flex-none justify-center">Add Template</Button>
            {!hideBatchUpload && (
              <>
                <Button variant="secondary" icon={FileSpreadsheet} onClick={downloadBatchTemplate} className="flex-1 sm:flex-none justify-center" title="Download the batch import template">
                  Template
                </Button>
                <div
                  onDragOver={e=>{e.preventDefault(); setDragOver(true)}}
                  onDragLeave={()=>setDragOver(false)}
                  onDrop={e=>{e.preventDefault(); setDragOver(false); handleBatchFile(e.dataTransfer.files[0]);}}
                  className={`flex-1 sm:flex-none ${dragOver ? 'ring-2 ring-sti-blue rounded-xl' : ''}`}
                >
                  <input type="file" accept=".csv,.xlsx,.xls" id="batch-template-csv" className="hidden" onChange={(e)=>{ handleBatchFile(e.target.files[0]); e.target.value=''; }} />
                  <Button variant="secondary" onClick={()=>document.getElementById('batch-template-csv').click()} className="w-full justify-center">Batch Upload</Button>
                </div>
              </>
            )}
          </div>
        )}
        {tab === 'grading' && (
          <Button variant="secondary" icon={FileSpreadsheet} onClick={downloadGradingExcel} className="shrink-0">
            Download Excel
          </Button>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-900">
          <AlertTriangle className="w-4 h-4" /> {actionError}
        </div>
      )}

      {!(hideRequirements && hideSubmissions && hideGrading) && (
        <div className="flex gap-2 border-b border-black/5 dark:border-white/10 overflow-x-auto">
          {!hideRequirements && (
            <button
              onClick={() => setTab('requirements')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === 'requirements' ? 'border-sti-blue text-sti-blue' : 'border-transparent text-sti-gray hover:text-sti-gray-dark dark:hover:text-white'
              }`}
            >
              Templates
            </button>
          )}
          {!hideSubmissions && (
            <button
              onClick={() => setTab('submissions')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === 'submissions' ? 'border-sti-blue text-sti-blue' : 'border-transparent text-sti-gray hover:text-sti-gray-dark dark:hover:text-white'
              }`}
            >
              Submissions
            </button>
          )}
          {!hideGrading && (
            <button
              onClick={() => setTab('grading')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === 'grading' ? 'border-sti-blue text-sti-blue' : 'border-transparent text-sti-gray hover:text-sti-gray-dark dark:hover:text-white'
              }`}
            >
              Grading
            </button>
          )}
        </div>
      )}

      {tab === 'requirements' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative sm:w-56">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
            <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="input-field pl-9">
              {PROGRAMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

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
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sti-blue-50 text-sti-blue">
                        {req.program || 'All programs'}
                      </span>
                      {req.cadence === 'WEEKLY' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">Weekly</span>
                      )}
                      {req.maxScore > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                          {req.autoGradeOnSubmit ? 'Auto-graded' : 'Graded'} • {req.maxScore} pts
                        </span>
                      )}
                      {req.dueDate && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          Due {new Date(req.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {req.category && <p className="text-xs text-sti-gray mt-1">{req.category}</p>}
                    {req.description && <p className="text-xs text-sti-gray mt-1">{req.description}</p>}
                    {req.templateFile && (
                      <button onClick={() => downloadTemplate(req)} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sti-blue hover:text-sti-blue-dark">
                        <Download className="w-3.5 h-3.5" /> Download template: {req.templateFileName || 'template.pdf'}
                      </button>
                    )}
                    {req._count?.submissions > 0 && (
                      <p className="text-[11px] text-sti-gray mt-1">{req._count.submissions} submission{req._count.submissions === 1 ? '' : 's'}</p>
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
      ) : tab === 'grading' ? (
        !grading || grading.rows.length === 0 ? (
          <Card className="text-center py-16">
            <BarChart3 className="w-10 h-10 text-sti-gray mx-auto mb-3" />
            <p className="text-sti-gray text-sm">No students to grade yet.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-sti-gray">Students graded</p>
                <p className="text-2xl font-bold text-sti-gray-dark dark:text-white mt-1">{grading.totals.students}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-sti-gray">Completed items</p>
                <p className="text-2xl font-bold text-sti-blue mt-1">{grading.totals.completed}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-sti-gray">Missing (past deadline)</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{grading.totals.missing}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-sti-gray">Auto-graded</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{grading.totals.autoGraded}</p>
              </Card>
            </div>

            <div className="relative sm:w-56">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="input-field pl-9">
                <option value="">All programs</option>
                <option value="BSHM">BSHM</option>
                <option value="BSIT">BSIT</option>
                <option value="BSTM">BSTM</option>
              </select>
            </div>

            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/10 text-left">
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Student</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Program</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Completed</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Pending</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Missing</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Auto-Graded</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grading.rows.map((row) => (
                      <tr key={row.studentId} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5">
                        <td className="px-6 py-3.5">
                          <p className="font-medium text-sti-gray-dark dark:text-white">{row.name}</p>
                          <p className="text-xs text-sti-gray">{row.studentNumber}</p>
                        </td>
                        <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{row.course} {row.section}</td>
                        <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{row.completed}/{row.totalRequirements}</td>
                        <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{row.pending}</td>
                        <td className="px-6 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${row.missing > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-sti-gray-dark'}`}>
                            {row.missing}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">
                          {row.autoGradedCount > 0 ? (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600 inline-flex items-center gap-1">
                              <Award className="w-3 h-3" /> {row.autoGradedCount}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-3.5">
                          {row.percentage == null ? (
                            <span className="text-xs text-sti-gray">Not graded</span>
                          ) : (
                            <span className={`text-sm font-bold ${row.percentage >= 75 ? 'text-green-600' : row.percentage >= 50 ? 'text-sti-yellow-dark' : 'text-red-500'}`}>
                              {row.percentage}%
                            </span>
                          )}
                          <span className="text-xs text-sti-gray ml-1.5">{row.earnedPoints}/{row.possiblePoints}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
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
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Score</th>
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
                          {sub.requirement?.maxScore > 0 ? (
                            <span className="text-xs font-semibold text-sti-gray-dark dark:text-slate-200">
                              {sub.score ?? '—'}/{sub.requirement.maxScore}
                              {sub.isAutoGraded && <span className="ml-1 text-[10px] text-green-600">auto</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-sti-gray">—</span>
                          )}
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
                            ) : scoringId === sub.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  type="number"
                                  min="0"
                                  max={sub.requirement?.maxScore || undefined}
                                  value={scoreValue}
                                  onChange={(e) => setScoreValue(e.target.value)}
                                  placeholder={`0-${sub.requirement?.maxScore || 0}`}
                                  className="input-field py-1.5 text-xs w-24"
                                />
                                <button onClick={() => handleApprove(sub.id, scoreValue)} className="text-sti-blue text-xs font-semibold">Save</button>
                                <button onClick={() => setScoringId(null)} className="text-sti-gray text-xs">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                {sub.requirement?.maxScore > 0 && (
                                  <button onClick={() => { setScoringId(sub.id); setScoreValue(sub.score ?? ''); }} className="px-2 py-1.5 rounded-lg hover:bg-sti-gray-light text-sti-gray text-xs font-semibold" title="Approve with score">
                                    Score
                                  </button>
                                )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Program</label>
                  <select value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} className="input-field">
                    {PROGRAMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-field"
                    placeholder="Weekly Report"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Recurrence</label>
                  <select value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })} className="input-field">
                    <option value="ONCE">One-time</option>
                    <option value="WEEKLY">Weekly (auto-creates next to-do)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Due in (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.dueInDays}
                    onChange={(e) => setForm({ ...form, dueInDays: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 7"
                  />
                  <p className="text-[11px] text-sti-gray mt-1">After the deadline, unsubmitted items count as missing</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Max score</label>
                  <input
                    type="number"
                    min="0"
                    value={form.maxScore}
                    onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                    className="input-field"
                    placeholder="0 = not graded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Sort order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-sti-gray-dark dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.autoGradeOnSubmit}
                  onChange={(e) => setForm({ ...form, autoGradeOnSubmit: e.target.checked })}
                  className="rounded border-sti-gray/40 text-sti-blue focus:ring-sti-blue"
                />
                Award full score automatically on upload
              </label>
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

      <Modal isOpen={!!batchResult} onClose={() => setBatchResult(null)} title={batchResult?.failed ? 'Batch Upload Result' : 'Batch Complete'} maxWidth="max-w-md">
        {batchResult && (
          <div className="space-y-3">
            <div className={`p-3 rounded-xl text-sm font-medium ${batchResult.failed ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
              Batch: {batchResult.created} created, {batchResult.failed} failed
            </div>
            {batchResult.errors?.length >0 && (
              <div className="max-h-64 overflow-y-auto bg-sti-gray-light dark:bg-slate-900 rounded-xl p-3 space-y-1">
                {batchResult.errors.slice(0,20).map((e,i)=><p key={i} className="text-xs text-sti-gray-dark dark:text-slate-300 border-b border-black/5 last:border-0 py-1 break-words">{e}</p>)}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="primary" onClick={()=>setBatchResult(null)}>OK</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminRequirements;
