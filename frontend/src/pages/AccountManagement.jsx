import { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Pencil, Archive, CheckCircle2, UserCheck, UserX, ArrowUpDown, ArrowUp, ArrowDown, Upload, FileSpreadsheet, AlertTriangle, Clock3, XCircle, History } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import { useAuth } from '../hooks/useAuth';
import {
  getStaffAccounts,
  getAccountCounts,
  createStaffAccount,
  batchCreateStaffAccounts,
  updateStaffAccount,
  deleteStaffAccount,
  reviewSupervisorAccount
} from '../services/accountService';
import { getCompanies } from '../services/companyService';
import {
  isValidStaffEmail,
  getStaffEmailError,
  isValidPersonName,
  isValidContactNumber,
  PERSON_NAME_ERROR,
  CONTACT_NUMBER_ERROR
} from '../constants/staffRules';
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
  { key: 'ADMIN', label: 'Admins' },
  { key: 'SUPERVISOR', label: 'Supervisors' },
  { key: 'COORDINATOR', label: 'Coordinators' },
  { key: 'STUDENT', label: 'Students' },
];

const TAB_LABELS = {
  SUPERVISOR: { singular: 'OJT Supervisor', plural: 'supervisors' },
  COORDINATOR: { singular: 'Coordinator', plural: 'coordinators' },
  ADMIN: { singular: 'Admin', plural: 'admins' },
  STUDENT: { singular: 'Student', plural: 'students' },
};

const roleText = (role) => TAB_LABELS[role]?.singular || 'OJT Supervisor';

const PAGE_SIZES = [10, 50, 100, 'ALL'];

const emptyStaffForm = { firstName: '', lastName: '', email: '', role: 'SUPERVISOR', coordinatorCourse: '', coordinatorSections: '', companyId: '', contactNumber: '' };

