import { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Search, GraduationCap, Users, UserCog, Building2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { getArchivedRecords, restoreStudent, restoreCoordinator, restoreSupervisor, restoreCompany } from '../services/archiveService';
import { courseLabel } from '../constants/programs';

const PAGE_SIZES = [10, 50, 100, 'ALL'];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const studentName = (student) => `${student.firstName} ${student.lastName}`.trim() || student.email || 'Student';
const coordinatorName = (member) => [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;

const ArchivePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [records, setRecords] = useState({ students: [], coordinators: [], supervisors: [], companies: [] });
  const [activeTab, setActiveTab] = useState('students');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState('');

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
      if (key === 'industry') return (item.industryType || '').toLowerCase();
      if (key === 'address') return (item.address || '').toLowerCase();
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
          return [item.name, item.industryType, item.address]
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

  const handleRestore = async (type, item) => {
    const label = type === 'students' ? studentName(item) : type === 'companies' ? item.name : coordinatorName(item);
    if (!window.confirm(`Restore ${label}? They will appear in the active lists again.`)) return;

    const key = `${type}:${item.id}`;
    setRestoring(key);
    try {
      if (type === 'students') await restoreStudent(item.id);
      else if (type === 'coordinators') await restoreCoordinator(item.id);
      else if (type === 'supervisors') await restoreSupervisor(item.id);
      else await restoreCompany(item.id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not restore this record.');
    } finally {
      setRestoring('');
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
          Archived accounts and companies are hidden from the active lists but keep all of their history. Restore any record at any time.
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
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
          </div>
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
                      <SortHeader label="Industry" sortKey="industry" />
                      <SortHeader label="Address" sortKey="address" />
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
                            <p className="text-xs text-sti-gray">{item._count?.students ?? 0} linked {item._count?.students === 1 ? 'student' : 'students'}</p>
                          </td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{item.industryType || '—'}</td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{item.address || '—'}</td>
                        </>
                      )}
                      <td className="px-6 py-3.5 whitespace-nowrap text-sti-gray">{formatDate(item.archivedAt)}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-end">
                          <Button
                            variant="secondary"
                            icon={ArchiveRestore}
                            onClick={() => handleRestore(activeTab, item)}
                            loading={restoring === key}
                            className="text-xs px-3 py-2"
                          >
                            Restore
                          </Button>
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
    </div>
  );
};

export default ArchivePage;
