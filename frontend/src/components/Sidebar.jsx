import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, UserCircle, Users, Megaphone, X, FileCheck2, CalendarDays, Building2, Clock, MapPinned, MessageCircle, ScrollText, Archive, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Single UI for all 4 roles — each role sees a limited subset (same components, filtered links)
const linksByRole = {
  ADMIN: [
    { section: 'Main', links: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]},
    { section: 'Management', links: [
      { to: '/admin/accounts', label: 'Account Management', icon: Users },
      { to: '/admin/companies', label: 'Partner Companies', icon: Building2 },
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    ]},
    { section: 'Academic', links: [
      { to: '/admin/templates', label: 'Templates', icon: FileCheck2 },
      { to: '/admin/submissions', label: 'Submissions', icon: ClipboardList },
      { to: '/admin/logs', label: 'Student Logs', icon: ClipboardList },
    ]},
    { section: 'System', links: [
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
      { to: '/admin/archive', label: 'Archive', icon: Archive },
      { to: '/admin/ojt-hours', label: 'OJT Hours', icon: Clock },
      { to: '/admin/messages', label: 'Messages', icon: MessageCircle },
      { to: '/admin/profile', label: 'Profile', icon: UserCircle },
    ]},
  ],
  COORDINATOR: [
    { section: 'Main', links: [
      { to: '/coordinator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]},
    { section: 'Management', links: [
      { to: '/coordinator/accounts', label: 'Account Management', icon: Users },
      { to: '/coordinator/attendance', label: 'Attendance', icon: Clock },
      { to: '/coordinator/companies', label: 'Partner Companies', icon: Building2 },
      { to: '/coordinator/announcements', label: 'Announcements', icon: Megaphone },
    ]},
    { section: 'Academic', links: [
      { to: '/coordinator/templates', label: 'Templates', icon: FileCheck2 },
      { to: '/coordinator/submissions', label: 'Submissions', icon: ClipboardList },
      { to: '/coordinator/logs', label: 'Student Logs', icon: ClipboardList },
    ]},
    { section: 'System', links: [
      { to: '/coordinator/archive', label: 'Archive', icon: Archive },
      { to: '/coordinator/messages', label: 'Messages', icon: MessageCircle },
      { to: '/coordinator/profile', label: 'Profile', icon: UserCircle },
    ]},
  ],
  SUPERVISOR: [
    { section: 'Main', links: [
      { to: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]},
    { section: 'Management', links: [
      { to: '/supervisor/students', label: 'Students', icon: Users },
      { to: '/supervisor/attendance', label: 'Attendance', icon: Clock },
    ]},
    { section: 'Academic', links: [
      { to: '/supervisor/submissions', label: 'Submissions', icon: ClipboardList },
      { to: '/supervisor/logs', label: 'Student Logs', icon: ClipboardList },
    ]},
    { section: 'System', links: [
      { to: '/supervisor/messages', label: 'Messages', icon: MessageCircle },
      { to: '/supervisor/profile', label: 'Profile', icon: UserCircle },
    ]},
  ],
  STUDENT: [
    { section: 'Main', links: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]},
    { section: 'My OJT', links: [
      { to: '/my-dtr', label: 'My DTR', icon: Clock },
      { to: '/my-logs', label: 'My Logs', icon: ClipboardList },
      { to: '/schedule', label: 'Schedule', icon: CalendarDays },
      { to: '/find-company', label: 'Find Company', icon: MapPinned },
    ]},
    { section: 'Requirements', links: [
      { to: '/templates', label: 'Templates', icon: FileCheck2 },
      { to: '/submissions', label: 'My Submissions', icon: ClipboardList },
    ]},
    { section: 'System', links: [
      { to: '/messages', label: 'Messages', icon: MessageCircle },
      { to: '/profile', label: 'Profile', icon: UserCircle },
    ]},
  ],
};

const Sidebar = ({ role, isOpen, onClose }) => {
  const { user } = useAuth();
  const sections = linksByRole[role] || linksByRole.STUDENT;
  const roleLabel = user?.isSuperAdmin ? 'Super Admin' : (role ? role.charAt(0) + role.slice(1).toLowerCase() : '');

  const displayName = user?.isSuperAdmin
    ? 'Super Admin'
    : user?.student
    ? `${user.student.firstName} ${user.student.lastName}`
    : user?.email?.split('@')[0] || 'User';

  const initials = user?.isSuperAdmin
    ? 'SA'
    : user?.student
    ? `${user.student.firstName[0]}${user.student.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-sti-blue-dark z-40
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between px-5 h-20 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-white/10 flex items-center justify-center">
              <img src="/simes-logo.png" alt="SIMES" className="w-full h-full object-contain p-0.5" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">SIMES</p>
              <p className="text-white/40 text-[11px] leading-tight">STI Sta. Maria</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-0.5">
            {sections.flatMap(({ links }) => links).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                  ${isActive
                    ? 'bg-sti-yellow text-sti-blue-dark font-semibold shadow-sm'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sti-blue-dark' : 'text-white/50 group-hover:text-white'}`} strokeWidth={2} />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Profile Card at bottom */}
        <div className="shrink-0 p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-default">
            <div className="w-8 h-8 rounded-full bg-sti-yellow flex items-center justify-center text-sti-blue-dark text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate">{displayName}</p>
              <p className="text-white/40 text-[11px] truncate capitalize">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
