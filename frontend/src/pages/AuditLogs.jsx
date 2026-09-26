import { useEffect, useState } from 'react';
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight, LogIn, LogOut, Trash2, Pencil, Plus, CheckCircle2, Send, Link2, Unlink, FileDown, ShieldAlert } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getAuditLogs, deleteAuditLog, clearAuditLogs } from '../services/auditLogService';
import { useAuth } from '../hooks/useAuth';

const actionMeta = {
  CREATE: { icon: Plus, className: 'bg-emerald-50 text-emerald-600' },
  UPDATE: { icon: Pencil, className: 'bg-sti-blue-50 text-sti-blue' },
  DELETE: { icon: Trash2, className: 'bg-red-50 text-red-600' },
  LOGIN: { icon: LogIn, className: 'bg-sti-blue-50 text-sti-blue' },
  LOGIN_FAILED: { icon: ShieldAlert, className: 'bg-red-50 text-red-600' },
  LOGOUT: { icon: LogOut, className: 'bg-sti-gray-light text-sti-gray' },
  REVIEW: { icon: CheckCircle2, className: 'bg-sti-yellow/20 text-sti-yellow-dark' },
  SUBMIT: { icon: Send, className: 'bg-sti-blue-50 text-sti-blue' },
  EXPORT: { icon: FileDown, className: 'bg-sti-gray-light text-sti-gray' },
  LINK: { icon: Link2, className: 'bg-emerald-50 text-emerald-600' },
  UNLINK: { icon: Unlink, className: 'bg-sti-gray-light text-sti-gray' },
};

const actionLabel = (action) =>
  action === 'LOGIN_FAILED' ? 'Failed sign-in' : action.charAt(0) + action.slice(1).toLowerCase();

const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const AuditLogs = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [logs, setLogs] = useState([]);
  const [facets, setFacets] = useState({ actions: [], entities: [], actors: [] });
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ action: '', entity: '', actor: '', search: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);

  const load = async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = { page: targetPage, limit: 25 };
      if (filters.action) params.action = filters.action;
      if (filters.entity) params.entity = filters.entity;
      if (filters.actor) params.userId = filters.actor;
      if (filters.search) params.search = filters.search;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const res = await getAuditLogs(params);
      setLogs(res.data?.data || []);
      setFacets(res.data?.facets || { actions: [], entities: [], actors: [] });
      setMeta({ total: res.data?.total || 0, page: res.data?.page || 1, totalPages: res.data?.totalPages || 1 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.action, filters.entity, filters.actor, filters.from, filters.to]);

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const hasFilters = Object.values(filters).some(Boolean);

  const handleDelete = async (log) => {
    if (!window.confirm('Delete this audit entry? This cannot be undone.')) return;
    try {
      await deleteAuditLog(log.id);
      load(meta.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete the audit entry');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete ALL audit log entries? This cannot be undone.')) return;
    try {
      await clearAuditLogs();
      load(1);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clear the audit log');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-sti-blue" /> Audit Logs
          </h1>
          <p className="text-sm text-sti-gray">Every account and academic change recorded in the system, newest first.</p>
        </div>
        {isAdmin && (
          <Button variant="danger" icon={Trash2} onClick={handleClearAll}>Clear all logs</Button>
        )}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
            <input
              value={filters.search}
              onChange={(e) => update('search', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(1); }}
              placeholder="Search description, email, entity…"
              className="input-field pl-9 text-sm py-2.5"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
            <select value={filters.action} onChange={(e) => update('action', e.target.value)} className="input-field pl-9 text-sm py-2.5">
              <option value="">All actions</option>
              {facets.actions.map((a) => (
                <option key={a} value={a}>{actionLabel(a)}</option>
              ))}
            </select>
          </div>
          <select value={filters.entity} onChange={(e) => update('entity', e.target.value)} className="input-field text-sm py-2.5">
            <option value="">All areas</option>
            {facets.entities.map((entity) => (
              <option key={entity} value={entity}>{entity}</option>
            ))}
          </select>
          <select value={filters.actor} onChange={(e) => update('actor', e.target.value)} className="input-field text-sm py-2.5">
            <option value="">All users</option>
            {facets.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>{actor.email}{actor.role ? ` (${actor.role.toLowerCase()})` : ''}</option>
            ))}
          </select>
          <div>
            <label className="block text-[11px] font-medium text-sti-gray mb-1">From</label>
            <input type="date" value={filters.from} onChange={(e) => update('from', e.target.value)} className="input-field text-sm py-2" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-sti-gray mb-1">To</label>
            <input type="date" value={filters.to} onChange={(e) => update('to', e.target.value)} className="input-field text-sm py-2" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Button variant="primary" onClick={() => load(1)} className="text-sm px-4 py-2">Apply search</Button>
          {hasFilters && (
            <Button
              variant="secondary"
              onClick={() => { setFilters({ action: '', entity: '', actor: '', search: '', from: '', to: '' }); }}
              className="text-sm px-4 py-2"
            >
              Clear filters
            </Button>
          )}
          <span className="text-xs text-sti-gray ml-auto">{meta.total} recorded {meta.total === 1 ? 'entry' : 'entries'}</span>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-sti-gray p-8 text-center">No audit entries match these filters yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-sti-gray bg-sti-gray-light/60 dark:bg-slate-800/60">
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Area</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  {isAdmin && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badge = actionMeta[log.action] || { icon: ScrollText, className: 'bg-sti-gray-light text-sti-gray' };
                  const Icon = badge.icon;
                  return (
                    <tr key={log.id} className="border-t border-black/5 dark:border-white/10 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-sti-gray">{formatDateTime(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sti-gray-dark dark:text-white break-all">{log.userEmail || 'Unknown user'}</p>
                        {log.userRole && <p className="text-[11px] text-sti-gray">{log.userRole.toLowerCase()}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${badge.className}`}>
                          <Icon className="w-3 h-3" /> {actionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sti-gray">{log.entity}</td>
                      <td className="px-4 py-3">
                        <p className="text-sti-gray-dark dark:text-slate-200 break-words">{log.description}</p>
                        {log.metadata && (
                          <p className="text-[11px] text-sti-gray mt-1 break-words">
                            {Object.entries(log.metadata).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' • ')}
                          </p>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(log)}
                            title="Delete entry"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sti-gray hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-black/5 dark:border-white/10">
            <p className="text-xs text-sti-gray">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="secondary" icon={ChevronLeft} disabled={meta.page <= 1} onClick={() => load(meta.page - 1)} className="text-xs px-3 py-1.5">Previous</Button>
              <Button variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => load(meta.page + 1)} className="text-xs px-3 py-1.5">Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;
