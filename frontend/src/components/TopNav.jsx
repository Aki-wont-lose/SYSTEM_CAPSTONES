import { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, ChevronDown, Bell, Sun, Moon, X, CheckCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TopNav = ({ onMenuClick, title = 'Dashboard' }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [messageToast, setMessageToast] = useState(null);
  const knownNotificationIds = useRef(new Set());
  const hasLoadedNotifications = useRef(false);
  const unread = notifications.filter(n=>!n.isRead).length;

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications');
      const next = res.data.data || [];
      if (hasLoadedNotifications.current) {
        const newMessage = next.find(n => !n.isRead && !knownNotificationIds.current.has(n.id) && n.title.startsWith('New message from '));
        if (newMessage) {
          setMessageToast(newMessage);
          window.setTimeout(() => setMessageToast(null), 8000);
        }
      }
      knownNotificationIds.current = new Set(next.map(n => n.id));
      hasLoadedNotifications.current = true;
      setNotifications(next);
    } catch {}
  };
  useEffect(()=>{ fetchNotifs(); const id=setInterval(fetchNotifs, 5000); return ()=>clearInterval(id); }, []);
  const markAllRead = async () => { await api.put('/notifications/read-all'); fetchNotifs(); };
  const openNotif = async (n) => {
    setSelectedNotif(n);
    if (!n.isRead) { await api.put(`/notifications/${n.id}/read`); fetchNotifs(); }
  };

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

        <div className="relative">
          <button onClick={()=>setNotifOpen(!notifOpen)} className="relative p-2.5 rounded-full hover:bg-sti-gray-light dark:hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 text-sti-gray-dark dark:text-white" />
            {unread>0 && <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-800">{unread}</span>}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={()=>setNotifOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#1e1e1e] dark:bg-slate-800 rounded-xl shadow-cardHover border border-black/10 z-20 overflow-hidden max-h-[70vh] flex flex-col">
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">Notifications</h3>
                  <span className="text-xs text-gray-400">{unread} unread</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {notifications.length===0 ? (
                    <p className="text-sm text-gray-400 p-8 text-center">No notifications yet</p>
                  ) : notifications.map(n=>(
                    <div key={n.id} onClick={()=>openNotif(n)} className={`p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer flex gap-3 ${!n.isRead ? 'bg-white/5' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-sti-blue flex items-center justify-center text-white text-xs font-bold shrink-0">{n.title[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{n.title}</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{n.content}</p>
                        <p className="text-[11px] text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()} • {n.isRead ? 'Seen' : 'New'}</p>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation(); api.delete(`/notifications/${n.id}`).then(fetchNotifs);}} className="text-gray-500 hover:text-white p-1"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <button onClick={markAllRead} className="text-gray-300 hover:text-white flex items-center gap-1"><CheckCheck className="w-3 h-3" /> Mark all read</button>
                  <button onClick={()=>setNotifOpen(false)} className="text-gray-400 hover:text-white">Configure</button>
                </div>
              </div>
            </>
          )}
          {messageToast && (
        <div className="fixed top-24 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-xl bg-[#1e1e1e] text-white shadow-cardHover border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-sti-blue flex items-center justify-center text-white text-xs font-bold shrink-0">{messageToast.title[0]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{messageToast.title}</p>
              <p className="text-xs text-gray-300 mt-1 line-clamp-3">{messageToast.content}</p>
              <button onClick={() => { setMessageToast(null); setNotifOpen(true); openNotif(messageToast); }} className="text-xs text-sti-yellow hover:text-white mt-2">View notification</button>
            </div>
            <button onClick={() => setMessageToast(null)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      {selectedNotif && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setSelectedNotif(null)}>
              <div className="bg-[#232323] rounded-xl max-w-md w-full p-5" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-white text-sm">Notification from {selectedNotif.title.replace('New Announcement: ','')}</h3>
                  <button onClick={()=>setSelectedNotif(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-gray-400">From: {selectedNotif.title} @ {new Date(selectedNotif.createdAt).toLocaleString()}</p>
                {selectedNotif.image && <img src={selectedNotif.image} alt="" className="w-full h-40 object-cover rounded-lg mt-3" />}
                <p className="text-sm text-gray-200 mt-3 whitespace-pre-wrap">{selectedNotif.content}</p>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={async()=>{ await api.delete(`/notifications/${selectedNotif.id}`); setSelectedNotif(null); fetchNotifs(); }} className="bg-[#0a4a8a] text-white px-4 py-1.5 rounded-full text-xs">Delete</button>
                  <button onClick={()=>setSelectedNotif(null)} className="text-gray-400 text-xs">Close</button>
                </div>
              </div>
            </div>
          )}
        </div>

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
