import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';

const titles = {
  '/dashboard': 'Dashboard',
  '/my-dtr': 'My DTR',
  '/my-logs': 'My Logs',
  '/requirements': 'Requirements',
  '/find-company': 'Find Company',
  '/schedule': 'Schedule',
  '/messages': 'Messages',
  '/profile': 'My Profile',
};

const StudentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = titles[location.pathname] || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-sti-gray-light dark:bg-slate-900 transition-colors">
      <Sidebar role="STUDENT" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 p-3 sm:p-8 pb-8 sm:pb-8 safe-area-pb">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
