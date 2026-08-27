import { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, Users, Search, Trash2, Image as ImageIcon, X, CheckCheck } from 'lucide-react';
import Card from '../components/Card';
import { getContacts, getConversation, sendMessage, deleteMessage } from '../services/messageService';
import { useAuth } from '../hooks/useAuth';

const Messages = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.userId;
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const loadContacts = async () => {
    try {
      const res = await getContacts();
      setContacts(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadConversation = async (contactId) => {
    const id = contactId || selected?.id;
    if (!id) return;
    try {
      const res = await getConversation(id);
      setMessages(res.data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadContacts(); }, []);
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
  const [recentIds, setRecentIds] = useState(() => JSON.parse(localStorage.getItem('recentChats') || '[]'));
  const displayContacts = search ? filteredContacts : contacts.filter(c => recentIds.includes(c.id));
  useEffect(() => { if (selected) { const ids = JSON.parse(localStorage.getItem('recentChats') || '[]'); if (!ids.includes(selected.id)) { const next=[selected.id, ...ids].slice(0,20); localStorage.setItem('recentChats', JSON.stringify(next)); setRecentIds(next); } } }, [messages]);

  const isImage = (content) => content && content.startsWith('data:image');

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
    } catch (err) { alert(err.response?.data?.message || 'Failed to send'); } finally { setSending(false); }
  };

  const handleDelete = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    try { await deleteMessage(msgId); loadConversation(); } catch (e) { alert('Failed to delete'); }
  };

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert('Image too large (max 8MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setPreviewImg(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white flex items-center gap-2"><MessageCircle className="w-5 h-5 text-sti-blue" /> Messages</h1>
        <p className="text-sm text-sti-gray">All users can message all — searchable by name.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[65vh]">
        <Card className="p-0 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-sti-gray" /> <span className="text-sm font-semibold text-sti-gray-dark dark:text-white">Contacts</span>
              <span className="text-xs text-sti-gray ml-auto">{filteredContacts.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sti-gray" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name..." className="input-field pl-8 py-2 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {search ? (
              displayContacts.length === 0 ? (
                <p className="text-sm text-sti-gray p-4">No matches for "{search}"</p>
              ) : displayContacts.map(c => (
                <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left px-4 py-3 border-b border-black/5 dark:border-white/10 hover:bg-sti-gray-light dark:hover:bg-white/5 ${selected?.id===c.id?'bg-sti-blue-50 dark:bg-white/10':''}`}>
                  <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{c.displayName || c.email.split('@')[0]} <span className="text-xs font-normal text-sti-gray">• {c.roleLabel || formatRole(c.role)}</span></p>
                </button>
              ))
            ) : displayContacts.length > 0 ? (
              displayContacts.map(c => (
                <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left px-4 py-3 border-b border-black/5 dark:border-white/10 hover:bg-sti-gray-light dark:hover:bg-white/5 ${selected?.id===c.id?'bg-sti-blue-50 dark:bg-white/10':''}`}>
                  <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{c.displayName || c.email.split('@')[0]} <span className="text-xs font-normal text-sti-gray">• {c.roleLabel || formatRole(c.role)}</span></p>
                </button>
              ))
            ) : (
              <p className="text-sm text-sti-gray p-4 text-center">Search name to find contacts<br/><span className="text-xs">After chat it will pop up here</span></p>
            )}
          </div>
        </Card>
        <Card className="lg:col-span-2 p-0 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sti-gray text-sm p-8 text-center">Select a contact to start messaging<br/><span className="text-xs">No contact yet — pick someone and send a hello</span></div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
                <p className="text-sm font-semibold text-sti-gray-dark dark:text-white">{selected.displayName || selected.email}</p>
                <p className="text-xs text-sti-gray">{selected.email} • {formatRole(selected.role)}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-sti-gray-light/30 dark:bg-slate-900/50">
                {messages.map(m => {
                  const isMine = m.senderId === currentUserId;
                  const isImg = isImage(m.content);
                  return (
                    <div key={m.id} className={`flex ${isMine?'justify-end':'justify-start'} group`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm relative ${isMine?'bg-sti-blue text-white rounded-br-sm':'bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 text-sti-gray-dark dark:text-white rounded-bl-sm'}`}>
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
                <div className="px-3 py-2 border-t border-black/5 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-slate-800">
                  <img src={previewImg} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
                  <span className="text-xs text-sti-gray flex-1">Ready to send</span>
                  <button onClick={()=>setPreviewImg(null)} className="p-1.5 rounded-full hover:bg-sti-gray-light"><X className="w-4 h-4" /></button>
                </div>
              )}
              <form onSubmit={handleSend} className="p-3 border-t border-black/5 dark:border-white/10 flex gap-2">
                <input type="file" ref={fileRef} accept="image/*" onChange={handlePickImage} className="hidden" />
                <button type="button" onClick={()=>fileRef.current?.click()} className="p-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-sti-gray-light dark:hover:bg-white/10"><ImageIcon className="w-4 h-4 text-sti-gray" /></button>
                <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message…" className="input-field flex-1" />
                <button type="submit" disabled={sending || (!text.trim() && !previewImg)} className="px-4 py-2 rounded-xl bg-sti-blue text-white hover:bg-sti-blue-dark disabled:opacity-50 flex items-center gap-1.5 text-sm font-semibold">
                  <Send className="w-4 h-4" /> Send
                </button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages;
