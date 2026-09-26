import { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, Users, Search, Trash2, Image as ImageIcon, X, CheckCheck, ArrowLeft, UserPlus, UserCheck, Clock3, UserX, Inbox } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getContacts, getConversation, sendMessage, deleteMessage } from '../services/messageService';
import { getConnections, sendConnectionRequest, respondToConnection, removeConnection } from '../services/connectionService';
import { useAuth } from '../hooks/useAuth';

const readList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const Messages = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.userId;
  const isStudent = user?.role === 'STUDENT';
  const [contacts, setContacts] = useState([]);
  const [connections, setConnections] = useState({ accepted: [], incoming: [], outgoing: [] });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('chats');
  const [recentIds, setRecentIds] = useState(() => readList('recentChats'));
  const [hiddenIds, setHiddenIds] = useState(() => readList('hiddenChats'));
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000); };

  const loadConnections = async () => {
    try {
      const res = await getConnections();
      setConnections({ accepted: res.data?.accepted || [], incoming: res.data?.incoming || [], outgoing: res.data?.outgoing || [] });
    } catch (e) { console.error(e); }
  };

  const loadContacts = async () => {
    try {
      const res = await getContacts();
      setContacts(res.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadConversation = async (contactId) => {
    const id = contactId || selected?.id;
    if (!id) return;
    try {
      const res = await getConversation(id);
      setMessages(res.data || []);
      setContacts(current => current.map(contact => contact.id === id ? { ...contact, unreadCount: 0 } : contact));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadContacts();
    loadConnections();
    const interval = setInterval(() => { loadContacts(); loadConnections(); }, 5000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    setMessages([]);
    if (selected) loadConversation(selected.id);
    const interval = setInterval(() => { if (selected) loadConversation(selected.id); }, 3000);
    return () => clearInterval(interval);
  }, [selected]);

  const formatRole = (r) => r ? r.charAt(0) + r.slice(1).toLowerCase() : '';
  const filteredContacts = contacts.filter(c => {
    const q = search.toLowerCase();
    if (!q) return false;
    return c.email.toLowerCase().includes(q) || (c.displayName || '').toLowerCase().includes(q) || (c.studentId || '').toLowerCase().includes(q) || c.role.toLowerCase().includes(q);
  });
  const visibleContacts = contacts
    .filter(c => c.hasConversation || recentIds.includes(c.id))
    .filter(c => !hiddenIds.includes(c.id))
    .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  const displayContacts = search ? filteredContacts.filter(c => !hiddenIds.includes(c.id)) : visibleContacts;

  const isImage = (content) => content && content.startsWith('data:image');

  const updateStoredList = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const openContact = (contact) => {
    setSelected(contact);
    setSearch('');
    setHiddenIds(current => {
      const next = current.filter(id => id !== contact.id);
      updateStoredList('hiddenChats', next);
      return next;
    });
    setRecentIds(current => {
      const next = [contact.id, ...current.filter(id => id !== contact.id)].slice(0, 20);
      updateStoredList('recentChats', next);
      return next;
    });
  };

  const removeContact = (contact) => {
    const name = contact.displayName || contact.email;
    if (!confirm(`Remove ${name} from your chat list?`)) return;
    setHiddenIds(current => {
      const next = current.includes(contact.id) ? current : [...current, contact.id];
      updateStoredList('hiddenChats', next);
      return next;
    });
    setRecentIds(current => {
      const next = current.filter(id => id !== contact.id);
      updateStoredList('recentChats', next);
      return next;
    });
    if (selected?.id === contact.id) setSelected(null);
    showToast('Contact removed from your chat list');
  };

  const handleRequest = async (contact) => {
    setBusyId(contact.id);
    try {
      const res = await sendConnectionRequest(contact.id);
      showToast(res.message || 'Connection request sent');
      await Promise.all([loadConnections(), loadContacts()]);
      setSelected(current => (current?.id === contact.id ? { ...current, connectionStatus: 'PENDING_OUT', connectionId: res.data?.id } : current));
    } catch (err) { showToast(err.response?.data?.message || 'Could not send the request'); } finally { setBusyId(null); }
  };

  const handleRespond = async (connectionId, action) => {
    setBusyId(connectionId);
    try {
      const res = await respondToConnection(connectionId, action);
      showToast(res.message || 'Done');
      await Promise.all([loadConnections(), loadContacts()]);
    } catch (err) { showToast(err.response?.data?.message || 'Could not update the request'); } finally { setBusyId(null); }
  };

  const handleDisconnect = async (connectionId) => {
    if (!confirm('Remove this connection?')) return;
    setBusyId(connectionId);
    try {
      await removeConnection(connectionId);
      showToast('Connection removed');
      if (selected?.connectionId === connectionId) setSelected(null);
      await Promise.all([loadConnections(), loadContacts()]);
    } catch (err) { showToast(err.response?.data?.message || 'Could not remove the connection'); } finally { setBusyId(null); }
  };

  const connectionBadge = (contact) => {
    if (!isStudent) return null;
    if (contact.hasConversation || contact.connectionStatus === 'ACCEPTED') return null;
    if (contact.connectionStatus === 'PENDING_OUT') {
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-50 text-sti-yellow-dark"><Clock3 className="w-3 h-3" /> Pending</span>;
    }
    if (contact.connectionStatus === 'PENDING_IN') {
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sti-blue-50 text-sti-blue"><Inbox className="w-3 h-3" /> Wants to connect</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sti-gray-light text-sti-gray">Not connected</span>;
  };

  const renderContact = (contact) => {
    const isSelected = selected?.id === contact.id;
    return (
      <div key={contact.id} className={`flex items-center border-b border-black/5 dark:border-white/10 ${isSelected ? 'bg-sti-blue-50 dark:bg-white/10' : ''}`}>
        <button onClick={() => openContact(contact)} className="flex-1 min-w-0 text-left px-4 py-3 hover:bg-sti-gray-light dark:hover:bg-white/5">
          <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{contact.displayName || contact.email.split('@')[0]} <span className="text-xs font-normal text-sti-gray">• {contact.roleLabel || formatRole(contact.role)}</span></p>
          {contact.hasConversation && <p className="text-xs text-sti-gray truncate mt-1">{contact.lastMessagePreview || 'No messages yet'}</p>}
          <div className="mt-1">{connectionBadge(contact)}</div>
        </button>
        {isStudent && !contact.hasConversation && contact.connectionStatus === 'NONE' && (
          <button
            onClick={() => handleRequest(contact)}
            disabled={busyId === contact.id}
            className="p-2 mr-1 rounded-lg text-sti-blue hover:bg-sti-blue-50 disabled:opacity-50 shrink-0"
            title="Send connection request"
            aria-label={`Send connection request to ${contact.displayName || contact.email}`}
          >
            <UserPlus className="w-4 h-4" />
          </button>
        )}
        {contact.unreadCount > 0 && <span className="mr-2 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{contact.unreadCount > 99 ? '99+' : contact.unreadCount}</span>}
        <button onClick={() => removeContact(contact)} className="p-2 mr-1 rounded-lg text-sti-gray hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0" title="Remove from chat list" aria-label={`Remove ${contact.displayName || contact.email} from chat list`}><Trash2 className="w-4 h-4" /></button>
      </div>
    );
  };

  const renderConnectionRow = (entry, kind) => {
    const person = entry.user;
    return (
      <div key={entry.id} className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{person.displayName}</p>
          <p className="text-xs text-sti-gray truncate">{person.studentId || person.email} • {person.role.charAt(0) + person.role.slice(1).toLowerCase()}</p>
        </div>
        {kind === 'incoming' && (
          <div className="flex gap-1 shrink-0">
            <Button variant="primary" icon={UserCheck} loading={busyId === entry.id} onClick={() => handleRespond(entry.id, 'ACCEPT')} className="text-xs px-2.5 py-1.5">Accept</Button>
            <button onClick={() => handleRespond(entry.id, 'DECLINE')} disabled={busyId === entry.id} className="p-2 rounded-lg text-sti-gray hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50" title="Decline" aria-label="Decline request"><UserX className="w-4 h-4" /></button>
          </div>
        )}
        {kind === 'outgoing' && (
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-yellow-50 text-sti-yellow-dark shrink-0">Awaiting reply</span>
        )}
        {kind === 'accepted' && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => openContact(contacts.find(c => c.id === person.id) || { ...person, displayName: person.displayName, roleLabel: formatRole(person.role), hasConversation: false, connectionStatus: 'ACCEPTED', connectionId: entry.id })}
              className="p-2 rounded-lg text-sti-blue hover:bg-sti-blue-50" title="Open chat" aria-label={`Open chat with ${person.displayName}`}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button onClick={() => handleDisconnect(entry.id)} disabled={busyId === entry.id} className="p-2 rounded-lg text-sti-gray hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50" title="Remove connection" aria-label={`Remove connection with ${person.displayName}`}><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    );
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !previewImg) || !selected) return;
    setSending(true);
    try {
      const payload = previewImg ? previewImg : text.trim();
      await sendMessage(selected.id, payload);
      setText('');
      setPreviewImg(null);
      loadConversation();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to send'); } finally { setSending(false); }
  };

  const handleDelete = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    try { await deleteMessage(msgId); loadConversation(); } catch (e) { showToast('Failed to delete'); }
  };

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { showToast('Image too large (max 8MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setPreviewImg(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" /></div>;

  const connectionCount = connections.incoming.length + connections.outgoing.length + connections.accepted.length;
  const chatBlocked = isStudent && selected && !selected.hasConversation && selected.connectionStatus !== 'ACCEPTED';

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white flex items-center gap-2"><MessageCircle className="w-5 h-5 text-sti-blue" /> Messages</h1>
        <p className="text-sm text-sti-gray">Chat with your coordinator, supervisor, and fellow interns.</p>
      </div>
      {/* Mobile: toggle between contacts and chat; Desktop: side-by-side */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:h-[65vh] h-[calc(100dvh-160px)] min-h-[480px]">
        <Card className={`p-0 overflow-hidden flex flex-col ${selected ? 'hidden lg:flex' : 'flex'} lg:h-auto h-full`}>
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 shrink-0">
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setTab('chats')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${tab === 'chats' ? 'bg-sti-blue text-white' : 'text-sti-gray hover:bg-sti-gray-light dark:hover:bg-white/10'}`}
              >
                <Users className="w-3.5 h-3.5 inline mr-1" /> Chats
              </button>
              <button
                onClick={() => setTab('connections')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${tab === 'connections' ? 'bg-sti-blue text-white' : 'text-sti-gray hover:bg-sti-gray-light dark:hover:bg-white/10'}`}
              >
                <UserCheck className="w-3.5 h-3.5 inline mr-1" /> Connections
                {connections.incoming.length > 0 && (
                  <span className="ml-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold inline-flex items-center justify-center">{connections.incoming.length}</span>
                )}
              </button>
            </div>
            {tab === 'chats' ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-sti-gray" /> <span className="text-sm font-semibold text-sti-gray-dark dark:text-white">Contacts</span>
                  <span className="text-xs text-sti-gray ml-auto">{search ? filteredContacts.length : displayContacts.length}</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sti-gray" />
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name..." className="input-field pl-8 py-2.5 text-sm" />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sti-gray" />
                <span className="text-sm font-semibold text-sti-gray-dark dark:text-white">Connections</span>
                <span className="text-xs text-sti-gray ml-auto">{connectionCount}</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {tab === 'connections' ? (
              connections.incoming.length + connections.outgoing.length + connections.accepted.length === 0 ? (
                <p className="text-sm text-sti-gray p-4 text-center">No connections yet<br/><span className="text-xs">Search a user in Chats and send a request</span></p>
              ) : (
                <>
                  {connections.incoming.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-sti-gray">Requests ({connections.incoming.length})</p>
                      {connections.incoming.map(e => renderConnectionRow(e, 'incoming'))}
                    </>
                  )}
                  {connections.outgoing.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-sti-gray">Sent</p>
                      {connections.outgoing.map(e => renderConnectionRow(e, 'outgoing'))}
                    </>
                  )}
                  {connections.accepted.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-sti-gray">Connected ({connections.accepted.length})</p>
                      {connections.accepted.map(e => renderConnectionRow(e, 'accepted'))}
                    </>
                  )}
                </>
              )
            ) : search ? (
               displayContacts.length === 0 ? (
                 <p className="text-sm text-sti-gray p-4">No matches for "{search}"</p>
               ) : displayContacts.map(renderContact)
             ) : displayContacts.length > 0 ? (
               displayContacts.map(renderContact)
             ) : (
               <p className="text-sm text-sti-gray p-4 text-center">No conversations yet<br/><span className="text-xs">Search for a user to start a chat</span></p>
             )}
          </div>
        </Card>
        <Card className={`lg:col-span-2 p-0 flex flex-col overflow-hidden ${!selected ? 'hidden lg:flex' : 'flex'} flex-1 min-h-0`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sti-gray text-sm p-8 text-center">Select a contact to start messaging<br/><span className="text-xs">No contact yet — pick someone and send a hello</span></div>
          ) : (
            <>
              <div className="px-3 sm:px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2 shrink-0">
                <button onClick={()=>setSelected(null)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 shrink-0">
                  <ArrowLeft className="w-5 h-5 text-sti-gray-dark dark:text-white" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{selected.displayName || selected.email}</p>
                  <p className="text-xs text-sti-gray truncate">{selected.email} • {formatRole(selected.role)}</p>
                </div>
                {isStudent && !selected.hasConversation && selected.connectionStatus === 'NONE' && (
                  <Button variant="primary" icon={UserPlus} loading={busyId === selected.id} onClick={() => handleRequest(selected)} className="text-xs px-2.5 py-1.5 shrink-0">
                    <span className="hidden sm:inline">Connect</span>
                  </Button>
                )}
                <button onClick={() => removeContact(selected)} className="p-2 rounded-lg text-sti-gray hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0" title="Remove from chat list" aria-label="Remove contact from chat list"><Trash2 className="w-4 h-4" /></button>
              </div>
              {chatBlocked ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <UserCheck className="w-10 h-10 text-sti-gray" />
                  <p className="text-sm font-semibold text-sti-gray-dark dark:text-white">You are not connected yet</p>
                  <p className="text-xs text-sti-gray max-w-xs">
                    {selected.connectionStatus === 'PENDING_OUT'
                      ? 'Your request is waiting for a reply. You can chat as soon as it is accepted.'
                      : selected.connectionStatus === 'PENDING_IN'
                        ? `${selected.displayName} sent you a request. Accept it from the Connections tab to start chatting.`
                        : 'Send a connection request first. Once it is accepted, you can start chatting.'}
                  </p>
                  {selected.connectionStatus === 'NONE' && (
                    <Button variant="primary" icon={UserPlus} loading={busyId === selected.id} onClick={() => handleRequest(selected)}>
                      Send connection request
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-sti-gray-light/30 dark:bg-slate-900/50 min-h-0">
                    {messages.map(m => {
                      const isMine = m.senderId === currentUserId;
                      const isImg = isImage(m.content);
                      return (
                        <div key={m.id} className={`flex ${isMine?'justify-end':'justify-start'} group`}>
                          <div className={`max-w-[78%] sm:max-w-[70%] px-3 py-2 rounded-2xl text-sm relative break-words ${isMine?'bg-sti-blue text-white rounded-br-sm':'bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 text-sti-gray-dark dark:text-white rounded-bl-sm'}`}>
                              {isImg ? <img src={m.content} alt="pic" className="max-w-[200px] rounded-lg" /> : <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                              <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <p className={`text-[10px] ${isMine?'text-white/70':'text-sti-gray'}`}>{new Date(m.createdAt).toLocaleString()}</p>
                                {isMine && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-white/70">
                                    <CheckCheck className={`w-3 h-3 ${m.isRead ? 'text-white' : 'text-white/50'}`} />
                                    {m.isRead ? 'Seen' : 'Sent'}
                                  </span>
                                )}
                              </div>
                              {isMine && <button onClick={()=>handleDelete(m.id)} className="absolute -top-2 -right-2 hidden group-hover:flex bg-white dark:bg-slate-700 border border-black/10 rounded-full p-1 shadow"><Trash2 className="w-3 h-3 text-red-600" /></button>}
                            </div>
                          </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                  {previewImg && (
                    <div className="px-3 py-2 border-t border-black/5 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-slate-800 shrink-0">
                      <img src={previewImg} alt="preview" className="w-16 h-16 object-cover rounded-lg shrink-0" />
                      <span className="text-xs text-sti-gray flex-1 min-w-0 truncate">Ready to send</span>
                      <button onClick={()=>setPreviewImg(null)} className="p-1.5 rounded-full hover:bg-sti-gray-light shrink-0"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  <form onSubmit={handleSend} className="p-3 border-t border-black/5 dark:border-white/10 flex gap-2 items-center min-w-0 shrink-0">
                    <input type="file" ref={fileRef} accept="image/*" onChange={handlePickImage} className="hidden" />
                    <button type="button" onClick={()=>fileRef.current?.click()} className="p-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-sti-gray-light dark:hover:bg-white/10 shrink-0"><ImageIcon className="w-4 h-4 text-sti-gray" /></button>
                    <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message…" className="input-field flex-1 min-w-0 text-sm py-2.5" />
                    <button type="submit" disabled={sending || (!text.trim() && !previewImg)} className="px-3 sm:px-4 py-2.5 rounded-xl bg-sti-blue text-white hover:bg-sti-blue-dark disabled:opacity-50 flex items-center gap-1.5 text-sm font-semibold shrink-0">
                      <Send className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </Card>
      </div>
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Messages;
