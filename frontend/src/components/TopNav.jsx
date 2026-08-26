import { useState } from 'react';
import { Menu, LogOut, ChevronDown, Bell, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const TopNav = ({ onMenuClick, title = 'Dashboard' }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.student
    ? `${user.student.firstName} ${user.student.lastName}`
    : user?.email;

  const initials = user?.student
    ? `${user.student.firstName[0]}${user.student.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-20 h-20 bg-white dark:bg-slate-800 border-b border-black/5 dark:border-white/10 flex items-center justify-between px-4 sm:px-8 transition-colors">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray-dark dark:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-sti-gray-dark dark:text-white">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full hover:bg-sti-gray-light dark:hover:bg-white/10 transition-colors"
          title={theme === 'DARK' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'DARK'
            ? <Sun className="w-5 h-5 text-sti-yellow" />
            : <Moon className="w-5 h-5 text-sti-gray-dark" />}
        </button>

        <button className="relative p-2.5 rounded-full hover:bg-sti-gray-light dark:hover:bg-white/10 transition-colors">
          <Bell className="w-5 h-5 text-sti-gray-dark dark:text-white" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-sti-yellow rounded-full ring-2 ring-white dark:ring-slate-800" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-sti-gray-light dark:hover:bg-white/10 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-sti-blue flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-medium text-sti-gray-dark dark:text-white max-w-[140px] truncate">
              {displayName}
            </span>
            <ChevronDown className="hidden sm:block w-4 h-4 text-sti-gray" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-cardHover border border-black/5 dark:border-white/10 z-20 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
                  <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{displayName}</p>
                  <p className="text-xs text-sti-gray truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;