const AccountManagement = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'ADMIN';
  const isCoordinator = role === 'COORDINATOR';
  const isSuperAdmin = !!user?.isSuperAdmin;
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  // Admins see staff + student tabs; Coordinators see Students + OJT Supervisors (to create & monitor requests).
  const staffTabs = isSuperAdmin ? TABS : TABS.filter((tab) => tab.key !== 'ADMIN');
  const allowedTabs = isAdmin
    ? staffTabs
    : isCoordinator
      ? [
          { key: 'STUDENT', label: 'Students' },
          { key: 'SUPERVISOR', label: 'OJT Supervisors' }
        ]
      : TABS.filter((tab) => tab.key === 'STUDENT');
  const initialTab = allowedTabs.some((tab) => tab.key === requestedTab) ? requestedTab : allowedTabs[0].key;
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => {
    if (requestedTab === 'students') setActiveTab('STUDENT');
    else if (requestedTab && allowedTabs.some((t) => t.key === requestedTab)) setActiveTab(requestedTab);
  }, [requestedTab]);
  const [counts, setCounts] = useState({ students: 0, supervisors: 0, pendingSupervisors: 0, coordinators: 0, admins: 0 });
  const [staff, setStaff] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
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

  // Admin review & history modals for OJT Supervisor requests
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  const tabLabel = TAB_LABELS[activeTab] || TAB_LABELS.SUPERVISOR;

  // Staff use the institutional <firstname>.<lastname>@stamaria.sti.edu.ph
  // format for school staff; external company supervisors may use company email.
  const staffEmailInvalid = modalMode === 'add' && form.email.trim() !== '' && !isValidStaffEmail(form.email, form.role);
  const staffContactInvalid = (form.contactNumber || '').trim() !== '' && !isValidContactNumber(form.contactNumber);

  const selectTab = (key) => {
    setActiveTab(key);
    // The first visible tab is the default, so it does not need a query param.
    setSearchParams(key === allowedTabs[0]?.key ? {} : { tab: key }, { replace: true });
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [credentials, setCredentials] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCounts = async () => {
    try {
      const res = await getAccountCounts();
      setCounts(res.data || { students: 0, supervisors: 0, pendingSupervisors: 0, coordinators: 0, admins: 0 });
    } catch (err) { console.error(err); }
  };

  const loadStaff = async () => {
    if (!isAdmin && !(isCoordinator && activeTab === 'SUPERVISOR')) {
      setLoading(false);
      return;
    }
    if (activeTab === 'STUDENT') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getStaffAccounts({ role: activeTab, search });
      setStaff(res.data || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    getCompanies().then((res) => setCompanies(res.data)).catch(console.error);
  }, []);

  useEffect(() => { loadCounts(); }, []);

  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (isFirstLoad.current || !search) {
      isFirstLoad.current = false;
      loadStaff();
      return;
    }
    const timer = setTimeout(loadStaff, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTab]);

  const handleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
  };

  const getSupervisorStatus = (member) => {
    if (member.role !== 'SUPERVISOR') return member.isActive ? 'ACTIVE' : 'DISABLED';
    if (member.approvalStatus) return member.approvalStatus;
    return member.isActive ? 'APPROVED' : 'PENDING';
  };

  const sortValue = (member, key) => {
    if (key === 'name') return `${member.firstName || ''} ${member.lastName || ''}`.trim().toLowerCase();
    if (key === 'program') return (member.coordinatorCourse || '').toLowerCase();
    if (key === 'company') return (member.supervisorCompany?.name || '').toLowerCase();
    if (key === 'status') {
      if (member.role === 'SUPERVISOR') return getSupervisorStatus(member).toLowerCase();
      return member.isActive ? 'active' : 'inactive';
    }
    return String(member[key] ?? '').toLowerCase();
  };

  const visibleStaff = useMemo(() => {
    if (activeTab === 'STUDENT') return [];
    let rows = staff.filter((member) => member.role === activeTab);
    if (activeTab === 'SUPERVISOR' && approvalFilter !== 'ALL') {
      rows = rows.filter((member) => getSupervisorStatus(member) === approvalFilter);
    }
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = sortValue(a, sort.key);
      const right = sortValue(b, sort.key);
      if (left === right) return 0;
      return left > right ? direction : -direction;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, activeTab, sort, approvalFilter]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, sort, pageSize, approvalFilter]);

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
    if (isCoordinator) {
      setForm({ ...emptyStaffForm, role: 'SUPERVISOR' });
    } else if (activeTab === 'ADMIN' && isSuperAdmin) {
      setForm({ ...emptyStaffForm, role: 'ADMIN' });
    } else {
      setForm({ ...emptyStaffForm, role: 'COORDINATOR' });
    }
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
      coordinatorSections: Array.isArray(account.coordinatorSections) ? account.coordinatorSections.join(', ') : '',
      companyId: account.supervisorCompanyId || '',
      isActive: account.isActive
    });
    setSelected(account);
    setError('');
    setModalMode('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPersonName(form.firstName) || !isValidPersonName(form.lastName)) {
      setError(PERSON_NAME_ERROR);
      return;
    }
    if (modalMode === 'add' && !isValidStaffEmail(form.email, form.role)) {
      setError(getStaffEmailError(form.role));
      return;
    }
    if (form.role === 'SUPERVISOR' && !(form.contactNumber || '').trim()) {
      setError('Contact number is required for an OJT Supervisor account request.');
      return;
    }
    if ((form.contactNumber || '').trim() && !isValidContactNumber(form.contactNumber)) {
      setError(CONTACT_NUMBER_ERROR);
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (modalMode === 'add') {
        const res = await createStaffAccount({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          role: form.role,
          coordinatorCourse: form.role === 'COORDINATOR' ? form.coordinatorCourse : null,
          coordinatorSections: form.role === 'COORDINATOR' ? form.coordinatorSections : [],
          companyId: form.role === 'SUPERVISOR' ? form.companyId : null,
          contactNumber: form.contactNumber
        });
        const isPendingRequest = res.data?.user?.approvalStatus === 'PENDING' || form.role === 'SUPERVISOR';
        setCredentials({
          title: isPendingRequest
            ? 'OJT Supervisor Request Submitted'
            : `${roleText(form.role)} account created`,
          subtitle: isPendingRequest
            ? 'Status: Pending Approval — An Administrator will review and approve this supervisor account before login is enabled.'
            : 'Account is active and ready for Microsoft sign-in.',
          email: res.data.user.email
        });
      } else {
        await updateStaffAccount(selected.id, {
          isActive: form.isActive,
          email: form.email.trim(),
          role: form.role,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          contactNumber: form.contactNumber,
          coordinatorCourse: form.role === 'COORDINATOR' ? form.coordinatorCourse || null : null,
          coordinatorSections: form.role === 'COORDINATOR' ? form.coordinatorSections : [],
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

  const handleApproveSupervisor = async (member) => {
    setReviewingId(member.id);
    try {
      await reviewSupervisorAccount(member.id, { action: 'APPROVE' });
      await Promise.all([loadStaff(), loadCounts()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not approve supervisor request.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleConfirmRejectSupervisor = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setReviewingId(rejectTarget.id);
    try {
      await reviewSupervisorAccount(rejectTarget.id, {
        action: 'REJECT',
        rejectionReason: rejectionReason.trim() || 'Request rejected by Administrator'
      });
      setRejectTarget(null);
      setRejectionReason('');
      await Promise.all([loadStaff(), loadCounts()]);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not reject supervisor request.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleToggleActive = async (account) => {
    try {
      await updateStaffAccount(account.id, { isActive: !account.isActive });
      loadStaff();
      loadCounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the account.');
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
      setError(err.response?.data?.message || 'Could not archive the account.');
    } finally { setDeleting(false); }
  };

  const normalizeExcelPhone = (val) => {
    const raw = String(val || '').trim();
    return /^9\d{9}$/.test(raw) ? `0${raw}` : raw;
  };

  const downloadBatchTemplate = () => {
    const isCoordinatorTab = activeTab === 'COORDINATOR';
    const sample = isCoordinatorTab
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
        email: 'maria.santos@company.com',
        role: 'SUPERVISOR',
        company: companies[0]?.name || 'Company name from Partner Companies',
        contactNumber: '09181234567'
      }];

    const columns = isCoordinatorTab
      ? ['firstName', 'lastName', 'email', 'role', 'program', 'contactNumber']
      : ['firstName', 'lastName', 'email', 'role', 'company', 'contactNumber'];

    const worksheet = XLSX.utils.json_to_sheet(sample, { header: columns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isCoordinatorTab ? 'Coordinators' : 'Supervisors');
    if (isCoordinatorTab) {
      const programsSheet = XLSX.utils.json_to_sheet(
        ['BSIT', 'BSCS', 'BSCPE', 'ACT', 'BSHM', 'BSTM', 'BSAIS'].map((program) => ({ program })),
        { header: ['program'] }
      );
      XLSX.utils.book_append_sheet(workbook, programsSheet, 'Programs');
    } else if (companies.length > 0) {
      const companiesSheet = XLSX.utils.json_to_sheet(
        companies.map((c) => ({ company: c.name })),
        { header: ['company'] }
      );
      XLSX.utils.book_append_sheet(workbook, companiesSheet, 'Companies');
    }
    XLSX.writeFile(workbook, `${isCoordinatorTab ? 'Coordinator' : 'Supervisor'}_Template.xlsx`);
  };

  const handleBatchFile = async (file) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setBatchResult({ created: 0, failed: 1, errors: ['File too large — max 3MB.'] }); return; }
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
            contactNumber: normalizeExcelPhone(obj['contactnumber'] || obj['contact'] || obj['phone'] || obj['mobile'] || '')
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
            contactNumber: normalizeExcelPhone(obj['contactnumber'] || obj['contact'] || obj['phone'] || obj['mobile'] || '')
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

  const pendingCountInView = useMemo(
    () => staff.filter((m) => m.role === 'SUPERVISOR' && getSupervisorStatus(m) === 'PENDING').length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [staff]
  );

  // Whether the current user can create an account on the current tab:
  // - Coordinator can create OJT Supervisor account requests on SUPERVISOR tab
  // - Admin can create Coordinator accounts on COORDINATOR tab
  // - Super Admin can create Admin accounts on ADMIN tab and Coordinator accounts on COORDINATOR tab
  // - Super Admin and Admin do NOT directly create Supervisor accounts (Coordinator requests -> Admin approves)
  const canCreateOnActiveTab =
    (isCoordinator && activeTab === 'SUPERVISOR') ||
    (isAdmin && activeTab === 'COORDINATOR') ||
    (isSuperAdmin && activeTab === 'ADMIN');

  const canBatchOnActiveTab =
    (isCoordinator && activeTab === 'SUPERVISOR') ||
    (isAdmin && activeTab === 'COORDINATOR');

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-0 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-black/5 dark:border-white/10">
          {allowedTabs.map((tab) => {
            const value = tab.key === 'STUDENT' ? counts.students : tab.key === 'COORDINATOR' ? counts.coordinators : tab.key === 'ADMIN' ? counts.admins : counts.supervisors;
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
                {tab.key === 'SUPERVISOR' && (counts.pendingSupervisors ?? 0) > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    {counts.pendingSupervisors} pending
                  </span>
                )}
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
            <div className="flex flex-col sm:flex-row gap-2.5 flex-1 max-w-xl">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
                <input
                  type="text"
                  placeholder={`Search ${tabLabel.plural}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              {activeTab === 'SUPERVISOR' && (
                <label className="flex items-center gap-1.5 text-xs text-sti-gray font-medium shrink-0">
                  Account Status
                  <select
                    value={approvalFilter}
                    onChange={(e) => setApprovalFilter(e.target.value)}
                    className="rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs font-medium text-sti-gray-dark dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sti-blue/40"
                  >
                    <option value="ALL">All</option>
                    <option value="PENDING">Pending ({pendingCountInView})</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canCreateOnActiveTab && (
                <Button variant="primary" icon={Plus} onClick={openAddModal}>
                  {isCoordinator && activeTab === 'SUPERVISOR'
                    ? 'Request OJT Supervisor Account'
                    : `Add ${tabLabel.singular}`}
                </Button>
              )}
              {canBatchOnActiveTab && (
                <>
                  <Button
                    variant="secondary"
                    icon={FileSpreadsheet}
                    onClick={downloadBatchTemplate}
                    title={`Download the ${tabLabel.singular.toLowerCase()} import template`}
                    aria-label={`Download the ${tabLabel.singular.toLowerCase()} import template`}
                    className="!px-3"
                  />
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
                    <Button
                      variant="secondary"
                      icon={Upload}
                      onClick={() => document.getElementById('batch-staff-csv').click()}
                    >
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

          <Card className="p-0 overflow-hidden">
            {loading ? (
              <TableSkeleton rows={6} columns={5} />
            ) : visibleStaff.length === 0 ? (
              <p className="text-sm text-sti-gray py-12 text-center">
                No {tabLabel.plural} found.
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
                      <SortHeader label="Account Status" sortKey="status" />
                      <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStaff.map((member) => {
                      const supStatus = getSupervisorStatus(member);
                      const meta = member.approvalMetadata || {};
                      return (
                        <tr key={member.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-3.5">
                            <p className="font-medium text-sti-gray-dark dark:text-white">
                              {member.isSuperAdmin ? 'Super Admin' : ([member.firstName, member.lastName].filter(Boolean).join(' ') || '—')}
                            </p>
                            {member.contactNumber && <p className="text-xs text-sti-gray">{member.contactNumber}</p>}
                            {member.role === 'SUPERVISOR' && meta.requestedByEmail && (
                              <p className="text-[11px] text-sti-gray mt-0.5">
                                Requested by: <span className="font-medium">{meta.requestedByEmail}</span>
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <p className="font-medium text-sti-gray-dark dark:text-white break-all">{member.email}</p>
                            <p className="text-xs text-sti-gray">
                              {member.isSuperAdmin ? 'Super Admin' : roleText(member.role)}
                              {member.assignedStudents != null ? ` • ${member.assignedStudents} assigned` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">
                            {member.role === 'COORDINATOR' ? (
                              <div>
                                <p className="font-medium">{member.coordinatorCourse || '—'}</p>
                                {Array.isArray(member.coordinatorSections) && member.coordinatorSections.length > 0 && (
                                  <p className="text-xs text-sti-gray">Sections: {member.coordinatorSections.join(', ')}</p>
                                )}
                              </div>
                            ) : (member.supervisorCompany?.name || meta.companyName || '—')}
                          </td>
                          <td className="px-6 py-3.5">
                            {member.role === 'SUPERVISOR' ? (
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                    supStatus === 'APPROVED' && member.isActive
                                      ? 'bg-green-50 text-green-700 dark:bg-green-950/70 dark:text-green-300'
                                      : supStatus === 'REJECTED'
                                        ? 'bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                                  }`}
                                >
                                  {supStatus === 'APPROVED' && member.isActive
                                    ? 'Approved (Active)'
                                    : supStatus === 'REJECTED'
                                      ? 'Rejected (Inactive)'
                                      : supStatus === 'PENDING'
                                        ? 'Pending'
                                        : 'Inactive'}
                                </span>
                                {meta.reviewedByEmail && (
                                  <p className="text-[11px] text-sti-gray">
                                    Reviewed by {meta.reviewedByEmail}
                                    {meta.reviewedAt ? ` on ${new Date(meta.reviewedAt).toLocaleDateString()}` : ''}
                                  </p>
                                )}
                                {supStatus === 'REJECTED' && meta.rejectionReason && (
                                  <p className="text-[11px] text-red-600 dark:text-red-400">
                                    Reason: {meta.rejectionReason}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${member.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-sti-gray-dark'}`}>
                                {member.isActive ? 'Active' : 'Disabled'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {member.role === 'SUPERVISOR' && (
                                <button
                                  type="button"
                                  onClick={() => setHistoryTarget(member)}
                                  title="View Account Status & History"
                                  className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue transition-colors"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                              )}
                              {isAdmin && member.role === 'SUPERVISOR' && supStatus === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    disabled={reviewingId === member.id}
                                    onClick={() => handleApproveSupervisor(member)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={reviewingId === member.id}
                                    onClick={() => {
                                      setRejectTarget(member);
                                      setRejectionReason('');
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Reject
                                  </button>
                                </>
                              )}
                              {isAdmin && member.role === 'SUPERVISOR' && supStatus === 'REJECTED' && (
                                <button
                                  type="button"
                                  disabled={reviewingId === member.id}
                                  onClick={() => handleApproveSupervisor(member)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sti-blue-50 text-sti-blue hover:bg-sti-blue hover:text-white transition-colors"
                                >
                                  Approve Request
                                </button>
                              )}
                              {isAdmin && !member.isSuperAdmin && member.email !== user?.email && (
                                <>
                                  {member.role !== 'SUPERVISOR' && (
                                    <button onClick={() => handleToggleActive(member)} title={member.isActive ? 'Disable account' : 'Enable account'} className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue transition-colors">
                                      {member.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                    </button>
                                  )}
                                  <button onClick={() => openEditModal(member)} title="Edit account" className="p-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue transition-colors">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  {(member.role !== 'ADMIN' || isSuperAdmin) && (
                                    <button onClick={() => setDeleteTarget(member)} title="Archive account" className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sti-gray hover:text-red-600 transition-colors">
                                      <Archive className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                              {(member.isSuperAdmin || member.email === user?.email) && (
                                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-sti-gray-light text-sti-gray dark:bg-white/10" title="This account cannot be modified here">
                                  Protected
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-black/5 dark:border-white/10">
                  <p className="text-xs text-sti-gray">
                    {visibleStaff.length === 0
                      ? 'No accounts to display'
                      : `Showing ${(page - 1) * pageLimit + 1}-${Math.min(page * pageLimit, visibleStaff.length)} of ${visibleStaff.length}`}
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
        </>
      )}

      <Modal
        isOpen={modalMode === 'add' || modalMode === 'edit'}
        onClose={() => { setModalMode(null); setSelected(null); }}
        title={
          modalMode === 'add'
            ? isCoordinator
              ? 'Request OJT Supervisor Account (Pending Admin Approval)'
              : `Add ${roleText(form.role)}`
            : 'Edit Account'
        }
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>}

          {modalMode === 'add' && isCoordinator && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
              Submitting this form creates an OJT Supervisor account request with <strong>Pending Approval</strong> status. The account will become active after an Administrator reviews and approves it.
            </div>
          )}

          {modalMode === 'add' ? (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Account Type</label>
              {isCoordinator ? (
                <input disabled value="OJT Supervisor (Pending Admin Approval)" className="input-field bg-sti-gray-light/60 dark:bg-slate-700/50 cursor-not-allowed" />
              ) : (
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, coordinatorCourse: '', companyId: '' })} className="input-field">
                  <option value="COORDINATOR">Coordinator</option>
                  {isSuperAdmin && <option value="ADMIN">Admin</option>}
                </select>
              )}
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
                <option value="SUPERVISOR">OJT Supervisor</option>
                <option value="COORDINATOR">Coordinator</option>
                {isSuperAdmin && <option value="ADMIN">Admin</option>}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">First Name *</label>
              <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value.replace(/\d+/g, '') })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Last Name *</label>
              <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value.replace(/\d+/g, '') })} className="input-field" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Email Address *</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`input-field${staffEmailInvalid ? ' border-red-300 focus:border-red-400' : ''}`} />
            {staffEmailInvalid && (
              <p className="flex items-start gap-1.5 text-xs text-red-600 mt-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{getStaffEmailError(form.role)}</span>
              </p>
            )}
          </div>

          {form.role === 'COORDINATOR' && (
            <>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Assigned Program *</label>
                <select required value={form.coordinatorCourse} onChange={(e) => setForm({ ...form, coordinatorCourse: e.target.value })} className="input-field">
                  <option value="">Select program</option>
                  <option value="BSIT">BSIT</option>
                  <option value="BSCS">BSCS</option>
                  <option value="BSCPE">BSCPE</option>
                  <option value="ACT">ACT</option>
                  <option value="BSHM">BSHM</option>
                  <option value="BSTM">BSTM</option>
                  <option value="BSAIS">BSAIS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Assigned Section(s) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 4-101 or 4-101, 4-102"
                  value={form.coordinatorSections || ''}
                  onChange={(e) => setForm({ ...form, coordinatorSections: e.target.value })}
                  className="input-field"
                />
                <p className="text-[11px] text-sti-gray mt-1">Separate multiple sections with commas (e.g., 4-101, 4-102). Students matching this course and section will be automatically assigned.</p>
              </div>
            </>
          )}

          {form.role === 'SUPERVISOR' && (
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">Assigned Partner Company *</label>
              <select required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="input-field">
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-sti-gray-dark dark:text-slate-200 mb-1.5">
              Contact Number {form.role === 'SUPERVISOR' ? '*' : ''}
            </label>
            <input
              required={form.role === 'SUPERVISOR'}
              type="tel"
              inputMode="numeric"
              placeholder="e.g., 09171234567"
              value={form.contactNumber || ''}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value.replace(/[^0-9+\-\s()]/g, '') })}
              className={`input-field${staffContactInvalid ? ' border-red-300 focus:border-red-400' : ''}`}
            />
            {staffContactInvalid && (
              <p className="flex items-start gap-1.5 text-xs text-red-600 mt-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{CONTACT_NUMBER_ERROR}</span>
              </p>
            )}
          </div>

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
            <Button type="submit" variant="primary" loading={saving}>
              {modalMode === 'add'
                ? isCoordinator
                  ? 'Submit Request for Approval'
                  : 'Create Account'
                : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject OJT Supervisor Request Modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectionReason(''); }}
        title="Reject OJT Supervisor Account Request"
        maxWidth="max-w-md"
      >
        {rejectTarget && (
          <form onSubmit={handleConfirmRejectSupervisor} className="space-y-4">
            <p className="text-sm text-sti-gray-dark dark:text-slate-200">
              You are rejecting the OJT Supervisor request for <strong>{[rejectTarget.firstName, rejectTarget.lastName].filter(Boolean).join(' ') || rejectTarget.email}</strong> ({rejectTarget.supervisorCompany?.name || 'Partner Company'}).
            </p>
            <div>
              <label className="block text-xs font-bold text-sti-gray-dark dark:text-slate-200 mb-1.5">
                Rejection Reason (sent to the OJT Coordinator)
              </label>
              <textarea
                rows={3}
                required
                placeholder="Provide a clear reason for rejecting this supervisor account request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setRejectTarget(null); setRejectionReason(''); }}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={reviewingId === rejectTarget.id} className="!bg-red-600 hover:!bg-red-700">
                Confirm Reject
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* OJT Supervisor Request & Approval History Modal */}
      <Modal
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        title="OJT Supervisor Account Details & History"
        maxWidth="max-w-md"
      >
        {historyTarget && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-sti-gray-light/60 dark:bg-slate-900/50 space-y-1.5">
              <p><span className="font-bold text-sti-gray-dark dark:text-white">Supervisor Name:</span> {[historyTarget.firstName, historyTarget.lastName].filter(Boolean).join(' ') || '—'}</p>
              <p><span className="font-bold text-sti-gray-dark dark:text-white">Email:</span> {historyTarget.email}</p>
              <p><span className="font-bold text-sti-gray-dark dark:text-white">Contact Number:</span> {historyTarget.contactNumber || '—'}</p>
              <p><span className="font-bold text-sti-gray-dark dark:text-white">Partner Company:</span> {historyTarget.supervisorCompany?.name || historyTarget.approvalMetadata?.companyName || '—'}</p>
              <p><span className="font-bold text-sti-gray-dark dark:text-white">Current Status:</span> {getSupervisorStatus(historyTarget)}</p>
              {historyTarget.approvalMetadata?.requestedByEmail && (
                <p><span className="font-bold text-sti-gray-dark dark:text-white">Requested By (OJT Coordinator):</span> {historyTarget.approvalMetadata.requestedByEmail}</p>
              )}
              {historyTarget.approvalMetadata?.reviewedByEmail && (
                <p><span className="font-bold text-sti-gray-dark dark:text-white">Reviewed By (Admin):</span> {historyTarget.approvalMetadata.reviewedByEmail}</p>
              )}
              {historyTarget.approvalMetadata?.reviewedAt && (
                <p><span className="font-bold text-sti-gray-dark dark:text-white">Review Date:</span> {new Date(historyTarget.approvalMetadata.reviewedAt).toLocaleString()}</p>
              )}
              {historyTarget.approvalMetadata?.rejectionReason && (
                <p className="text-red-600 dark:text-red-400"><span className="font-bold">Rejection Reason:</span> {historyTarget.approvalMetadata.rejectionReason}</p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-sti-gray">Status Timeline</h4>
              {Array.isArray(historyTarget.approvalMetadata?.history) && historyTarget.approvalMetadata.history.length > 0 ? (
                <div className="space-y-2">
                  {historyTarget.approvalMetadata.history.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-black/5 dark:border-white/10">
                      <div className="flex items-center justify-between font-bold text-sti-gray-dark dark:text-white">
                        <span>{item.action}</span>
                        <span className="text-[11px] font-normal text-sti-gray">
                          {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-sti-gray mt-0.5">
                        Actor: {item.actorEmail || item.actorRole || 'System'} ({item.actorRole || 'Staff'})
                      </p>
                      {item.rejectionReason && (
                        <p className="text-red-600 dark:text-red-400 mt-0.5">Reason: {item.rejectionReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sti-gray">Account created on {new Date(historyTarget.createdAt).toLocaleString()}.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!credentials} onClose={() => setCredentials(null)} title={credentials?.title || 'Account created'} maxWidth="max-w-md">
        {credentials && (
          <div className="text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-sti-blue to-sti-blue-dark flex items-center justify-center shadow-lg shadow-sti-blue/30 animate-slide-up">
              <CheckCircle2 className="w-9 h-9 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-sti-gray-dark dark:text-white">{credentials.title || 'Account created'}</h3>
              <p className="text-sm text-sti-gray mt-1 break-all">{credentials.email}</p>
              {credentials.subtitle && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 bg-amber-50 dark:bg-amber-950/50 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                  {credentials.subtitle}
                </p>
              )}
            </div>

            <Button variant="primary" className="w-full" onClick={() => setCredentials(null)}>Done</Button>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Archive Account" maxWidth="max-w-sm">
        <p className="text-sm text-sti-gray-dark dark:text-slate-200">
          Move <strong>{deleteTarget?.email}</strong> to the Archive? They will no longer be able to sign in,
          but their history is kept and you can restore them from the Archive page.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="primary" icon={Archive} onClick={handleDelete} loading={deleting}>Archive</Button>
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
                  Headers must include <code className="bg-white dark:bg-slate-800 px-1 rounded">firstName</code>, <code className="bg-white dark:bg-slate-800 px-1 rounded">lastName</code>, <code className="bg-white dark:bg-slate-800 px-1 rounded">email</code>, <code className="bg-white dark:bg-slate-800 px-1 rounded">role</code> (SUPERVISOR or COORDINATOR). Coordinators also need <code className="bg-white dark:bg-slate-800 px-1 rounded">program</code>, supervisors need <code className="bg-white dark:bg-slate-800 px-1 rounded">company</code> (exact company name). Spaces, underscores and dashes in headers are accepted.
                </p>
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
