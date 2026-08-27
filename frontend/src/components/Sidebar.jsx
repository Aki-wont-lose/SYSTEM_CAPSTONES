import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, UserCircle, Users, Megaphone, X, FileCheck2, CalendarDays, Building2, Clock, MapPinned, MessageCircle } from 'lucide-react';

// Single UI for all 4 roles — each role sees a limited subset (same components, filtered links)
const linksByRole = {
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/requirements', label: 'Requirements', icon: FileCheck2 },
    { to: '/admin/companies', label: 'Partner Companies', icon: Building2 },
    { to: '/admin/logs', label: 'Student Logs', icon: ClipboardList },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/admin/messages', label: 'Messages', icon: MessageCircle },
    { to: '/admin/profile', label: 'Profile', icon: UserCircle },
  ],
  COORDINATOR: [
    { to: '/coordinator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/coordinator/students', label: 'Students', icon: Users },
    { to: '/coordinator/requirements', label: 'Requirements', icon: FileCheck2 },
    { to: '/coordinator/companies', label: 'Partner Companies', icon: Building2 },
    { to: '/coordinator/logs', label: 'Student Logs', icon: ClipboardList },
    { to: '/coordinator/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/coordinator/messages', label: 'Messages', icon: MessageCircle },
    { to: '/coordinator/profile', label: 'Profile', icon: UserCircle },
  ],
  SUPERVISOR: [
    { to: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/supervisor/students', label: 'Students', icon: Users },
    { to: '/supervisor/logs', label: 'Student Logs', icon: ClipboardList },
    { to: '/supervisor/messages', label: 'Messages', icon: MessageCircle },
    { to: '/supervisor/profile', label: 'Profile', icon: UserCircle },
  ],
  STUDENT: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/my-dtr', label: 'My DTR', icon: Clock },
    { to: '/my-logs', label: 'My Logs', icon: ClipboardList },
    { to: '/requirements', label: 'Requirements', icon: FileCheck2 },
    { to: '/find-company', label: 'Find Company', icon: MapPinned },
    { to: '/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/messages', label: 'Messages', icon: MessageCircle },
    { to: '/profile', label: 'Profile', icon: UserCircle },
  ],
};

const Sidebar = ({ role, isOpen, onClose }) => {
  const links = linksByRole[role] || linksByRole.STUDENT;
  const roleLabel = role ? role.charAt(0) + role.slice(1).toLowerCase() : '';

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
        <div className="flex items-center justify-between px-6 h-20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/sti-logo.png" alt="STI College Sta. Maria" className="w-10 h-10 rounded-xl object-cover shrink-0" />
            <div>
              <p className="text-white font-bold text-base leading-tight">SIMES</p>
              <p className="text-white/50 text-[11px] leading-tight">STI Sta. Maria • {roleLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-sti-yellow text-sti-blue-dark font-semibold shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mx-4 mb-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white/40 text-[11px] leading-relaxed">
            Student Internship Monitoring &amp; Evaluation System
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
