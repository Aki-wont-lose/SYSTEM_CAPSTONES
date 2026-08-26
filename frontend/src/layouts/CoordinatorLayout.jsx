import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';

const titles = {
  '/coordinator/dashboard': 'Coordinator Dashboard',
  '/coordinator/students': 'Students',
  '/coordinator/requirements': 'Requirements',
  '/coordinator/companies': 'Partner Companies',
  '/coordinator/logs': 'Student Logs',
  '/coordinator/announcements': 'Announcements',
  '/coordinator/messages': 'Messages',
  '/coordinator/profile': 'My Profile',
};

const CoordinatorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = titles[location.pathname] || 'Coordinator Dashboard';

  return (
    <div className="flex min-h-screen bg-sti-gray-light dark:bg-slate-900 transition-colors">
      <Sidebar role="COORDINATOR" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CoordinatorLayout;
