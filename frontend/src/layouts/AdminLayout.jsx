import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';

const titles = {
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/students': 'Student Management',
  '/admin/requirements': 'Requirements',
  '/admin/companies': 'Partner Companies',
  '/admin/logs': 'Student Logs',
  '/admin/announcements': 'Announcements',
  '/admin/messages': 'Messages',
  '/admin/profile': 'My Profile',
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = titles[location.pathname] || 'Admin Dashboard';

  return (
    <div className="flex min-h-screen bg-sti-gray-light dark:bg-slate-900 transition-colors">
      <Sidebar role="ADMIN" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
