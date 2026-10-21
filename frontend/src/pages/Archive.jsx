import { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Search, GraduationCap, Users, Building2 } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { getArchivedRecords, restoreStudent, restoreStaff, restoreCompany } from '../services/archiveService';
import { courseLabel } from '../constants/programs';

const ROLE_LABELS = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinator',
  SUPERVISOR: 'Supervisor'
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const studentName = (student) => `${student.firstName} ${student.lastName}`.trim() || student.email || 'Student';
const staffName = (member) => [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;

const ArchivePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [records, setRecords] = useState({ students: [], staff: [], companies: [] });
  const [activeTab, setActiveTab] = useState('students');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState('');

  const tabs = useMemo(
    () => [
      { key: 'students', label: 'Students', icon: GraduationCap },
      ...(isAdmin ? [{ key: 'staff', label: 'Staff', icon: Users }] : []),
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
        staff: data?.staff || [],
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

  const rows = useMemo(() => {
    const list = records[activeTab] || [];
    const term = search.trim().toLowerCase();
    if (!term) return list;

    return list.filter((item) => {
      if (activeTab === 'students') {
        return [studentName(item), item.studentId, item.email, item.course, item.company?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      }
      if (activeTab === 'staff') {
        return [staffName(item), item.email, item.role, item.coordinatorCourse, item.supervisorCompany?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      }
      return [item.name, item.industryType, item.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [records, activeTab, search]);

  const handleRestore = async (type, item) => {
    const label = type === 'students' ? studentName(item) : type === 'staff' ? staffName(item) : item.name;
    if (!window.confirm(`Restore ${label}? They will appear in the active lists again.`)) return;

    const key = `${type}:${item.id}`;
    setRestoring(key);
    try {
      if (type === 'students') await restoreStudent(item.id);
      else if (type === 'staff') await restoreStaff(item.id);
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
        <p className="text-xs text-sti-gray">
          Showing {rows.length} archived {rows.length === 1 ? 'record' : 'records'}
        </p>
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
                      <th className="px-6 py-3 font-semibold">Student</th>
                      <th className="px-6 py-3 font-semibold">Course</th>
                      <th className="px-6 py-3 font-semibold">Company</th>
                    </>
                  )}
                  {activeTab === 'staff' && (
                    <>
                      <th className="px-6 py-3 font-semibold">Account</th>
                      <th className="px-6 py-3 font-semibold">Role</th>
                      <th className="px-6 py-3 font-semibold">Assignment</th>
                    </>
                  )}
                  {activeTab === 'companies' && (
                    <>
                      <th className="px-6 py-3 font-semibold">Company</th>
                      <th className="px-6 py-3 font-semibold">Industry</th>
                      <th className="px-6 py-3 font-semibold">Address</th>
                    </>
                  )}
                  <th className="px-6 py-3 font-semibold">Archived</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
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
                      {activeTab === 'staff' && (
                        <>
                          <td className="px-6 py-3.5">
                            <p className="font-medium text-sti-gray-dark dark:text-white">{staffName(item)}</p>
                            <p className="text-xs text-sti-gray break-all">{item.email}</p>
                          </td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">{ROLE_LABELS[item.role] || item.role}</td>
                          <td className="px-6 py-3.5 text-sti-gray-dark dark:text-slate-200">
                            {item.role === 'COORDINATOR' ? (item.coordinatorCourse || '—') : (item.supervisorCompany?.name || '—')}
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
          </div>
        )}
      </Card>
    </div>
  );
};

export default ArchivePage;
