import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, KeyRound, Copy, Check, UserCheck, UserX, ArrowUpDown, ArrowUp, ArrowDown, Upload, FileSpreadsheet } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import {
  getStaffAccounts,
  getAccountCounts,
  createStaffAccount,
  batchCreateStaffAccounts,
  updateStaffAccount,
  regenerateAccountPassword,
  deleteStaffAccount
} from '../services/accountService';
import { getCompanies } from '../services/companyService';
import * as XLSX from 'xlsx';
import StudentManagement from './StudentManagement';

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

const PAGE_SIZES = [10, 50, 100, 'ALL'];

const emptyStaffForm = { firstName: '', lastName: '', email: '', role: 'SUPERVISOR', coordinatorCourse: '', companyId: '', contactNumber: '' };

const AccountManagement = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'ADMIN';
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : 'SUPERVISOR';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [counts, setCounts] = useState({ students: 0, supervisors: 0, coordinators: 0 });
  const [staff, setStaff] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [batchResult, setBatchResult] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyStaffForm);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectTab = (key) => {
    setActiveTab(key);
    setSearchParams(key === 'SUPERVISOR' ? {} : { tab: key }, { replace: true });
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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

  const handleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
  };

  const sortValue = (member, key) => {
    if (key === 'name') return `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase();
    if (key === 'program') return (member.coordinatorCourse || '').toLowerCase();
    if (key === 'company') return (member.supervisorCompany?.name || '').toLowerCase();
    if (key === 'status') return member.isActive ? 'active' : 'inactive';
    return String(member[key] ?? '').toLowerCase();
  };

  const visibleStaff = useMemo(() => {
    if (activeTab === 'STUDENT') return [];
    const rows = staff.filter((member) => member.role === activeTab);
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = sortValue(a, sort.key);
      const right = sortValue(b, sort.key);
      if (left === right) return 0;
      return left > right ? direction : -direction;
    });
  }, [staff, activeTab, sort]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, sort, pageSize]);

  const changePageSize = (value) => {
    setPageSize(value === 'ALL' ? 'ALL' : Number(value));
    setPage(1);
  };

  const pageLimit = pageSize === 'ALL' ? visibleStaff.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(visibleStaff.length / pageLimit));
  const paginatedStaff = visibleStaff.slice((page - 1) * pageLimit, page * pageLimit);

  const SortHeader = ({ label, sortKey, className = '' }) => {
    const isActive = sort.key === sortKey;
    return (
      <th className={`px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide ${className}`}>
        <button onClick={() => handleSort(sortKey)} className={`inline-flex items-center gap-1 transition-colors hover:text-sti-blue ${isActive ? 'text-sti-blue' : ''}`}>
          {label}
          {isActive ? (
            sort.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-50" />
          )}
        </button>
      </th>
    );
  };

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
      firstName: account.firstName || '',
      lastName: account.lastName || '',
      contactNumber: account.contactNumber || '',
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
          email: form.email,
          role: form.role,
          firstName: form.firstName,
          lastName: form.lastName,
          contactNumber: form.contactNumber,
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

  const copyBatchCredentials = async () => {
    const text = batchResult.credentials.map((c) => `${c.email} — ${c.temporaryPassword}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { /* clipboard unavailable */ }
  };

  const downloadBatchTemplate = () => {
    const isCoordinator = activeTab === 'COORDINATOR';
    const sample = isCoordinator
      ? [{
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan.delacruz@stamaria.sti.edu.ph',
        role: 'COORDINATOR',
        program: 'BSIT',
        contactNumber: '09171234567'
      }]
      : [{
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria.santos@partner.com',
        role: 'SUPERVISOR',
        company: companies[0]?.name || 'Company name from Partner Companies',
        contactNumber: '09181234567'
      }];

    const columns = isCoordinator
      ? ['firstName', 'lastName', 'email', 'role', 'program', 'contactNumber']
      : ['firstName', 'lastName', 'email', 'role', 'company', 'contactNumber'];

    const worksheet = XLSX.utils.json_to_sheet(sample, { header: columns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isCoordinator ? 'Coordinators' : 'Supervisors');
    XLSX.writeFile(workbook, `${isCoordinator ? 'coordinator' : 'supervisor'}_account_batch_template.xlsx`);
  };

  const handleBatchFile = async (file) => {
    if (!file) return;
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    if (!isExcel && !isCsv) { setBatchResult({ created: 0, failed: 1, errors: ['Please use CSV or Excel file (.csv, .xlsx)'] }); return; }

    const normalize = (h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    let accounts = [];

    try {
      if (isExcel) {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { setBatchResult({ created: 0, failed: 1, errors: ['Empty sheet'] }); return; }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows.length) { setBatchResult({ created: 0, failed: 1, errors: ['File is empty'] }); return; }
        const headers = rows[0].map(normalize);
        accounts = rows.slice(1).map((vals) => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = vals[i] != null ? String(vals[i]).trim() : ''; });
          if (!Object.values(obj).some((v) => v)) return null;
          return {
            firstName: obj['firstname'] || '',
            lastName: obj['lastname'] || '',
            email: obj['email'] || '',
            role: (obj['role'] || obj['accounttype'] || activeTab).toUpperCase(),
            coordinatorCourse: (obj['coordinatorcourse'] || obj['program'] || obj['course'] || '').toUpperCase(),
            companyName: obj['company'] || obj['companyname'] || obj['assignedcompany'] || '',
            contactNumber: obj['contactnumber'] || obj['contact'] || obj['phone'] || obj['mobile'] || ''
          };
        }).filter(Boolean);
      } else {
        const text = await file.text();
        const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { setBatchResult({ created: 0, failed: 1, errors: ['CSV needs header + at least 1 row'] }); return; }
        const headers = lines[0].split(',').map((h) => normalize(h.replace(/^"|"$/g, '')));
        accounts = lines.slice(1).map((line) => {
          const vals = [];
          let cur = ''; let inQuote = false;
          for (const ch of line) { if (ch === '"') inQuote = !inQuote; else if (ch === ',' && !inQuote) { vals.push(cur.trim()); cur = ''; } else cur += ch; }
          vals.push(cur.trim());
          const cleaned = vals.map((v) => v.replace(/^"|"$/g, '').trim());
          const obj = {};
          headers.forEach((h, i) => { obj[h] = cleaned[i] || ''; });
          if (!Object.values(obj).some((v) => v)) return null;
          return {
            firstName: obj['firstname'] || '',
            lastName: obj['lastname'] || '',
            email: obj['email'] || '',
            role: (obj['role'] || obj['accounttype'] || activeTab).toUpperCase(),
            coordinatorCourse: (obj['coordinatorcourse'] || obj['program'] || obj['course'] || '').toUpperCase(),
            companyName: obj['company'] || obj['companyname'] || obj['assignedcompany'] || '',
            contactNumber: obj['contactnumber'] || obj['contact'] || obj['phone'] || obj['mobile'] || ''
          };
        }).filter(Boolean);
      }

      if (!accounts.length) {
        setBatchResult({ created: 0, failed: 1, errors: ['No valid rows found - check headers: firstName, lastName, email, role are required'] });
        return;
      }

      setBatchLoading(true);
      const res = await batchCreateStaffAccounts(accounts);
      setBatchResult(res.data);
      loadStaff();
      loadCounts();
    } catch (err) {
      setBatchResult({ created: 0, failed: accounts.length || 1, errors: [err.response?.data?.message || err.message || 'Batch failed'] });
    } finally { setBatchLoading(false); }
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
                onClick={() => selectTab(tab.key)}
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
        <StudentManagement />
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
              <div className="flex items-center gap-2">
                <Button variant="primary" icon={Plus} onClick={openAddModal}>
                  Add {activeTab === 'COORDINATOR' ? 'Coordinator' : 'Supervisor'}
                </Button>
                <Button
                  variant="secondary"
                  icon={FileSpreadsheet}
                  onClick={downloadBatchTemplate}
                  title={`Download the ${activeTab === 'COORDINATOR' ? 'coordinator' : 'supervisor'} import template`}
                >
                  Template
                </Button>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleBatchFile(e.dataTransfer.files[0]); }}
                  className={dragOver ? 'ring-2 ring-sti-blue rounded-xl p-1' : ''}
                >
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    id="batch-staff-csv"
                    className="hidden"
                    onChange={(e) => { handleBatchFile(e.target.files[0]); e.target.value = ''; }}
                  />
                  <Button variant="secondary" icon={Upload} onClick={() => document.getElementById('batch-staff-csv').click()}>
                    Batch Upload
                  </Button>
                </div>
              </div>
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
                      <SortHeader label="Name" sortKey="name" />
                      <SortHeader label="Email" sortKey="email" />
                      {activeTab === 'COORDINATOR' ? (
                        <SortHeader label="Program" sortKey="program" />
                      ) : (
                        <SortHeader label="Company" sortKey="company" />
                      )}
                      <SortHeader label="Status" sortKey="status" />
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStaff.map((member) => (
                      <tr key={member.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-medium text-sti-gray-dark dark:text-white">
                            {[member.firstName, member.lastName].filter(Boolean).join(' ') || '—'}
                          </p>
                          {member.contactNumber && <p className="text-xs text-sti-gray">{member.contactNumber}</p>}
                        </td>
                        <td className="px-6 py-3.5">
                          <p className="font-medium text-sti-gray-dark dark:text-white break-all">{member.email}</p>
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-sti-gray">
                      {visibleStaff.length === 0
                        ? 'No accounts to display'
                        : `Showing ${(page - 1) * pageLimit + 1}-${Math.min(page * pageLimit, visibleStaff.length)} of ${visibleStaff.length}`}
                    </p>
                    <label className="flex items-center gap-1.5 text-xs text-sti-gray">
                      Show
                      <select
                        value={pageSize}
                        onChange={(e) => changePageSize(e.target.value)}
                        className="rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-white/5 px-2 py-1 text-xs text-sti-gray-dark dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sti-blue/40"
                      >
                        {PAGE_SIZES.map((size) => (
                          <option key={size} value={size}>{size === 'ALL' ? 'All' : size}</option>
                        ))}
                      </select>
                    </label>
                  </div>
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

          {modalMode === 'add' ? (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Account Type</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, coordinatorCourse: '', companyId: '' })} className="input-field">
                <option value="SUPERVISOR">Supervisor</option>
                <option value="COORDINATOR">Coordinator</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Account Type</label>
              <select
                value={form.role}
                onChange={(e) => {
                  const nextRole = e.target.value;
                  setForm({
                    ...form,
                    role: nextRole,
                    coordinatorCourse: nextRole === 'COORDINATOR' ? form.coordinatorCourse : '',
                    companyId: nextRole === 'SUPERVISOR' ? form.companyId : ''
                  });
                }}
                className="input-field"
              >
                <option value="SUPERVISOR">Supervisor</option>
                <option value="COORDINATOR">Coordinator</option>
                <option value="ADMIN">Admin</option>
              </select>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          </div>

          {form.role === 'COORDINATOR' ? (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Assigned Program *</label>
              <select required value={form.coordinatorCourse} onChange={(e) => setForm({ ...form, coordinatorCourse: e.target.value })} className="input-field">
                <option value="">Select program</option>
                <option value="BSIT">BSIT</option>
                <option value="BSCS">BSCS</option>
                <option value="BSCPE">BSCPE</option>
                <option value="BSACT">BSACT</option>
                <option value="BSHM">BSHM</option>
                <option value="BSTM">BSTM</option>
                <option value="BSAIS">BSAIS</option>
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

          <div>
            <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Contact Number</label>
            <input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="input-field" />
          </div>

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

      <Modal isOpen={!!batchResult} onClose={() => setBatchResult(null)} title="Batch Upload Result" maxWidth="max-w-lg">
        {batchResult && (
          <div className="space-y-3">
            <div className={`p-3 rounded-xl text-sm font-medium ${batchResult.failed ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200' : 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200'}`}>
              Batch: {batchResult.created} created, {batchResult.failed} failed
            </div>
            {batchResult.errors?.length > 0 && (
              <div className="max-h-56 overflow-y-auto bg-sti-gray-light dark:bg-slate-900 rounded-xl p-3 space-y-1">
                {batchResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-sti-gray-dark dark:text-slate-300 break-words border-b border-black/5 dark:border-white/10 last:border-0 py-1">{e}</p>
                ))}
              </div>
            )}
            {batchResult.failed > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/50 p-3 rounded-xl">
                <p className="text-xs font-semibold text-sti-blue">Tip: Required columns</p>
                <p className="text-xs text-sti-gray mt-1">
                  Headers must include <code className="bg-white dark:bg-slate-800 px-1 rounded">firstName</code>, <code className="bg-white dark:bg-slate-800 px-1 rounded">lastName</code>, <code className="bg-white dark:bg-slate-800 px-1 rounded">email</code>, <code className="bg-white dark:bg-slate-800 px-1 rounded">role</code> (SUPERVISOR or COORDINATOR). Coordinators also need <code className="bg-white dark:bg-slate-800 px-1 rounded">program</code>, supervisors need <code className="bg-white dark:bg-slate-800 px-1 rounded">company</code> (exact company name). Spaces, underscores and dashes in headers are accepted. A temporary password is generated for every imported account.
                </p>
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
                  <Button variant="secondary" icon={copied ? Check : Copy} onClick={copyBatchCredentials}>
                    {copied ? 'Copied' : 'Copy all'}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setBatchResult(null)}>OK</Button>
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

export default AccountManagement;
