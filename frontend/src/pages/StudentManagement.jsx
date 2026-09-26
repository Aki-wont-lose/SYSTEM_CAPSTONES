import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, X, Clock, CalendarDays, Upload, KeyRound, Copy, Check, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  batchCreateStudents
} from '../services/studentService';
import { getCompanies } from '../services/companyService';
import { getStudentAttendanceForStaff, getStudentSummaryForStaff } from '../services/attendanceService';

const statusStyles = {
  NOT_STARTED: 'bg-gray-100 text-sti-gray-dark',
  ONGOING: 'bg-sti-blue-50 text-sti-blue',
  COMPLETED: 'bg-yellow-50 text-sti-yellow-dark',
  ON_HOLD: 'bg-orange-50 text-orange-600',
  FAILED: 'bg-red-50 text-red-600',
};

const emptyForm = {
  role: 'STUDENT',
  studentId: '', firstName: '', lastName: '', course: '', section: '',
  email: '', contactNumber: '', companyId: '',
  supervisorName: '', supervisorEmail: '', supervisorContact: '',
  workingDays: '', workingHours: '', ojt_status: 'NOT_STARTED'
};

const PAGE_SIZES = [10, 50, 100, 'ALL'];

const StudentManagement = () => {
  const { user } = useAuth();
  const role = user?.role;
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'view' | null
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewAttendance, setViewAttendance] = useState([]);
  const [viewSummary, setViewSummary] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await getAllStudents({ search, status: statusFilter });
      setStudents(res.data);
      setPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCompanies().then((res) => setCompanies(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadStudents, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const openAddModal = (role = 'STUDENT') => {
    setForm({ ...emptyForm, role });
    setError('');
    setModalMode('add');
  };

  const openEditModal = (student) => {
    setForm({
      ...emptyForm,
      ...student,
      companyId: student.companyId || ''
    });
    setSelectedStudent(student);
    setError('');
    setModalMode('edit');
  };

  const openViewModal = async (student) => {
    setSelectedStudent(student);
    setModalMode('view');
    setViewAttendance([]);
    setViewSummary(null);
    try {
      const [attRes, sumRes] = await Promise.all([
        getStudentAttendanceForStaff(student.id, 20),
        getStudentSummaryForStaff(student.id)
      ]);
      setViewAttendance(attRes.data || []);
      setViewSummary(sumRes.data?.attendance || null);
    } catch (e) { console.error(e); }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedStudent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modalMode === 'add') {
        const { companyId, ...rest } = form;
        const res = await createStudent({ ...rest, companyId: companyId || undefined });
        if (res.data?.temporaryPassword) {
          setNewCredentials({ email: form.email, password: res.data.temporaryPassword });
        }
      } else if (modalMode === 'edit') {
        const { id, userId, user, attendance, company, createdAt, updatedAt, ...updateData } = form;
        await updateStudent(selectedStudent.id, { ...updateData, companyId: updateData.companyId || null });
      }
      closeModal();
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = async (credentials) => {
    const list = Array.isArray(credentials) ? credentials : [credentials];
    const text = list.map((c) => `Email: ${c.email}\nTemporary password: ${c.password || c.temporaryPassword}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { /* clipboard unavailable */ }
  };

  const handleSort = (key) => {
    setSort((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const sortedStudents = [...students].sort((a, b) => {
    const pick = (s) => {
      switch (sort.key) {
        case 'name': return `${a.firstName} ${a.lastName}`.toLowerCase();
        case 'course': return `${a.course} ${a.section}`.toLowerCase();
        case 'company': return (a.company?.name || '').toLowerCase();
        case 'hours': return (a.completedHours || 0);
        case 'status': return a.ojt_status;
        default: return new Date(a.createdAt || 0).getTime();
      }
    };
    const av = pick(a);
    const bv = pick(b);
    if (av < bv) return sort.direction === 'asc' ? -1 : 1;
    if (av > bv) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const pageLimit = pageSize === 'ALL' ? sortedStudents.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / pageLimit));
  const paginatedStudents = sortedStudents.slice((page - 1) * pageLimit, page * pageLimit);

  const changePageSize = (value) => {
    setPageSize(value === 'ALL' ? 'ALL' : Number(value));
    setPage(1);
  };

  const SortHeader = ({ label, sortKey, className = '' }) => (
    <th className={`px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide ${className}`}>
      <button onClick={() => handleSort(sortKey)} className="inline-flex items-center gap-1 hover:text-sti-blue transition-colors">
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </button>
    </th>
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      loadStudents();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const downloadBatchTemplate = () => {
    const sample = [{
      studentId: '202401234',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juan.delacruz@stamaria.sti.edu.ph',
      course: 'BSIT',
      section: 'BSIT-1A',
      contactNumber: '09171234567'
    }];
    const worksheet = XLSX.utils.json_to_sheet(sample, { header: ['studentId', 'firstName', 'lastName', 'email', 'course', 'section', 'contactNumber'] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student_account_batch_template.xlsx');
  };

  const handleBatchFile = async (file) => {
    if (!file) return;
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    if (!isExcel && !isCsv) { setBatchResult({ created: 0, failed: 1, errors: ['Please use CSV or Excel file (.csv, .xlsx)'] }); return; }
    // helper: normalize header to simple key (remove spaces, underscores, dashes)
    const normalize = (h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    let students = [];
    try {
      if (isExcel) {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { setBatchResult({ created: 0, failed: 1, errors: ['Empty sheet'] }); return; }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows.length) { setBatchResult({ created: 0, failed: 1, errors: ['File is empty'] }); return; }
        const headers = rows[0].map(normalize);
        students = rows.slice(1).map(vals=>{
          const obj={}; headers.forEach((h,i)=>obj[h]= vals[i] != null ? String(vals[i]).trim() : '');
          // skip completely empty rows
          if (!Object.values(obj).some(v=>v)) return null;
          return {
            studentId: obj['studentid'] || obj['id'] || obj['studentno'] || '',
            firstName: obj['firstname'] || '',
            lastName: obj['lastname'] || '',
            course: obj['course'] || '',
            section: obj['section'] || '',
            email: obj['email'] || '',
            contactNumber: obj['contactnumber'] || obj['contact'] || obj['contactno'] || obj['phone'] || obj['mobile'] || '',
          };
        }).filter(Boolean);
      } else {
        const text = await file.text();
        const lines = text.trim().split(/\r?\n/).filter(l=>l.trim());
        if (lines.length < 2) { setBatchResult({ created: 0, failed: 1, errors: ['CSV needs header + at least 1 row'] }); return; }
        const headers = lines[0].split(',').map(h=>normalize(h.replace(/^"|"$/g,'')));
        students = lines.slice(1).map(line=>{
          // simple CSV split respecting quoted commas
          const vals = [];
          let cur = ''; let inQuote = false;
          for (let ch of line) { if (ch === '"') inQuote = !inQuote; else if (ch === ',' && !inQuote) { vals.push(cur.trim()); cur=''; } else cur+=ch; }
          vals.push(cur.trim());
          const cleaned = vals.map(v=>v.replace(/^"|"$/g,'').trim());
          const obj={}; headers.forEach((h,i)=>obj[h]=cleaned[i] || '');
          if (!Object.values(obj).some(v=>v)) return null;
          return {
            studentId: obj['studentid'] || obj['id'] || obj['studentno'] || '',
            firstName: obj['firstname'] || '',
            lastName: obj['lastname'] || '',
            course: obj['course'] || '',
            section: obj['section'] || '',
            email: obj['email'] || '',
            contactNumber: obj['contactnumber'] || obj['contact'] || obj['contactno'] || obj['phone'] || obj['mobile'] || '',
          };
        }).filter(Boolean);
      }
      if (!students.length) { setBatchResult({ created: 0, failed: 1, errors: ['No valid rows found - check headers: studentId, firstName, lastName, email, course, section are required'] }); return; }
      setBatchLoading(true);
      const res = await batchCreateStudents(students);
      setBatchResult(res.data);
      loadStudents();
    } catch(err){
      setBatchResult({ created: 0, failed: students.length || 1, errors: [err.response?.data?.message || err.message || 'Batch failed'] });
    } finally { setBatchLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar */}
      <Card className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field sm:max-w-[180px]"
          >
            <option value="">All statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {(role === 'ADMIN' || role === 'COORDINATOR') && (
            <Button variant="primary" icon={Plus} onClick={() => openAddModal('STUDENT')}>
              Add Student
            </Button>
          )}
          {(role === 'ADMIN' || role === 'COORDINATOR') && (
            <>
              <Button variant="secondary" icon={FileSpreadsheet} onClick={downloadBatchTemplate} title="Download the student import template">
                Template
              </Button>
              <div
                onDragOver={e=>{e.preventDefault(); setDragOver(true)}}
                onDragLeave={()=>setDragOver(false)}
                onDrop={e=>{e.preventDefault(); setDragOver(false); handleBatchFile(e.dataTransfer.files[0]);}}
                className={`flex items-center gap-2 ${dragOver ? 'ring-2 ring-sti-blue rounded-xl p-1' : ''}`}
              >
                <input type="file" accept=".csv,.xlsx,.xls" id="batch-student-csv" className="hidden" onChange={(e)=>{ handleBatchFile(e.target.files[0]); e.target.value=''; }} />
                <Button variant="secondary" icon={Upload} onClick={()=>document.getElementById('batch-student-csv').click()}>
                  Batch Upload
                </Button>
              </div>
            </>
          )}
          <label className="flex items-center gap-1.5 text-xs text-sti-gray">
            Show
            <select
              value={pageSize}
              onChange={(e) => changePageSize(e.target.value)}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 px-2.5 py-2 text-xs font-medium text-sti-gray-dark dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sti-blue/40"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size === 'ALL' ? 'All' : size}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-sti-gray py-12 text-center">No students found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/10 text-left">
                  <SortHeader label="Student" sortKey="name" />
                  <SortHeader label="Course / Section" sortKey="course" />
                  <SortHeader label="Company" sortKey="company" />
                  <SortHeader label="Hours" sortKey="hours" />
                  <SortHeader label="Status" sortKey="status" />
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((s) => (
                  <tr key={s.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-sti-gray-dark dark:text-white">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-sti-gray">{s.studentId} • {s.email}</p>
                    </td>
                    <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{s.course}<br /><span className="text-xs text-sti-gray">{s.section}</span></td>
                    <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{s.company?.name || '—'}</td>
                    <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">
                      <span className="font-medium">{s.completedHours}/{s.requiredHours}h</span>
                      <span className="text-xs text-sti-gray ml-1.5">{Math.max(0, s.requiredHours - s.completedHours)}h left</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[s.ojt_status]}`}>
                        {s.ojt_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openViewModal(s)} className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(s)} className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sti-gray hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-black/5 dark:border-white/10">
              <p className="text-xs text-sti-gray">
                {sortedStudents.length === 0
                  ? 'No students to display'
                  : `Showing ${(page - 1) * pageLimit + 1}-${Math.min(page * pageLimit, sortedStudents.length)} of ${sortedStudents.length}`}
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
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalMode === 'add' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'add' ? 'Add Student' : 'Edit Student'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">First Name</label>
              <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Last Name</label>
              <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Student ID</label>
              <input required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="input-field" placeholder="352467" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">OJT Status</label>
              <select value={form.ojt_status} onChange={(e) => setForm({ ...form, ojt_status: e.target.value })} className="input-field">
                <option value="NOT_STARTED">Not Started</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Course</label>
              <input required value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Section</label>
              <input required value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Email</label>
              <input required type="email" disabled={modalMode === 'edit'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field disabled:bg-sti-gray-light" />
            </div>
            {modalMode === 'add' && (
              <div className="sm:col-span-2 flex gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs rounded-xl px-3 py-2.5 border border-blue-100 dark:border-blue-900">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                <span>A temporary password is generated automatically and shown once after saving. The student must change it on first login.</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Contact Number</label>
              <input required value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Partner Company</label>
              <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="input-field">
                <option value="">Not yet assigned</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {modalMode === 'add' ? 'Create Student' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal - now with DTR monitoring for admin/coordinator/supervisor */}
      <Modal isOpen={modalMode === 'view'} onClose={closeModal} title="Student Details" maxWidth="max-w-2xl">
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-sti-blue flex items-center justify-center text-white text-xl font-bold">
                {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
              </div>
              <div>
                <p className="font-bold text-sti-gray-dark dark:text-white">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                <p className="text-sm text-sti-gray">{selectedStudent.studentId} • {selectedStudent.email}</p>
                {viewSummary && <p className="text-xs text-sti-blue font-medium mt-1">{viewSummary.totalHours}h rendered • {viewSummary.remainingHours}h left • {viewSummary.presentDays} days present</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-sti-gray text-xs mb-1">Course</p><p className="font-medium text-sti-gray-dark dark:text-slate-200">{selectedStudent.course}</p></div>
              <div><p className="text-sti-gray text-xs mb-1">Section</p><p className="font-medium text-sti-gray-dark dark:text-slate-200">{selectedStudent.section}</p></div>
              <div><p className="text-sti-gray text-xs mb-1">Email</p><p className="font-medium text-sti-gray-dark dark:text-slate-200">{selectedStudent.email}</p></div>
              <div><p className="text-sti-gray text-xs mb-1">Contact</p><p className="font-medium text-sti-gray-dark dark:text-slate-200">{selectedStudent.contactNumber}</p></div>
              <div><p className="text-sti-gray text-xs mb-1">Company</p><p className="font-medium text-sti-gray-dark dark:text-slate-200">{selectedStudent.company?.name || 'Not yet assigned'}</p></div>
              <div><p className="text-sti-gray text-xs mb-1">Hours</p><p className="font-medium text-sti-gray-dark dark:text-slate-200">{selectedStudent.completedHours}/{selectedStudent.requiredHours}h ({Math.max(0, selectedStudent.requiredHours - selectedStudent.completedHours)}h left)</p></div>
              <div><p className="text-sti-gray text-xs mb-1">Supervisor</p><p className="font-medium text-sti-gray-dark dark:text-slate-200">{selectedStudent.supervisorName || 'Not yet assigned'}</p></div>
              <div><p className="text-sti-gray text-xs mb-1">Working Hours</p><p className="font-medium text-sti-gray-dark dark:text-slate-200">{selectedStudent.workingHours || '—'}</p></div>
            </div>
            {/* DTR Monitoring - time in/out visible to supervisor/coordinator/admin with photo */}
            <div className="pt-3 border-t border-black/5 dark:border-white/10">
              <h4 className="font-bold text-sti-gray-dark dark:text-white text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-sti-blue" /> Time In / Time Out History</h4>
              {viewAttendance.length === 0 ? (
                <p className="text-sm text-sti-gray text-center py-4">No time records yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {viewAttendance.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-sti-gray-light/50 dark:bg-white/5 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sti-gray-dark dark:text-white">{new Date(a.date).toLocaleDateString()}</p>
                        <p className="text-sti-gray flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {a.timeIn ? new Date(a.timeIn).toLocaleTimeString() : '—'} → {a.timeOut ? new Date(a.timeOut).toLocaleTimeString() : 'Not yet'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold text-sti-gray-dark dark:text-white">{a.renderedHours?.toFixed(2)}h</p>
                          <p className={`text-[10px] px-2 py-0.5 rounded-full ${a.status==='PRESENT' ? 'bg-sti-blue-50 text-sti-blue' : 'bg-yellow-50 text-sti-yellow-dark'}`}>{a.status}</p>
                        </div>
                        {(a.timeInPhoto || a.timeOutPhoto) && (
                          <button onClick={()=>setPhotoPreview(a)} className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border hover:bg-sti-gray-light"><Eye className="w-3.5 h-3.5 text-sti-blue" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {photoPreview && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setPhotoPreview(null)}>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 max-w-md w-full" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm">{new Date(photoPreview.date).toLocaleDateString()}</h4>
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
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Student" maxWidth="max-w-sm">
        <p className="text-sm text-sti-gray-dark dark:text-slate-200">
          Are you sure you want to delete <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong>?
          This will permanently remove their account and attendance records.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
        </div>
      </Modal>

      <Modal isOpen={!!newCredentials} onClose={() => setNewCredentials(null)} title="Student Account Created" maxWidth="max-w-md">
        {newCredentials && (
          <div className="space-y-4">
            <div className="flex gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs rounded-xl px-3 py-2.5 border border-amber-200 dark:border-amber-900">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Share these credentials securely. The temporary password is shown only once.</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-sti-gray-dark dark:text-slate-200 mb-1">Email</p>
                <p className="text-sm text-sti-gray-dark dark:text-white bg-sti-gray-light dark:bg-slate-900 rounded-lg px-3 py-2 break-all">{newCredentials.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-sti-gray-dark dark:text-slate-200 mb-1">Temporary password</p>
                <p className="text-sm font-mono text-sti-gray-dark dark:text-white bg-sti-gray-light dark:bg-slate-900 rounded-lg px-3 py-2 break-all">{newCredentials.password}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" icon={copied ? Check : Copy} onClick={() => copyCredentials(newCredentials)}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="primary" onClick={() => setNewCredentials(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Batch Result - in-app modal replaces ugly native alert on mobile */}
      <Modal isOpen={!!batchResult} onClose={() => setBatchResult(null)} title={batchResult?.failed ? 'Batch Upload Result' : 'Batch Upload Complete'} maxWidth="max-w-md">
        {batchResult && (
          <div className="space-y-3">
            <div className={`p-3 rounded-xl text-sm font-medium ${batchResult.failed ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200' : 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200'}`}>
              Batch: {batchResult.created} created, {batchResult.failed} failed
            </div>
            {batchResult.errors?.length > 0 && (
              <div className="max-h-64 overflow-y-auto bg-sti-gray-light dark:bg-slate-900 rounded-xl p-3 space-y-1">
                {batchResult.errors.map((e,i)=>(
                  <p key={i} className="text-xs text-sti-gray-dark dark:text-slate-300 break-words border-b border-black/5 dark:border-white/10 last:border-0 py-1">{e}</p>
                ))}
              </div>
            )}
            {batchResult.failed > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/50 p-3 rounded-xl">
                <p className="text-xs font-semibold text-sti-blue">Tip: Required columns</p>
                <p className="text-xs text-sti-gray mt-1">Headers must include <code className="bg-white dark:bg-slate-800 px-1 rounded">studentId</code>, <code className="bg-white dark:bg-slate-800 px-1 rounded">firstName</code>, <code className="bg-white dark:bg-slate-800 px-1 rounded">lastName</code>, <code className="bg-white dark:bg-slate-800 px-1 rounded">email</code>. Accepts variants like "Student ID", "First Name" with spaces/underscores. A temporary password is generated automatically for every imported account. Empty rows are ignored.</p>
              </div>
            )}
            {batchResult.credentials?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-sti-gray-dark dark:text-slate-200 mb-2">Generated temporary passwords</p>
                <div className="max-h-48 overflow-y-auto bg-sti-gray-light dark:bg-slate-900 rounded-xl p-3 space-y-1">
                  {batchResult.credentials.map((c) => (
                    <p key={c.email} className="text-[11px] text-sti-gray-dark dark:text-slate-300 font-mono break-all border-b border-black/5 dark:border-white/10 last:border-0 py-1">{c.email} — {c.temporaryPassword}</p>
                  ))}
                </div>
                <div className="flex justify-end mt-2">
                  <Button variant="secondary" icon={copied ? Check : Copy} onClick={() => copyCredentials(batchResult.credentials)}>
                    {copied ? 'Copied' : 'Copy all'}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="primary" onClick={()=>setBatchResult(null)}>OK</Button>
            </div>
          </div>
        )}
      </Modal>

      {batchLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 flex items-center gap-3 shadow-xl">
            <div className="w-6 h-6 border-3 border-sti-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Uploading batch...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
