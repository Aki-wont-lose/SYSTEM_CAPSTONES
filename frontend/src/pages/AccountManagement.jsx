import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, KeyRound, Copy, Check, UserCheck, UserX } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import {
  getStaffAccounts,
  getAccountCounts,
  createStaffAccount,
  updateStaffAccount,
  regenerateAccountPassword,
  deleteStaffAccount
} from '../services/accountService';
import { getCompanies } from '../services/companyService';

const statusStyles = {
  NOT_STARTED: 'bg-gray-100 text-sti-gray-dark',
  ONGOING: 'bg-sti-blue-50 text-sti-blue',
  COMPLETED: 'bg-yellow-50 text-sti-yellow-dark',
  ON_HOLD: 'bg-orange-50 text-orange-600',
  FAILED: 'bg-red-50 text-red-600',
};

const TABS = [
  { key: 'SUPERVISOR', label: 'Supervisors' },
  { key: 'COORDINATOR', label: 'Coordinators' },
  { key: 'STUDENT', label: 'Students' },
];

const emptyStaffForm = { firstName: '', lastName: '', email: '', role: 'SUPERVISOR', coordinatorCourse: '', companyId: '', contactNumber: '' };

const AccountManagement = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'ADMIN';
  const [activeTab, setActiveTab] = useState('SUPERVISOR');
  const [counts, setCounts] = useState({ students: 0, supervisors: 0, coordinators: 0 });
  const [staff, setStaff] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyStaffForm);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCounts = async () => {
    try {
      const res = await getAccountCounts();
      setCounts(res.data || { students: 0, supervisors: 0, coordinators: 0 });
    } catch (err) { console.error(err); }
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await getStaffAccounts({ search });
      setStaff(res.data || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    getCompanies().then((res) => setCompanies(res.data)).catch(console.error);
  }, []);

  useEffect(() => { loadCounts(); }, []);

  useEffect(() => {
    const timer = setTimeout(loadStaff, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const visibleStaff = useMemo(() => {
    if (activeTab === 'STUDENT') return [];
    return staff.filter((member) => member.role === activeTab);
  }, [staff, activeTab]);

  const openAddModal = () => {
    setForm({ ...emptyStaffForm, role: activeTab === 'COORDINATOR' ? 'COORDINATOR' : 'SUPERVISOR' });
    setError('');
    setModalMode('add');
  };

  const openEditModal = (account) => {
    setForm({
      ...emptyStaffForm,
      id: account.id,
      email: account.email,
      role: account.role,
      coordinatorCourse: account.coordinatorCourse || '',
      companyId: account.supervisorCompanyId || '',
      isActive: account.isActive
    });
    setSelected(account);
    setError('');
    setModalMode('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modalMode === 'add') {
        const res = await createStaffAccount({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
          coordinatorCourse: form.role === 'COORDINATOR' ? form.coordinatorCourse : null,
          companyId: form.role === 'SUPERVISOR' ? form.companyId : null,
          contactNumber: form.contactNumber
        });
        setCredentials({
          title: `${form.role === 'COORDINATOR' ? 'Coordinator' : 'Supervisor'} account created`,
          email: res.data.user.email,
          password: res.data.temporaryPassword
        });
      } else {
        await updateStaffAccount(selected.id, {
          isActive: form.isActive,
          coordinatorCourse: form.role === 'COORDINATOR' ? form.coordinatorCourse || null : null,
          supervisorCompanyId: form.role === 'SUPERVISOR' ? form.companyId || null : null
        });
      }
      setModalMode(null);
      setSelected(null);
      loadStaff();
      loadCounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (account) => {
    try {
      await updateStaffAccount(account.id, { isActive: !account.isActive });
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the account.');
    }
  };

  const handleRegenerate = async (account) => {
    try {
      const res = await regenerateAccountPassword(account.id);
      setCredentials({
        title: 'New temporary password generated',
        email: res.data.user.email,
        password: res.data.temporaryPassword
      });
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate a password.');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteStaffAccount(deleteTarget.id);
      setDeleteTarget(null);
      loadStaff();
      loadCounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove the account.');
    } finally { setDeleting(false); }
  };

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary password: ${credentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { /* clipboard unavailable */ }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-0 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-black/5 dark:border-white/10">
          {TABS.map((tab) => {
            const value = tab.key === 'STUDENT' ? counts.students : tab.key === 'COORDINATOR' ? counts.coordinators : counts.supervisors;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-sti-blue text-sti-blue'
                    : 'border-transparent text-sti-gray hover:text-sti-gray-dark'
                }`}
              >
                {tab.label}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-sti-blue text-white' : 'bg-sti-gray-light dark:bg-slate-700 text-sti-gray'}`}>
                  {value ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {activeTab === 'STUDENT' ? (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-sti-blue/10 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-sti-blue" />
            </div>
            <div>
              <h3 className="font-bold text-sti-gray-dark dark:text-white">Student accounts</h3>
              <p className="text-sm text-sti-gray mt-1">
                There are <strong>{counts.students}</strong> student {counts.students === 1 ? 'account' : 'accounts'}. Add, edit, and import students from the Students page.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'COORDINATOR' ? 'coordinators' : 'supervisors'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            {isAdmin && (
              <Button variant="primary" icon={Plus} onClick={openAddModal}>
                Add {activeTab === 'COORDINATOR' ? 'Coordinator' : 'Supervisor'}
              </Button>
            )}
          </Card>

          <Card className="p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visibleStaff.length === 0 ? (
              <p className="text-sm text-sti-gray py-12 text-center">
                No {activeTab === 'COORDINATOR' ? 'coordinators' : 'supervisors'} found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/10 text-left">
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Email</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">
                        {activeTab === 'COORDINATOR' ? 'Program' : 'Company'}
                      </th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide">Status</th>
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStaff.map((member) => (
                      <tr key={member.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-medium text-sti-gray-dark dark:text-white">{member.email}</p>
                          <p className="text-xs text-sti-gray">
                            {member.role === 'COORDINATOR' ? 'Coordinator' : 'Supervisor'}
                            {member.assignedStudents != null ? ` • ${member.assignedStudents} assigned` : ''}
                          </p>
                        </td>
                        <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">
                          {member.role === 'COORDINATOR' ? (member.coordinatorCourse || '—') : (member.supervisorCompany?.name || '—')}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${member.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-sti-gray-dark'}`}>
                            {member.isActive ? 'Active' : 'Disabled'}
                          </span>
                          {member.mustChangePassword && (
                            <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Temp password</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin && (
                              <>
                                <button onClick={() => handleRegenerate(member)} title="Generate new temporary password" className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue transition-colors">
                                  <KeyRound className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleToggleActive(member)} title={member.isActive ? 'Disable account' : 'Enable account'} className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue transition-colors">
                                  {member.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                                <button onClick={() => openEditModal(member)} title="Edit account" className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue transition-colors">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteTarget(member)} title="Remove account" className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sti-gray hover:text-red-600 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        isOpen={modalMode === 'add' || modalMode === 'edit'}
        onClose={() => { setModalMode(null); setSelected(null); }}
        title={modalMode === 'add' ? `Add ${form.role === 'COORDINATOR' ? 'Coordinator' : 'Supervisor'}` : 'Edit Account'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>}

          {modalMode === 'add' && (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Account Type</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, coordinatorCourse: '', companyId: '' })} className="input-field">
                <option value="SUPERVISOR">Supervisor</option>
                <option value="COORDINATOR">Coordinator</option>
              </select>
            </div>
          )}

          {modalMode === 'add' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">First Name</label>
                <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Last Name</label>
                <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input-field" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Email</label>
            <input required type="email" disabled={modalMode === 'edit'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field disabled:bg-sti-gray-light" />
          </div>

          {form.role === 'COORDINATOR' ? (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Assigned Program *</label>
              <select required value={form.coordinatorCourse} onChange={(e) => setForm({ ...form, coordinatorCourse: e.target.value })} className="input-field">
                <option value="">Select program</option>
                <option value="BSHM">BSHM</option>
                <option value="BSIT">BSIT</option>
                <option value="BSTM">BSTM</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Assigned Company *</label>
              <select required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="input-field">
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          )}

          {modalMode === 'add' && (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Contact Number</label>
              <input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="input-field" />
            </div>
          )}

          {modalMode === 'add' && (
            <div className="flex gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs rounded-xl px-3 py-2.5 border border-blue-100 dark:border-blue-900">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
              <span>A temporary password is generated automatically and shown once after saving. The account must change it on first login.</span>
            </div>
          )}

          {modalMode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Account Status</label>
              <select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })} className="input-field">
                <option value="active">Active</option>
                <option value="inactive">Disabled</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalMode(null); setSelected(null); }}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>{modalMode === 'add' ? 'Create Account' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!credentials} onClose={() => setCredentials(null)} title={credentials?.title || 'Account created'} maxWidth="max-w-md">
        {credentials && (
          <div className="space-y-4">
            <div className="flex gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs rounded-xl px-3 py-2.5 border border-amber-200 dark:border-amber-900">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Share these credentials securely. The temporary password is shown only once.</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-sti-gray-dark dark:text-slate-200 mb-1">Email</p>
                <p className="text-sm text-sti-gray-dark dark:text-white bg-sti-gray-light dark:bg-slate-900 rounded-lg px-3 py-2 break-all">{credentials.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-sti-gray-dark dark:text-slate-200 mb-1">Temporary password</p>
                <p className="text-sm font-mono text-sti-gray-dark dark:text-white bg-sti-gray-light dark:bg-slate-900 rounded-lg px-3 py-2 break-all">{credentials.password}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" icon={copied ? Check : Copy} onClick={copyCredentials}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="primary" onClick={() => setCredentials(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Account" maxWidth="max-w-sm">
        <p className="text-sm text-sti-gray-dark dark:text-slate-200">
          Remove <strong>{deleteTarget?.email}</strong>? The account will no longer be able to sign in.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Remove</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AccountManagement;
