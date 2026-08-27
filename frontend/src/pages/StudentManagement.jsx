import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, X, Clock, CalendarDays } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent
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
  email: '', password: '', contactNumber: '', companyId: '',
  supervisorName: '', supervisorEmail: '', supervisorContact: '',
  workingDays: '', workingHours: '', ojt_status: 'NOT_STARTED'
};

const StudentManagement = () => {
  const { user } = useAuth();
  const role = user?.role;
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await getAllStudents({ search, status: statusFilter });
      setStudents(res.data);
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
      companyId: student.companyId || '',
      password: ''
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
        await createStudent({ ...rest, companyId: companyId || undefined });
      } else if (modalMode === 'edit') {
        const { password, id, userId, user, attendance, company, createdAt, updatedAt, ...updateData } = form;
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
        <div className="flex gap-2">
          {role === 'ADMIN' && (
            <Button variant="primary" icon={Plus} onClick={() => openAddModal('STUDENT')}>
              Create Account
            </Button>
          )}
          {role === 'COORDINATOR' && (
            <Button variant="primary" icon={Plus} onClick={() => openAddModal('STUDENT')}>
              Add Student
            </Button>
          )}
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
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Student</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Course / Section</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Company</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Hours</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
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
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalMode === 'add' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'add' ? 'Create Account' : 'Edit Student'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}
          {modalMode === 'add' && role === 'ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Account Type</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
                <option value="STUDENT">Student</option>
                <option value="COORDINATOR">Coordinator</option>
                <option value="SUPERVISOR">Supervisor</option>
              </select>
            </div>
          )}
          {modalMode === 'add' && form.role === 'COORDINATOR' && role === 'ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Assigned Course *</label>
              <select required value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="input-field">
                <option value="">Select course</option>
                <option value="BSHM">BSHM</option>
                <option value="BSIT">BSIT</option>
                <option value="BSTM">BSTM</option>
              </select>
              <p className="text-xs text-sti-gray mt-1">This coordinator will lead the selected course</p>
            </div>
          )}
          {modalMode === 'add' && form.role === 'SUPERVISOR' && role === 'ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Assigned Company *</label>
              <select required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="input-field">
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-sti-gray mt-1">Supervisor will see students assigned to this company</p>
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
            {form.role === 'STUDENT' && (
              <>
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
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Email</label>
              <input required type="email" disabled={modalMode === 'edit'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field disabled:bg-sti-gray-light" />
            </div>
            {modalMode === 'add' && (
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Password</label>
                <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="Min. 8 characters" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Contact Number</label>
              <input required={form.role==='STUDENT'} value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="input-field" />
            </div>
            {form.role === 'STUDENT' && (
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Partner Company</label>
                <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="input-field">
                  <option value="">Not yet assigned</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>



          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {modalMode === 'add' ? (form.role === 'STUDENT' ? 'Create Student' : form.role === 'COORDINATOR' ? 'Create Coordinator' : 'Create Supervisor') : 'Save Changes'}
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
    </div>
  );
};

export default StudentManagement;
