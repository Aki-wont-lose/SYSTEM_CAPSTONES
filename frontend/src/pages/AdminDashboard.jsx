import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, CheckCircle2, Clock3, GraduationCap, XCircle, Building2, ArrowRight } from 'lucide-react';
import Card, { StatCard } from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import CalendarWidget from '../components/CalendarWidget';
import WelcomeCarousel from '../components/WelcomeCarousel';
import { useAuth } from '../hooks/useAuth';
import { getStaffAccounts, reviewSupervisorAccount } from '../services/accountService';
import { getDashboardStats } from '../services/studentService';
import { getActiveAnnouncements } from '../services/announcementService';

const PROGRAM_ORDER = ['BSIT', 'BSCS', 'BSCPE', 'ACT', 'BSHM', 'BSTM', 'BSAIS'];

// Show the admin/coordinator dashboard with announcements, program stats, status counts, and OJT Supervisor Pending Approvals
const AdminDashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isCoordinator = user?.role === 'COORDINATOR';
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadSupervisorRequests = async () => {
    if (!isAdmin && !isCoordinator) return;
    try {
      const res = await getStaffAccounts({ role: 'SUPERVISOR' });
      setSupervisors(res.data || []);
    } catch {
      // ignore if unauthorized
    }
  };

  // Load dashboard stats, latest announcements, and supervisor requests together on mount
  useEffect(() => {
    Promise.all([
      getDashboardStats().then((r) => r.data),
      getActiveAnnouncements().then((r) => r.data.slice(0, 3)).catch(() => []),
      loadSupervisorRequests()
    ])
      .then(([statsData, annData]) => {
        setStats(statsData);
        setAnnouncements(annData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (member) => {
    setReviewingId(member.id);
    try {
      await reviewSupervisorAccount(member.id, { action: 'APPROVE' });
      await loadSupervisorRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve supervisor request');
    } finally {
      setReviewingId(null);
    }
  };

  const handleRejectSubmit = async (e) => {
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
      await loadSupervisorRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject supervisor request');
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const byCourse = stats?.byCourse || {};
  // Build the program rows, known programs first then any extras
  const programRows = [
    ...PROGRAM_ORDER.filter((p) => byCourse[p] != null).map((p) => ({ label: p, value: byCourse[p] })),
    ...Object.entries(byCourse)
      .filter(([key]) => !PROGRAM_ORDER.includes(key))
      .map(([label, value]) => ({ label, value }))
  ];
  // Largest program count so bars can be scaled to 100%
  const maxProgram = Math.max(1, ...programRows.map((r) => r.value));

  const pendingSupervisors = supervisors.filter(
    (s) => (s.approvalStatus || (s.isActive ? 'APPROVED' : 'PENDING')) === 'PENDING'
  );
  const recentReviewedSupervisors = supervisors
    .filter((s) => s.approvalMetadata?.reviewedAt)
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main content (left) + quick info (right). items-start keeps every card at
          its natural height so a short card never stretches into empty space. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <WelcomeCarousel />
          {announcements.length === 0 ? (
            <Card><p className="text-sm text-sti-gray text-center py-6">No announcements yet</p></Card>
          ) : announcements.map((a) => (
            <Card key={a.id} className="p-0 overflow-hidden">
              {a.image && <img src={a.image} alt={a.title} className="w-full h-56 object-cover" />}
              <div className="p-4">
                <h4 className="font-bold text-sm">{a.title}</h4>
                <p className="text-sm text-sti-gray mt-1">{a.content}</p>
                <p className="text-xs text-sti-gray/70 mt-2">{new Date(a.publishedAt || a.createdAt).toLocaleDateString()}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <CalendarWidget />
          <Card>
            <h3 className="font-bold text-sti-gray-dark dark:text-white text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sti-blue" /> Interns per Program
            </h3>
            {programRows.length === 0 ? (
              <p className="text-sm text-sti-gray mt-3">No program data yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {programRows.map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-sti-gray-dark dark:text-slate-200">{row.label}</span>
                      <span className="text-sti-gray">{row.value} intern{row.value === 1 ? '' : 's'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-sti-gray-light dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-sti-blue" style={{ width: `${Math.round((row.value / maxProgram) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Headline status counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Enrolled Interns" value={stats?.totalStudents ?? stats?.total ?? 0} icon={Users} accent="blue" />
        <StatCard label="Ongoing Interns" value={stats?.active ?? 0} icon={UserCheck} accent="green" />
        <StatCard label="Pending Placement" value={stats?.pending ?? 0} icon={Clock3} accent="red" />
        <StatCard label="Completed OJT" value={stats?.completed ?? 0} icon={CheckCircle2} accent="yellow" />
      </div>

      {/* Requirement 5C: Pending Approval Section for OJT Supervisor Account Requests */}
      {(isAdmin || isCoordinator) && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-3">
            <div>
              <h3 className="font-bold text-sti-gray-dark dark:text-white text-sm sm:text-base flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-sti-blue" />
                {isAdmin
                  ? 'Pending Approval — OJT Supervisor Account Requests'
                  : 'OJT Supervisor Account Requests & Approval Status'}
                {pendingSupervisors.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    {pendingSupervisors.length} Pending
                  </span>
                )}
              </h3>
              <p className="text-xs text-sti-gray mt-0.5">
                {isAdmin
                  ? 'Review OJT Supervisor account requests submitted by OJT Coordinators. Pending accounts remain inactive until approved.'
                  : 'Monitor the approval status of OJT Supervisor accounts or submit a new supervisor account request.'}
              </p>
            </div>
            <Link
              to="/accounts?tab=SUPERVISOR"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sti-blue hover:underline shrink-0"
            >
              {isCoordinator ? 'Create / Monitor Supervisor Accounts' : 'Open Supervisor Account Management'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingSupervisors.length === 0 ? (
            <div className="p-4 rounded-xl bg-sti-gray-light/50 dark:bg-slate-900/40 text-xs text-sti-gray text-center">
              No OJT Supervisor account requests are currently pending approval.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSupervisors.map((sup) => {
                const fullName = [sup.firstName, sup.lastName].filter(Boolean).join(' ') || sup.email;
                const companyName = sup.supervisorCompany?.name || sup.approvalMetadata?.companyName || 'Partner Company';
                return (
                  <div
                    key={sup.id}
                    className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-sti-gray-dark dark:text-white">{fullName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          Pending Approval
                        </span>
                      </div>
                      <p className="text-sti-gray">
                        <Building2 className="w-3.5 h-3.5 inline mr-1 text-sti-blue" />
                        <strong>Company:</strong> {companyName} · <strong>Email:</strong> {sup.email}
                        {sup.contactNumber ? ` · Contact: ${sup.contactNumber}` : ''}
                      </p>
                      {sup.approvalMetadata?.requestedByEmail && (
                        <p className="text-[11px] text-sti-gray">
                          Requested by OJT Coordinator: <strong>{sup.approvalMetadata.requestedByEmail}</strong>
                          {sup.approvalMetadata.requestedAt
                            ? ` on ${new Date(sup.approvalMetadata.requestedAt).toLocaleString()}`
                            : ''}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={reviewingId === sup.id}
                          onClick={() => handleApprove(sup)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={reviewingId === sup.id}
                          onClick={() => {
                            setRejectTarget(sup);
                            setRejectionReason('');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {recentReviewedSupervisors.length > 0 && (
            <div className="pt-2 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sti-gray">Recent Approval History</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recentReviewedSupervisors.map((sup) => {
                  const status = sup.approvalStatus || (sup.isActive ? 'APPROVED' : 'REJECTED');
                  const meta = sup.approvalMetadata || {};
                  return (
                    <div key={sup.id} className="p-3 rounded-xl border border-black/5 dark:border-white/10 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sti-gray-dark dark:text-white truncate">
                          {[sup.firstName, sup.lastName].filter(Boolean).join(' ') || sup.email}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'APPROVED'
                              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {status === 'APPROVED' ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                      <p className="text-sti-gray truncate">{sup.supervisorCompany?.name || meta.companyName || 'Partner Company'}</p>
                      <p className="text-[11px] text-sti-gray">
                        Reviewed by <strong>{meta.reviewedByEmail || 'Admin'}</strong>
                        {meta.reviewedAt ? ` • ${new Date(meta.reviewedAt).toLocaleDateString()}` : ''}
                      </p>
                      {status === 'REJECTED' && meta.rejectionReason && (
                        <p className="text-[11px] text-red-600 dark:text-red-400">Reason: {meta.rejectionReason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      <Modal
        isOpen={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectionReason(''); }}
        title="Reject OJT Supervisor Account Request"
        maxWidth="max-w-md"
      >
        {rejectTarget && (
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <p className="text-sm text-sti-gray-dark dark:text-slate-200">
              Provide a rejection reason for <strong>{[rejectTarget.firstName, rejectTarget.lastName].filter(Boolean).join(' ') || rejectTarget.email}</strong>. The OJT Coordinator will be notified.
            </p>
            <textarea
              rows={3}
              required
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="input-field text-sm"
            />
            <div className="flex justify-end gap-2">
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

      <Card className="flex items-center gap-2 text-sm text-sti-gray">
        <Clock3 className="w-4 h-4 text-sti-blue shrink-0" />
        <span>Manage interns, accounts, and requirements from their respective pages.</span>
      </Card>
    </div>
  );
};

export default AdminDashboard;
