import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  UserCircle,
  Users,
  Megaphone,
  X,
  FileCheck2,
  CalendarDays,
  Building2,
  Clock,
  MapPinned,
  MessageCircle,
  ScrollText,
  Archive,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const linksByRole = {
  SUPER_ADMIN: [
    {
      section: 'Main',
      links: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/accounts', label: 'Account Management', icon: Users },
        { to: '/admin/companies', label: 'Partner Companies', icon: Building2 },
        { to: '/admin/templates', label: 'Templates', icon: FileCheck2 },
        { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
        { to: '/admin/archive', label: 'Archive', icon: Archive },
        { to: '/admin/messages', label: 'Messages', icon: MessageCircle },
        { to: '/admin/profile', label: 'Profile', icon: UserCircle }
      ]
    }
  ],
  ADMIN: [
    {
      section: 'Main',
      links: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/accounts', label: 'Account Management', icon: Users },
        { to: '/admin/companies', label: 'Partner Companies Approval', icon: Building2 },
        { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/admin/templates', label: 'Templates', icon: FileCheck2 },
        { to: '/admin/submissions', label: 'Submissions', icon: ClipboardList },
        { to: '/admin/logs', label: 'Student Logs', icon: ClipboardList },
        { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
        { to: '/admin/archive', label: 'Archive', icon: Archive },
        { to: '/admin/ojt-hours', label: 'OJT Hours', icon: Clock },
        { to: '/admin/messages', label: 'Messages', icon: MessageCircle },
        { to: '/admin/profile', label: 'Profile', icon: UserCircle }
      ]
    }
  ],
  COORDINATOR: [
    {
      section: 'Main',
      links: [
        { to: '/coordinator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/coordinator/accounts', label: 'Account Management', icon: Users },
        { to: '/coordinator/attendance', label: 'Attendance (Monitoring)', icon: Clock },
        { to: '/coordinator/companies', label: 'Add Partner Companies', icon: Building2 },
        { to: '/coordinator/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/coordinator/templates', label: 'Templates', icon: FileCheck2 },
        { to: '/coordinator/submissions', label: 'Submissions', icon: ClipboardList },
        { to: '/coordinator/logs', label: 'Student Logs', icon: ClipboardList },
        { to: '/coordinator/archive', label: 'Archive', icon: Archive },
        { to: '/coordinator/messages', label: 'Messages', icon: MessageCircle },
        { to: '/coordinator/profile', label: 'Profile', icon: UserCircle }
      ]
    }
  ],
  SUPERVISOR: [
    {
      section: 'Main',
      links: [
        { to: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/supervisor/students', label: 'View Students', icon: Users },
        { to: '/supervisor/attendance', label: 'Record Attendance', icon: Clock },
        { to: '/supervisor/submissions', label: 'Submissions', icon: ClipboardList },
        { to: '/supervisor/logs', label: 'Student Logs', icon: ClipboardList },
        { to: '/supervisor/messages', label: 'Messages', icon: MessageCircle },
        { to: '/supervisor/profile', label: 'Profile', icon: UserCircle }
      ]
    }
  ],
  STUDENT: [
    {
      section: 'Main',
      links: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/my-dtr', label: 'My Attendance (DTR)', icon: Clock },
        { to: '/my-logs', label: 'My Logs', icon: ClipboardList },
        { to: '/schedule', label: 'Schedule', icon: CalendarDays },
        { to: '/find-company', label: 'Find Company', icon: MapPinned },
        { to: '/templates', label: 'Templates', icon: FileCheck2 },
        { to: '/submissions', label: 'My Submissions', icon: ClipboardList },
        { to: '/messages', label: 'Messages', icon: MessageCircle },
        { to: '/profile', label: 'Profile', icon: UserCircle }
      ]
    }
  ]
};

const Sidebar = ({ role, isOpen, onClose }) => {
  const { user } = useAuth();
  const effectiveKey = user?.isSuperAdmin ? 'SUPER_ADMIN' : role;
  const sections = linksByRole[effectiveKey] || linksByRole.STUDENT;
  const roleLabel = user?.isSuperAdmin
    ? 'Super Admin'
    : (role ? role.charAt(0) + role.slice(1).toLowerCase() : '');

  const staffFullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const displayName = user?.isSuperAdmin
    ? (staffFullName || 'Super Admin')
    : user?.student
    ? `${user.student.firstName} ${user.student.lastName}`
    : staffFullName || user?.email?.split('@')[0] || 'User';

  const initials = user?.isSuperAdmin
    ? (staffFullName ? `${(user?.firstName || '')[0] || ''}${(user?.lastName || '')[0] || ''}`.toUpperCase() || 'SA' : 'SA')
    : user?.student
    ? `${(user.student.firstName || '?')[0]}${(user.student.lastName || '?')[0]}`.toUpperCase()
    : staffFullName
    ? `${(user?.firstName || '')[0] || ''}${(user?.lastName || '')[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
    : user?.email?.[0]?.toUpperCase() || 'U';

  const rawPic = user?.profilePicture || user?.student?.profilePicture || null;
  const isImg = typeof rawPic === 'string' && rawPic.startsWith('data:image');
  const avatarBg = typeof rawPic === 'string' && rawPic.startsWith('DEFAULT:')
    ? rawPic.split(':')[1]
    : 'bg-sti-yellow';
  const avatarTextClass = typeof rawPic === 'string' && rawPic.startsWith('DEFAULT:')
    ? 'text-white'
    : 'text-sti-blue-dark';

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
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-white ring-1 ring-white/20 shadow-sm flex items-center justify-center p-0.5">
              <img src="/simes-logo.png" alt="SIMES" className="block w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">SIMES</p>
              <p className="text-white/60 text-[11px] leading-tight">STI Sta. Maria</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map(({ section, links }) => (
            <div key={section}>
              <div className="space-y-1">
                {links.map((link) => {
                  const { to, label, icon: Icon, children } = link;
                  return (
                    <div key={to}>
                      <NavLink
                        to={to}
                        onClick={onClose}
                        end={Boolean(children)}
                        className={({ isActive }) =>
                          `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                            isActive
                              ? 'bg-sti-yellow text-sti-blue-dark shadow-sm'
                              : 'text-white/80 hover:text-white hover:bg-white/10'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sti-blue-dark' : 'text-white/65 group-hover:text-white'}`} />
                            <span className="flex-1 truncate">{label}</span>
                            {isActive && <ChevronRight className="w-3.5 h-3.5 text-sti-blue-dark/70 shrink-0" />}
                          </>
                        )}
                      </NavLink>
                      {Array.isArray(children) && children.length > 0 && (
                        <div className="mt-1 ml-7 pl-2.5 border-l border-white/15 space-y-1">
                          {children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={onClose}
                              className="block px-2.5 py-1.5 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom User Profile Pill */}
        <div className="px-3 py-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/5">
            {isImg ? (
              <img src={rawPic} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-sti-yellow/50" />
            ) : (
              <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center ${avatarTextClass} font-bold text-xs shrink-0`}>
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate">{displayName}</p>
              <p className="text-sti-yellow text-[10px] font-medium truncate">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
