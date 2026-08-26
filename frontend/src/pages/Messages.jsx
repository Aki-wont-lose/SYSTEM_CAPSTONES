import { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, Users } from 'lucide-react';
import Card from '../components/Card';
import { getContacts, getConversation, sendMessage } from '../services/messageService';

const Messages = () => {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadContacts = async () => {
    try {
      const res = await getContacts();
      setContacts(res.data);
      if (res.data.length && !selected) setSelected(res.data[0]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadConversation = async () => {
    if (!selected) return;
    try {
      const res = await getConversation(selected.id);
      setMessages(res.data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadContacts(); }, []);
  useEffect(() => { loadConversation(); const id = setInterval(loadConversation, 5000); return () => clearInterval(id); }, [selected]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      await sendMessage(selected.id, text.trim());
      setText('');
      loadConversation();
    } catch (err) { alert(err.response?.data?.message || 'Failed to send'); } finally { setSending(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white flex items-center gap-2"><MessageCircle className="w-5 h-5 text-sti-blue" /> Messages</h1>
        <p className="text-sm text-sti-gray">Coordinator ↔ Supervisor contact — same UI, role-limited.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[65vh]">
        <Card className="p-0 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2">
            <Users className="w-4 h-4 text-sti-gray" /> <span className="text-sm font-semibold text-sti-gray-dark dark:text-white">Contacts</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="text-sm text-sti-gray p-4">No contacts — seed a Coordinator and Supervisor account.</p>
            ) : contacts.map(c => (
              <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left px-4 py-3 border-b border-black/5 dark:border-white/10 hover:bg-sti-gray-light dark:hover:bg-white/5 ${selected?.id===c.id?'bg-sti-blue-50 dark:bg-white/10':''}`}>
                <p className="text-sm font-semibold text-sti-gray-dark dark:text-white truncate">{c.email}</p>
                <p className="text-xs text-sti-gray">{c.role}</p>
              </button>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2 p-0 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sti-gray text-sm">Select a contact</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
                <p className="text-sm font-semibold text-sti-gray-dark dark:text-white">{selected.email}</p>
                <p className="text-xs text-sti-gray">{selected.role}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-sti-gray-light/30 dark:bg-slate-900/50">
                {messages.map(m => {
                  const isMine = m.senderId !== selected.id;
                  return (
                    <div key={m.id} className={`flex ${isMine?'justify-end':'justify-start'}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${isMine?'bg-sti-blue text-white rounded-br-sm':'bg-white dark:bg-slate-800 border border-black/5 dark:border-white/10 text-sti-gray-dark dark:text-white rounded-bl-sm'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine?'text-white/70':'text-sti-gray'}`}>{new Date(m.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} className="p-3 border-t border-black/5 dark:border-white/10 flex gap-2">
                <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message…" className="input-field flex-1" />
                <button type="submit" disabled={sending || !text.trim()} className="px-4 py-2 rounded-xl bg-sti-blue text-white hover:bg-sti-blue-dark disabled:opacity-50 flex items-center gap-1.5 text-sm font-semibold">
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
