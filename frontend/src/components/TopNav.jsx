import { useState, useEffect, useRef } from 'react';
import { Menu, LogOut, ChevronDown, Bell, Sun, Moon, X, CheckCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TopNav = ({ onMenuClick, title = 'Dashboard' }) => {
  const { user, logout, updateUser, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [messageToast, setMessageToast] = useState(null);
  const knownNotificationIds = useRef(new Set());
  const hasLoadedNotifications = useRef(false);
  const unread = notifications.filter(n=>!n.isRead).length;

  // Keep user profile picture and details in sync across the header, sidebar, and refreshes
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    api.get('/profile')
      .then((res) => {
        if (!active) return;
        const p = res.data?.data;
        if (!p) return;
        const syncedPic = p.profilePicture || p.student?.profilePicture || null;
        const currentPic = user?.profilePicture || user?.student?.profilePicture || null;
        const nextUpdates = {};
        if (syncedPic && syncedPic !== currentPic) {
          nextUpdates.profilePicture = syncedPic;
        }
        if (p.firstName !== undefined && p.firstName !== user?.firstName) nextUpdates.firstName = p.firstName;
        if (p.lastName !== undefined && p.lastName !== user?.lastName) nextUpdates.lastName = p.lastName;
        if (p.student && (!user?.student || syncedPic !== user?.student?.profilePicture)) {
          nextUpdates.student = { ...(user?.student || {}), ...p.student };
        }
        if (Object.keys(nextUpdates).length > 0) {
          updateUser(nextUpdates);
        }
      })
      .catch(() => {});
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  const displayName = user?.isSuperAdmin
    ? 'Super Admin'
    : user?.student
    ? `${user.student.firstName} ${user.student.lastName}`
    : (user?.firstName || user?.lastName)
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : user?.email?.split('@')[0] || 'User';

  const initials = user?.isSuperAdmin
    ? 'SA'
    : user?.student
    ? `${user.student.firstName?.[0] || ''}${user.student.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : (user?.firstName || user?.lastName)
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : user?.email?.[0]?.toUpperCase() || 'U';

  const rawPic = user?.profilePicture || user?.student?.profilePicture || null;
  const isPhoto = typeof rawPic === 'string' && rawPic.startsWith('data:image');
  const defaultBg = typeof rawPic === 'string' && rawPic.startsWith('DEFAULT:')
    ? rawPic.replace('DEFAULT:', '')
    : 'bg-sti-blue';

  return (
    <header className="sticky top-0 z-20 h-20 bg-white dark:bg-slate-800 border-b border-black/5 dark:border-white/10 flex items-center justify-between px-4 sm:px-8 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray-dark dark:text-white shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-sti-gray-dark dark:text-white truncate">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
              <div className="fixed left-3 right-3 top-[4.5rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] bg-[#1e1e1e] dark:bg-slate-800 rounded-xl shadow-cardHover border border-black/10 dark:border-white/10 z-20 overflow-hidden max-h-[calc(100vh-5.5rem)] sm:max-h-[70vh] flex flex-col">
                <div className="px-3.5 py-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
                  <h3 className="font-bold text-white text-sm truncate">Notifications</h3>
                  <span className="text-xs text-gray-400 shrink-0">{unread} unread</span>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  {notifications.length===0 ? (
                    <p className="text-sm text-gray-400 p-8 text-center">No notifications yet</p>
                  ) : notifications.map(n=>(
                    <div key={n.id} onClick={()=>openNotif(n)} className={`p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer flex items-start gap-2.5 sm:gap-3 ${!n.isRead ? 'bg-white/5' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-sti-blue flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">{n.title?.[0] || 'N'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-white break-words leading-snug">{n.title}</p>
                        <p className="text-xs text-gray-300 mt-0.5 break-words line-clamp-2 leading-relaxed">{n.content}</p>
                        <p className="text-[11px] text-gray-400 mt-1 break-words">{new Date(n.createdAt).toLocaleString()} • {n.isRead ? 'Seen' : 'New'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e)=>{e.stopPropagation(); api.delete(`/notifications/${n.id}`).catch(()=>{}).then(fetchNotifs);}}
                        className="text-gray-400 hover:text-white p-1 -mr-1 shrink-0 rounded-lg"
                        aria-label="Delete notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-3.5 py-2.5 border-t border-white/10 flex items-center justify-between gap-2 text-xs shrink-0">
                  <button onClick={markAllRead} className="text-gray-300 hover:text-white flex items-center gap-1.5 shrink-0"><CheckCheck className="w-3.5 h-3.5 shrink-0" /> Mark all read</button>
                  <button onClick={()=>setNotifOpen(false)} className="text-gray-400 hover:text-white shrink-0">Configure</button>
                </div>
              </div>
            </>
          )}
          {messageToast && (
        <div className="fixed top-20 left-3 right-3 sm:top-24 sm:left-auto sm:right-4 z-40 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-xl bg-[#1e1e1e] text-white shadow-cardHover border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-sti-blue flex items-center justify-center text-white text-xs font-bold shrink-0">{messageToast.title?.[0] || 'M'}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white break-words">{messageToast.title}</p>
              <p className="text-xs text-gray-300 mt-1 break-words line-clamp-3">{messageToast.content}</p>
              <button onClick={() => { setMessageToast(null); setNotifOpen(true); openNotif(messageToast); }} className="text-xs text-sti-yellow hover:text-white mt-2">View notification</button>
            </div>
            <button onClick={() => setMessageToast(null)} className="text-gray-400 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      {selectedNotif && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4" onClick={()=>setSelectedNotif(null)}>
              <div className="bg-[#232323] rounded-xl max-w-md w-full p-4 sm:p-5 max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-start gap-3 mb-3">
                  <h3 className="font-bold text-white text-sm break-words min-w-0 flex-1">Notification from {selectedNotif.title.replace('New Announcement: ','')}</h3>
                  <button onClick={()=>setSelectedNotif(null)} className="text-gray-400 hover:text-white shrink-0 p-1"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-gray-400 break-words">From: {selectedNotif.title} @ {new Date(selectedNotif.createdAt).toLocaleString()}</p>
                {selectedNotif.image && <img src={selectedNotif.image} alt="" className="w-full h-40 object-cover rounded-lg mt-3" />}
                <p className="text-sm text-gray-200 mt-3 whitespace-pre-wrap break-words">{selectedNotif.content}</p>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={async()=>{ await api.delete(`/notifications/${selectedNotif.id}`).catch(()=>{}); setSelectedNotif(null); fetchNotifs(); }} className="bg-[#0a4a8a] text-white px-4 py-1.5 rounded-full text-xs">Delete</button>
                  <button onClick={()=>setSelectedNotif(null)} className="text-gray-400 hover:text-white text-xs px-2 py-1.5">Close</button>
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
            {isPhoto ? (
              <img
                src={rawPic}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-sti-blue/20"
              />
            ) : (
              <div className={`w-9 h-9 rounded-full ${defaultBg} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                {initials}
              </div>
            )}
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
