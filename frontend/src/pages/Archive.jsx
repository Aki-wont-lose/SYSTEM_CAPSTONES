import { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Search, GraduationCap, Users, UserCog, Building2, ArrowUpDown, ArrowUp, ArrowDown, Trash2, AlertTriangle, Eye } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import { useAuth } from '../hooks/useAuth';
import {
  getArchivedRecords,
  restoreStudent,
  restoreCoordinator,
  restoreSupervisor,
  restoreCompany,
  deleteStudentPermanently,
  deleteCoordinatorPermanently,
  deleteSupervisorPermanently,
  deleteCompanyPermanently
} from '../services/archiveService';
import { courseLabel } from '../constants/programs';

const PAGE_SIZES = [10, 50, 100, 'ALL'];
const ACADEMIC_YEAR_OPTIONS = ['2026-2027', '2027-2028', '2028-2029', '2029-2030'];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const studentName = (student) => `${student.firstName} ${student.lastName}`.trim() || student.email || 'Student';
const coordinatorName = (member) => [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;

const ArchivePage = () => {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const isAdmin = user?.role === 'ADMIN';
  const canManageArchive = !isSuperAdmin;
  const canDelete = isAdmin && !isSuperAdmin;
  const [records, setRecords] = useState({ students: [], coordinators: [], supervisors: [], companies: [] });
  const [activeTab, setActiveTab] = useState('students');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [viewCompany, setViewCompany] = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);
  const [renewForm, setRenewForm] = useState({
    academicYear: '2026-2027',
    customAcademicYear: '',
    startDate: '',
    expirationDate: ''
  });
  const [renewError, setRenewError] = useState('');
  const [renewSaving, setRenewSaving] = useState(false);

  const tabs = useMemo(
    () => [
      { key: 'students', label: 'Students', icon: GraduationCap },
      ...(isAdmin ? [{ key: 'coordinators', label: 'Coordinators', icon: Users }] : []),
      ...(isAdmin ? [{ key: 'supervisors', label: 'Supervisors', icon: UserCog }] : []),
      { key: 'companies', label: 'Companies', icon: Building2 }
    ],
    [isAdmin]
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getArchivedRecords();
      setRecords({
        students: data?.students || [],
        coordinators: data?.coordinators || [],
        supervisors: data?.supervisors || [],
        companies: data?.companies || []
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the archive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) setActiveTab('students');
  }, [tabs, activeTab]);

  const handleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
  };

  const sortValue = (item, key) => {
    if (key === 'archived') {
      return item.archivedAt ? new Date(item.archivedAt).getTime() : 0;
    }
    if (activeTab === 'students') {
      if (key === 'name') return studentName(item).toLowerCase();
      if (key === 'course') return `${courseLabel(item.course) || ''} ${item.section || ''}`.trim().toLowerCase();
      if (key === 'company') return (item.company?.name || '').toLowerCase();
    }
    if (activeTab === 'coordinators') {
      if (key === 'name') return coordinatorName(item).toLowerCase();
      if (key === 'course') return (item.coordinatorCourse ? courseLabel(item.coordinatorCourse) : '').toLowerCase();
    }
    if (activeTab === 'supervisors') {
      if (key === 'name') return coordinatorName(item).toLowerCase();
      if (key === 'company') return (item.supervisorCompany?.name || '').toLowerCase();
    }
    if (activeTab === 'companies') {
      if (key === 'name') return (item.name || '').toLowerCase();
      if (key === 'academicYear') return (item.academicYear || '').toLowerCase();
      if (key === 'expirationDate') return item.expirationDate ? new Date(item.expirationDate).getTime() : 0;
      if (key === 'status') return (item.status || '').toLowerCase();
    }
    return String(item[key] ?? '').toLowerCase();
  };

  const rows = useMemo(() => {
    const list = records[activeTab] || [];
    const term = search.trim().toLowerCase();
    const filtered = !term
      ? list
      : list.filter((item) => {
          if (activeTab === 'students') {
            return [studentName(item), item.studentId, item.email, item.course, item.company?.name]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(term));
          }
          if (activeTab === 'coordinators') {
            return [coordinatorName(item), item.email, item.coordinatorCourse]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(term));
          }
          if (activeTab === 'supervisors') {
            return [coordinatorName(item), item.email, item.supervisorCompany?.name]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(term));
          }
          return [item.name, item.industryType, item.address, item.academicYear, item.status]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term));
        });

    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = sortValue(a, sort.key);
      const right = sortValue(b, sort.key);
      if (left === right) return 0;
      return left > right ? direction : -direction;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, activeTab, search, sort]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, sort, pageSize]);

  const changePageSize = (value) => {
    setPageSize(value === 'ALL' ? 'ALL' : Number(value));
    setPage(1);
  };

  const pageLimit = pageSize === 'ALL' ? rows.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageLimit));
  const paginatedRows = rows.slice((page - 1) * pageLimit, page * pageLimit);

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

  const recordName = (type, item) =>
    type === 'students' ? studentName(item) : type === 'companies' ? item.name : coordinatorName(item);

  const openRenewCompany = (company) => {
    setRenewTarget(company);
    setRenewError('');
    setRenewForm({
      academicYear: ACADEMIC_YEAR_OPTIONS.includes(company.academicYear) ? company.academicYear : '2026-2027',
      customAcademicYear: '',
      startDate: '',
      expirationDate: ''
    });
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!renewTarget) return;
    const academicYear = renewForm.academicYear === 'CUSTOM'
      ? renewForm.customAcademicYear.trim()
      : renewForm.academicYear;
    if (!academicYear) {
      setRenewError('Academic year is required.');
      return;
    }
    if (!renewForm.startDate || !renewForm.expirationDate) {
      setRenewError('Start date and expiration date are required.');
      return;
    }
    if (new Date(renewForm.expirationDate) <= new Date(renewForm.startDate)) {
      setRenewError('Expiration date must be after start date.');
      return;
    }
    setRenewSaving(true);
    setRenewError('');
    try {
      await restoreCompany(renewTarget.id, {
        academicYear,
        startDate: renewForm.startDate,
        expirationDate: renewForm.expirationDate
      });
      setRenewTarget(null);
      await load();
    } catch (err) {
      setRenewError(err.response?.data?.message || 'Could not renew/restore this company.');
    } finally {
      setRenewSaving(false);
    }
  };

  const handleRestore = async (type, item) => {
    if (type === 'companies') {
      openRenewCompany(item);
      return;
    }
    const label = recordName(type, item);
    if (!window.confirm(`Restore ${label}? They will appear in the active lists again.`)) return;

    const key = `${type}:${item.id}`;
    setRestoring(key);
    try {
      if (type === 'students') await restoreStudent(item.id);
      else if (type === 'coordinators') await restoreCoordinator(item.id);
      else if (type === 'supervisors') await restoreSupervisor(item.id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not restore this record.');
    } finally {
      setRestoring('');
    }
  };

  const handleDeletePermanently = async () => {
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;
    setDeleting(true);
    setDeleteError('');
    try {
      if (type === 'students') await deleteStudentPermanently(item.id);
      else if (type === 'coordinators') await deleteCoordinatorPermanently(item.id);
      else if (type === 'supervisors') await deleteSupervisorPermanently(item.id);
      else await deleteCompanyPermanently(item.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete this record.');
    } finally {
      setDeleting(false);
    }
  };

  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.label.toLowerCase() || 'records';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white flex items-center gap-2">
          <Archive className="w-5 h-5 text-sti-blue" /> Archive
        </h1>
        <p className="text-sm text-sti-gray">
          Archived accounts and companies are hidden from the active lists but keep all of their history. Restore any record at any time, or delete it permanently if it was only test data.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-black/5 dark:border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearch(''); }}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  isActive ? 'border-sti-blue text-sti-blue' : 'border-transparent text-sti-gray hover:text-sti-gray-dark'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-sti-blue text-white' : 'bg-sti-gray-light dark:bg-slate-700 text-sti-gray'}`}>
                  {records[tab.key]?.length || 0}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search archived ${activeLabel}...`}
            className="input-field pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
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

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <Archive className="w-8 h-8 text-sti-gray mx-auto mb-3 opacity-50" />
            <p className="text-sm text-sti-gray">
              {search ? `No archived ${activeLabel} match "${search}".` : `No archived ${activeLabel} yet.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/10 text-left text-[11px] uppercase tracking-wide text-sti-gray bg-sti-gray-light/60 dark:bg-slate-800/60">
                  {activeTab === 'students' && (
                    <>
                      <SortHeader label="Student" sortKey="name" />
                      <SortHeader label="Course" sortKey="course" />
                      <SortHeader label="Company" sortKey="company" />
                    </>
                  )}
                  {activeTab === 'coordinators' && (
                    <>
                      <SortHeader label="Account" sortKey="name" />
                      <SortHeader label="Course" sortKey="course" />
                    </>
                  )}
                  {activeTab === 'supervisors' && (
                    <>
                      <SortHeader label="Account" sortKey="name" />
                      <SortHeader label="Company" sortKey="company" />
                    </>
                  )}
                  {activeTab === 'companies' && (
                    <>
                      <SortHeader label="Company" sortKey="name" />
                      <SortHeader label="Academic Year" sortKey="academicYear" />
                      <SortHeader label="Validity Period" sortKey="expirationDate" />
                      <SortHeader label="Status" sortKey="status" />
                    </>
                  )}
                  <SortHeader label="Archived" sortKey="archived" />
                  <th className="px-6 py-3 font-semibold text-sti-gray text-xs uppercase tracking-wide text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((item) => {
                  const key = `${activeTab}:${item.id}`;
                  return (
                    <tr key={item.id} className="border-b border-black/5 dark:border-white/10 last:border-0 hover:bg-sti-gray-light/50 dark:hover:bg-white/5 transition-colors">
                      {activeTab === 'students' && (
                        <>
                          <td className="px-6 py-3.5">
                            <p className="font-medium text-sti-gray-dark dark:text-white">{studentName(item)}</p>
                            <p className="text-xs text-sti-gray">{item.studentId} • {item.email}</p>
                          </td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">
                            {courseLabel(item.course)}
                            <p className="text-xs text-sti-gray">{item.section}</p>
                          </td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{item.company?.name || '—'}</td>
                        </>
                      )}
                      {activeTab === 'coordinators' && (
                        <>
                          <td className="px-6 py-3.5">
                            <p className="font-medium text-sti-gray-dark dark:text-white">{coordinatorName(item)}</p>
                            <p className="text-xs text-sti-gray break-all">{item.email}</p>
                          </td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">
                            {item.coordinatorCourse ? courseLabel(item.coordinatorCourse) : '—'}
                          </td>
                        </>
                      )}
                      {activeTab === 'supervisors' && (
                        <>
                          <td className="px-6 py-3.5">
                            <p className="font-medium text-sti-gray-dark dark:text-white">{coordinatorName(item)}</p>
                            <p className="text-xs text-sti-gray break-all">{item.email}</p>
                          </td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">
                            {item.supervisorCompany?.name || '—'}
                          </td>
                        </>
                      )}
                      {activeTab === 'companies' && (
                        <>
                          <td className="px-6 py-3.5">
                            <p className="font-medium text-sti-gray-dark dark:text-white">{item.name}</p>
                            <p className="text-xs text-sti-gray">
                              {item.industryType || 'Partner'} • {item._count?.students ?? 0} linked {item._count?.students === 1 ? 'student' : 'students'}
                            </p>
                          </td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200 whitespace-nowrap">
                            {item.academicYear || '—'}
                          </td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200 whitespace-nowrap text-xs">
                            {item.startDate && item.expirationDate
                              ? `${formatDate(item.startDate)} – ${formatDate(item.expirationDate)}`
                              : '—'}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              item.status === 'EXPIRED'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {item.status || 'INACTIVE'}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-3.5 whitespace-nowrap text-sti-gray">{formatDate(item.archivedAt)}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'companies' && (
                            <Button
                              variant="secondary"
                              icon={Eye}
                              onClick={() => setViewCompany(item)}
                              className="text-xs px-3 py-2"
                            >
                              View
                            </Button>
                          )}
                          {canManageArchive && (
                            <Button
                              variant="secondary"
                              icon={ArchiveRestore}
                              onClick={() => handleRestore(activeTab, item)}
                              loading={restoring === key}
                              className="text-xs px-3 py-2"
                            >
                              {activeTab === 'companies' ? 'Renew / Restore' : 'Restore'}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="danger"
                              icon={Trash2}
                              onClick={() => {
                                setDeleteError('');
                                setDeleteTarget({ type: activeTab, item });
                              }}
                              className="text-xs px-3 py-2"
                            >
                              Delete
                            </Button>
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
                {rows.length === 0
                  ? 'No records to display'
                  : `Showing ${(page - 1) * pageLimit + 1}-${Math.min(page * pageLimit, rows.length)} of ${rows.length}`}
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

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        title="Delete permanently"
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/30">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="font-semibold">This cannot be undone.</p>
              <p className="mt-1">
                Deleting removes the record and its history from the database. It will not appear in the archive again.
              </p>
            </div>
          </div>

          <p className="text-sm text-sti-gray-dark dark:text-slate-200">
            Permanently delete{' '}
            <strong>{deleteTarget ? recordName(deleteTarget.type, deleteTarget.item) : ''}</strong>
            {deleteTarget?.type === 'students'
              ? ' — the student profile, DTR, submissions, logs, weekly tasks and messages will be removed.'
              : deleteTarget?.type === 'companies'
                ? ' — this only works when no student or supervisor is still linked to the company.'
                : ' — the account and its messages will be removed.'}
          </p>

          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDeletePermanently} loading={deleting}>
              Delete permanently
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(viewCompany)}
        onClose={() => setViewCompany(null)}
        title={viewCompany ? `Archived Company — ${viewCompany.name}` : 'Archived Company'}
      >
        {viewCompany && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-sti-gray-light/60 dark:bg-slate-800/60">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Company Name</p>
                <p className="font-semibold text-sti-gray-dark dark:text-white">{viewCompany.name}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Industry</p>
                <p className="font-medium text-sti-gray-dark dark:text-slate-200">{viewCompany.industryType || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Academic Year</p>
                <p className="font-medium text-sti-gray-dark dark:text-slate-200">{viewCompany.academicYear || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Status</p>
                <p className="font-semibold text-sti-gray-dark dark:text-slate-200">{viewCompany.status || 'INACTIVE'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Start Date</p>
                <p className="font-medium text-sti-gray-dark dark:text-slate-200">{formatDate(viewCompany.startDate)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Expiration Date</p>
                <p className="font-medium text-sti-gray-dark dark:text-slate-200">{formatDate(viewCompany.expirationDate)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Archived Date</p>
                <p className="font-medium text-sti-gray-dark dark:text-slate-200">{formatDate(viewCompany.archivedAt)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Linked Students</p>
                <p className="font-medium text-sti-gray-dark dark:text-slate-200">{viewCompany._count?.students ?? 0}</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-sti-gray">Address</p>
              <p className="text-sti-gray-dark dark:text-slate-200">{viewCompany.address || '—'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Contact Person</p>
                <p className="text-sti-gray-dark dark:text-slate-200">{viewCompany.contactPerson || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Contact Number</p>
                <p className="text-sti-gray-dark dark:text-slate-200">{viewCompany.contactNumber || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-sti-gray">Email</p>
                <p className="text-sti-gray-dark dark:text-slate-200 break-all">{viewCompany.email || '—'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {canManageArchive && (
                <Button variant="primary" icon={ArchiveRestore} onClick={() => { const c = viewCompany; setViewCompany(null); openRenewCompany(c); }}>
                  Renew / Restore
                </Button>
              )}
              <Button variant="secondary" onClick={() => setViewCompany(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(renewTarget)}
        onClose={() => { if (!renewSaving) setRenewTarget(null); }}
        title={renewTarget ? `Renew Partner Company — ${renewTarget.name}` : 'Renew Partner Company'}
      >
        <form onSubmit={handleRenewSubmit} className="space-y-4">
          <p className="text-xs text-sti-gray">
            Renewing creates a new active partner company record for the selected academic year while preserving the archived history.
          </p>
          <div>
            <label className="label">Academic Year</label>
            <select
              value={renewForm.academicYear}
              onChange={(e) => setRenewForm({ ...renewForm, academicYear: e.target.value })}
              className="input-field"
            >
              {ACADEMIC_YEAR_OPTIONS.map((ay) => (
                <option key={ay} value={ay}>{ay}</option>
              ))}
              <option value="CUSTOM">Custom Academic Year</option>
            </select>
            {renewForm.academicYear === 'CUSTOM' && (
              <input
                type="text"
                placeholder="e.g. 2030-2031"
                value={renewForm.customAcademicYear}
                onChange={(e) => setRenewForm({ ...renewForm, customAcademicYear: e.target.value })}
                className="input-field mt-2"
                required
              />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={renewForm.startDate}
                onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Expiration Date</label>
              <input
                type="date"
                value={renewForm.expirationDate}
                onChange={(e) => setRenewForm({ ...renewForm, expirationDate: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>
          {renewError && <p className="text-sm text-red-600">{renewError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setRenewTarget(null)} disabled={renewSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={ArchiveRestore} loading={renewSaving}>
              Renew & Restore
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ArchivePage;
