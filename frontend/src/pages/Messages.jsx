import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Inbox, Send, Search, Trash2, Pencil, Paperclip, ArrowLeft, Mail, Users, CheckCheck, X, Reply,
  AlertCircle, RefreshCw,
} from 'lucide-react';
import Modal from '../components/Modal';
import { getContacts, getConversation, sendMessage, deleteMessage, deleteConversation } from '../services/messageService';
import { useAuth } from '../hooks/useAuth';

// Outlook-like palette for the round sender avatars. The colour is derived from
// the address so the same person keeps the same colour between visits.
const AVATAR_COLORS = [
  'bg-[#0f6cbd]', 'bg-[#8764b8]', 'bg-[#038387]', 'bg-[#c239b3]',
  'bg-[#ca5010]', 'bg-[#498205]', 'bg-[#a4262c]', 'bg-[#005a9e]',
];

const colorFor = (key) => {
  const text = String(key || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 9973;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const initialsFor = (name, email) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return String(email || '?').slice(0, 2).toUpperCase();
};

const isToday = (date) => date.toDateString() === new Date().toDateString();

// List rows follow Outlook: time for today, weekday inside a week, date beyond.
const formatListDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const days = (Date.now() - date.getTime()) / 86400000;
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
};

const formatMessageDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday(date)) return `Today, ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
};

const FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'all', label: 'All mail', icon: Mail },
];

const matchesFolder = (contact, folder) => {
  if (folder === 'inbox') return Boolean(contact.hasReceived);
  if (folder === 'sent') return Boolean(contact.hasSent);
  return Boolean(contact.hasConversation);
};

const isImageBody = (content) => typeof content === 'string' && content.startsWith('data:image');

const Messages = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.userId;

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState('inbox');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [readingLoading, setReadingLoading] = useState(false);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [mobilePane, setMobilePane] = useState('list');
  const [contactsError, setContactsError] = useState('');
  const [threadError, setThreadError] = useState('');

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composing, setComposing] = useState(false);

  const scrollRef = useRef(null);
  const loadedThreadRef = useRef(null);
  const messageCountRef = useRef(0);
  const fileRef = useRef(null);
  // Guards against the two bugs that made mail look broken:
  //  * a slow response for thread A arriving after the reader opened thread B
  //    (which painted A's messages under B's name), and
  //  * overlapping polls stacking up until the pane never stopped loading.
  const selectedIdRef = useRef(null);
  const threadSeqRef = useRef(0);
  const threadAbortRef = useRef(null);
  const contactsInFlightRef = useRef(false);
  const sendingRef = useRef(false);

  // Follow the newest message only when the reader is already at the bottom,
  // so the 3s poll cannot yank the pane while someone reads older mail.
  const scrollToBottom = (behavior = 'smooth') => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const loadContacts = useCallback(async () => {
    // Skip instead of queueing: the inbox is polled, and a slow request must not
    // be joined by a second and third copy of itself.
    if (contactsInFlightRef.current) return;
    contactsInFlightRef.current = true;
    try {
      const res = await getContacts();
      setContacts(res.data || []);
      setContactsError('');
    } catch (error) {
      // A cancelled request is expected when the page unmounts - keep it quiet.
      if (error.code === 'ERR_CANCELED') return;
      setContactsError(
        error.code === 'ECONNABORTED'
          ? 'The mail server took too long to respond.'
          : error.response?.data?.message || 'Could not load your contacts.'
      );
    } finally {
      contactsInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (contactId, { silent = false } = {}) => {
    if (!contactId) return;
    // Only one request per thread at a time; a newer call supersedes the old one.
    threadAbortRef.current?.abort();
    const controller = new AbortController();
    threadAbortRef.current = controller;
    const seq = ++threadSeqRef.current;

    if (!silent) setReadingLoading(true);
    try {
      const res = await getConversation(contactId, { signal: controller.signal });
      // Drop a response that belongs to a thread the user already left.
      if (seq !== threadSeqRef.current || selectedIdRef.current !== contactId) return;

      const incoming = res.data || [];
      const isNewThread = loadedThreadRef.current !== contactId;
      const grew = incoming.length > messageCountRef.current;
      const newestIsMine = incoming[incoming.length - 1]?.senderId === currentUserId;
      const shouldFollow = isNewThread || (grew && isNearBottom());

      setMessages((current) => {
        const lastSame = current[current.length - 1]?.id === incoming[incoming.length - 1]?.id;
        // Same thread, same newest message: keep the existing array so the pane
        // does not re-render (and flicker) on every poll.
        if (current.length === incoming.length && lastSame) return current;
        return incoming;
      });
      setContacts((current) => current.map((c) => (c.id === contactId ? { ...c, unreadCount: 0 } : c)));
      setThreadError('');

      loadedThreadRef.current = contactId;
      messageCountRef.current = incoming.length;

      if (shouldFollow || (grew && newestIsMine)) {
        setTimeout(() => scrollToBottom(isNewThread ? 'auto' : 'smooth'), 60);
      }
    } catch (error) {
      if (error.code === 'ERR_CANCELED' || seq !== threadSeqRef.current) return;
      setThreadError(
        error.code === 'ECONNABORTED'
          ? 'This conversation took too long to load.'
          : error.response?.data?.message || 'Could not load this conversation.'
      );
    } finally {
      if (seq === threadSeqRef.current) setReadingLoading(false);
    }
  }, [currentUserId]);

  // Contacts poll: the next request is scheduled only after the current one
  // finishes, so a slow API can never build a backlog.
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const tick = async () => {
      await loadContacts();
      if (!cancelled) timer = setTimeout(tick, 7000);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loadContacts]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Thread poll: same self-scheduling pattern, and the previous thread's request
  // is aborted as soon as the reader picks a different one.
  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;
    let timer = null;
    const tick = async (first) => {
      await loadConversation(selectedId, { silent: !first });
      if (!cancelled) timer = setTimeout(() => tick(false), 5000);
    };
    tick(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      threadAbortRef.current?.abort();
    };
  }, [selectedId, loadConversation]);

  const selected = contacts.find((c) => c.id === selectedId) || null;

  const unreadTotal = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const inboxCount = contacts.filter((c) => c.hasReceived).length;
  const sentCount = contacts.filter((c) => c.hasSent).length;

  const query = search.trim().toLowerCase();
  const matchQuery = (contact) =>
    !query ||
    String(contact.displayName || '').toLowerCase().includes(query) ||
    String(contact.email || '').toLowerCase().includes(query) ||
    String(contact.lastMessagePreview || '').toLowerCase().includes(query);

  const threads = useMemo(
    () => contacts
      .filter((c) => c.hasConversation && matchesFolder(c, folder) && matchQuery(c))
      .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)),
    [contacts, folder, query]
  );

  const people = useMemo(
    () => contacts
      .filter(matchQuery)
      .sort((a, b) => String(a.displayName || a.email).localeCompare(String(b.displayName || b.email))),
    [contacts, query]
  );

  const openThread = (contact) => {
    // Reset synchronously. Without this the previous thread stayed on screen
    // (under the new contact's header) until the next fetch resolved.
    selectedIdRef.current = contact.id;
    loadedThreadRef.current = null;
    messageCountRef.current = 0;
    threadSeqRef.current += 1;
    threadAbortRef.current?.abort();
    setMessages([]);
    setThreadError('');
    setSelectedId(contact.id);
    setMobilePane('pane');
    setText('');
    setAttachment(null);
    setContacts((current) => current.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c)));
  };

  const refreshAfterSend = async (contactId) => {
    await Promise.all([loadContacts(), loadConversation(contactId, { silent: true })]);
  };

  // Paint a sent message immediately so a slow API cannot make it look lost.
  const showSentMessage = (contactId, created) => {
    const content = String(created?.content || '');
    const preview = content.startsWith('data:image') ? 'Photo' : content.slice(0, 80);
    setMessages((current) => {
      if (!created?.id || current.some((m) => m.id === created.id)) return current;
      return [...current, created];
    });
    messageCountRef.current += 1;
    setContacts((current) => current.map((c) => (
      c.id === contactId
        ? {
            ...c,
            hasConversation: true,
            hasSent: true,
            lastMessageIsMine: true,
            lastMessageAt: created?.createdAt || new Date().toISOString(),
            lastMessagePreview: preview,
          }
        : c
    )));
    setTimeout(() => scrollToBottom('smooth'), 60);
  };

  const handleReply = async (event) => {
    event?.preventDefault?.();
    // `sendingRef` is checked synchronously so a double Enter (or a double click
    // before React re-renders) cannot send the same message twice.
    if ((!text.trim() && !attachment) || !selectedId || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const body = attachment || text.trim();
    const wasImage = Boolean(attachment);
    setText('');
    setAttachment(null);
    try {
      const res = await sendMessage(selectedId, body);
      showSentMessage(selectedId, res.data);
      loadContacts();
      loadConversation(selectedId, { silent: true });
    } catch (error) {
      // Put the draft back so nothing is lost when the send fails.
      if (wasImage) setAttachment(body);
      else setText(body);
      showToast(error.response?.data?.message || 'Failed to send message');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleCompose = async (event) => {
    event.preventDefault();
    if (!composeTo || !composeBody.trim() || composing) return;
    const contact = contacts.find((c) => c.id === composeTo);
    setComposing(true);
    try {
      const res = await sendMessage(composeTo, composeBody.trim());
      setComposeOpen(false);
      setComposeBody('');
      setComposeTo('');
      await loadContacts();
      if (contact) openThread(contact);
      showSentMessage(composeTo, res.data);
      showToast('Message sent');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to send message');
    } finally {
      setComposing(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteMessage(messageId);
      setMessages((current) => current.filter((m) => m.id !== messageId));
      await refreshAfterSend(selectedId);
    } catch (error) {
      showToast('Failed to delete message');
    }
  };

  const handleDeleteConversation = async (contact) => {
    const target = contact || selected;
    if (!target) return;
    if (!window.confirm(`Delete the whole conversation with ${target.displayName || target.email}?`)) return;
    try {
      await deleteConversation(target.id);
      if (selectedId === target.id) {
        setSelectedId(null);
        setMessages([]);
        setMobilePane('list');
      }
      await loadContacts();
      showToast('Conversation deleted');
    } catch (error) {
      showToast('Failed to delete conversation');
    }
  };

  const handlePickAttachment = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image too large (max 8MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment(reader.result);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const activeFolder = FOLDERS.find((f) => f.key === folder) || FOLDERS[0];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sti-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-sti-gray-dark dark:text-white">
            <Mail className="h-5 w-5 text-sti-blue" /> Messages
          </h1>
          <p className="text-sm text-sti-gray">Mail-style inbox for everyone in SIMES.</p>
        </div>
        {unreadTotal > 0 && (
          <span className="rounded-full bg-sti-blue px-3 py-1 text-xs font-semibold text-white">
            {unreadTotal} unread
          </span>
        )}
      </div>

      {contactsError && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{contactsError} Showing the last known mail.</span>
          <button
            type="button"
            onClick={() => loadContacts()}
            className="flex shrink-0 items-center gap-1 font-semibold underline"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      <div className="flex h-[calc(100dvh-190px)] min-h-[540px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-slate-800">
        {/* ── Folder rail ─────────────────────────────────────────────── */}
        <aside className="hidden w-[204px] shrink-0 flex-col border-r border-black/5 bg-sti-gray-light/40 dark:border-white/10 dark:bg-slate-900/40 lg:flex">
          <div className="p-3">
            <button
              onClick={() => setComposeOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sti-blue px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sti-blue-dark"
            >
              <Pencil className="h-4 w-4" /> New message
            </button>
          </div>

          <nav className="space-y-0.5 px-2">
            {FOLDERS.map(({ key, label, icon: Icon }) => {
              const count = key === 'inbox' ? inboxCount : key === 'sent' ? sentCount : 0;
              const active = folder === key;
              return (
                <button
                  key={key}
                  onClick={() => setFolder(key)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-white font-semibold text-sti-blue shadow-sm dark:bg-white/10'
                      : 'text-sti-gray-dark hover:bg-white/70 dark:text-white/70 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{label}</span>
                  {key === 'inbox' && unreadTotal > 0 && (
                    <span className="rounded-full bg-sti-blue px-1.5 text-[10px] font-bold text-white">{unreadTotal}</span>
                  )}
                  {key !== 'inbox' && count > 0 && <span className="text-[10px] text-sti-gray">{count}</span>}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <p className="flex items-center gap-1.5 px-4 pb-1 text-[10px] font-bold uppercase tracking-wide text-sti-gray">
              <Users className="h-3 w-3" /> People
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {people.length === 0 && <p className="px-2 py-2 text-xs text-sti-gray">No matches</p>}
              {people.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => openThread(contact)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/80 dark:hover:bg-white/10"
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${colorFor(contact.email)}`}>
                    {initialsFor(contact.displayName, contact.email)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-sti-gray-dark dark:text-white">
                      {contact.displayName || contact.email}
                    </span>
                  </span>
                  {contact.unreadCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-sti-blue" />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Message list ────────────────────────────────────────────── */}
        <section className={`w-full flex-col border-r border-black/5 dark:border-white/10 lg:flex lg:w-[336px] lg:shrink-0 ${mobilePane === 'pane' ? 'hidden' : 'flex'}`}>
          <div className="shrink-0 border-b border-black/5 p-3 dark:border-white/10">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-sti-gray-dark dark:text-white">{activeFolder.label}</p>
              <button
                onClick={() => setComposeOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-sti-blue px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sti-blue-dark lg:hidden"
              >
                <Pencil className="h-3.5 w-3.5" /> New
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sti-gray" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search mail and people"
                className="input-field py-2 pl-8 text-sm"
              />
            </div>
            {/* Folder chips keep folder switching reachable where the rail is hidden */}
            <div className="mt-2 flex gap-1.5 lg:hidden">
              {FOLDERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFolder(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    folder === key
                      ? 'bg-sti-blue text-white'
                      : 'bg-sti-gray-light text-sti-gray-dark dark:bg-white/10 dark:text-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-8 text-center text-sm text-sti-gray">
                {query ? `No mail matches "${search}"` : `No messages in ${activeFolder.label.toLowerCase()} yet.`}
              </div>
            ) : (
              threads.map((contact) => {
                const unread = contact.unreadCount > 0;
                const isActive = contact.id === selectedId;
                return (
                  <div
                    key={contact.id}
                    className={`group relative flex w-full items-start gap-2.5 border-b border-black/5 px-3 py-2.5 transition-colors dark:border-white/5 ${
                      isActive ? 'bg-sti-blue-50 dark:bg-white/10' : 'hover:bg-sti-gray-light/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <button onClick={() => openThread(contact)} className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${colorFor(contact.email)}`}>
                        {initialsFor(contact.displayName, contact.email)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className={`min-w-0 flex-1 truncate text-sm ${unread ? 'font-bold' : 'font-medium'} text-sti-gray-dark dark:text-white`}>
                            {contact.displayName || contact.email}
                          </span>
                          <span className={`shrink-0 text-[11px] ${unread ? 'font-semibold text-sti-blue' : 'text-sti-gray'}`}>
                            {formatListDate(contact.lastMessageAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          {contact.lastMessageIsMine && <Send className="h-3 w-3 shrink-0 text-sti-gray" />}
                          <span className={`min-w-0 flex-1 truncate text-xs ${unread ? 'font-semibold text-sti-gray-dark dark:text-white/90' : 'text-sti-gray'}`}>
                            {contact.lastMessagePreview || 'No messages yet'}
                          </span>
                          {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-sti-blue" />}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteConversation(contact)}
                      className="hidden shrink-0 rounded-md p-1.5 text-sti-gray hover:bg-red-50 hover:text-red-600 group-hover:block dark:hover:bg-red-950/30"
                      title="Delete conversation"
                      aria-label={`Delete conversation with ${contact.displayName || contact.email}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Reading pane ────────────────────────────────────────────── */}
        <section className={`min-w-0 flex-1 flex-col bg-white dark:bg-slate-800 ${mobilePane === 'pane' ? 'flex' : 'hidden lg:flex'}`}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sti-gray-light dark:bg-white/10">
                <Mail className="h-6 w-6 text-sti-gray" />
              </div>
              <p className="text-sm font-medium text-sti-gray-dark dark:text-white">Select an item to read</p>
              <p className="max-w-xs text-xs text-sti-gray">Pick a conversation on the left, or start a new message.</p>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-black/5 px-3 py-2.5 dark:border-white/10 sm:px-4">
                <button
                  onClick={() => setMobilePane('list')}
                  className="-ml-1 rounded-lg p-2 hover:bg-sti-gray-light dark:hover:bg-white/10 lg:hidden"
                  aria-label="Back to message list"
                >
                  <ArrowLeft className="h-5 w-5 text-sti-gray-dark dark:text-white" />
                </button>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${colorFor(selected.email)}`}>
                  {initialsFor(selected.displayName, selected.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-sti-gray-dark dark:text-white">{selected.displayName || selected.email}</p>
                  <p className="truncate text-xs text-sti-gray">{selected.email}</p>
                </div>
                <button
                  onClick={() => handleDeleteConversation(selected)}
                  className="shrink-0 rounded-lg p-2 text-sti-gray hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-sti-gray-light/30 p-3 dark:bg-slate-900/40 sm:p-4">
                {readingLoading && messages.length === 0 && !threadError && (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-sti-blue border-t-transparent" />
                  </div>
                )}
                {!readingLoading && threadError && messages.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <p className="text-sm text-sti-gray">{threadError}</p>
                    <button
                      type="button"
                      onClick={() => loadConversation(selectedId)}
                      className="flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-sti-gray-dark hover:bg-white dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                    >
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  </div>
                )}
                {!readingLoading && !threadError && messages.length === 0 && (
                  <p className="py-10 text-center text-sm text-sti-gray">No messages yet. Say hello below.</p>
                )}
                {messages.map((message) => {
                  const mine = message.senderId === currentUserId;
                  const image = isImageBody(message.content);
                  return (
                    <article
                      key={message.id}
                      className={`group relative rounded-xl border p-3 shadow-sm ${
                        mine
                          ? 'border-sti-blue/20 bg-sti-blue-50/70 dark:border-sti-blue/30 dark:bg-sti-blue/10'
                          : 'border-black/5 bg-white dark:border-white/10 dark:bg-slate-800'
                      }`}
                    >
                      <header className="mb-2 flex items-center gap-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${colorFor(mine ? 'me' : selected.email)}`}>
                          {initialsFor(mine ? 'You' : selected.displayName, mine ? 'me' : selected.email)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-sti-gray-dark dark:text-white">
                          {mine ? 'You' : selected.displayName || selected.email}
                        </span>
                        <time className="shrink-0 text-[11px] text-sti-gray">{formatMessageDate(message.createdAt)}</time>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="hidden shrink-0 rounded p-1 text-sti-gray hover:text-red-600 group-hover:block"
                          title="Delete message"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </header>
                      {image ? (
                        <img src={message.content} alt="Attachment" className="max-w-[260px] rounded-lg border border-black/5" />
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm text-sti-gray-dark dark:text-white/90">{message.content}</p>
                      )}
                      {mine && (
                        <footer className="mt-2 flex items-center justify-end gap-1 text-[10px] text-sti-gray">
                          <CheckCheck className={`h-3 w-3 ${message.isRead ? 'text-sti-blue' : 'text-sti-gray'}`} />
                          {message.isRead ? 'Read' : 'Sent'}
                        </footer>
                      )}
                    </article>
                  );
                })}
              </div>

              {attachment && (
                <div className="flex shrink-0 items-center gap-2 border-t border-black/5 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-800">
                  <img src={attachment} alt="Attachment preview" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs text-sti-gray">Image ready to send</span>
                  <button onClick={() => setAttachment(null)} className="shrink-0 rounded-full p-1.5 hover:bg-sti-gray-light dark:hover:bg-white/10" aria-label="Remove attachment">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleReply} className="shrink-0 border-t border-black/5 p-3 dark:border-white/10">
                <div className="flex items-end gap-2">
                  <input type="file" ref={fileRef} accept="image/*" onChange={handlePickAttachment} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="shrink-0 rounded-lg border border-black/10 p-2.5 hover:bg-sti-gray-light dark:border-white/10 dark:hover:bg-white/10"
                    title="Attach an image"
                    aria-label="Attach an image"
                  >
                    <Paperclip className="h-4 w-4 text-sti-gray" />
                  </button>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleReply(event);
                      }
                    }}
                    rows={2}
                    placeholder={`Reply to ${selected.displayName || selected.email}...`}
                    className="input-field max-h-32 min-h-[52px] flex-1 resize-y py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!text.trim() && !attachment)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-sti-blue px-3 py-2.5 text-sm font-semibold text-white hover:bg-sti-blue-dark disabled:opacity-50"
                  >
                    <Reply className="h-4 w-4" /> <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="New message" maxWidth="max-w-xl">
        <form onSubmit={handleCompose} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sti-gray" htmlFor="compose-to">To</label>
            <select
              id="compose-to"
              value={composeTo}
              onChange={(event) => setComposeTo(event.target.value)}
              className="input-field text-sm"
              required
            >
              <option value="">Select a recipient...</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.displayName || contact.email} - {contact.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sti-gray" htmlFor="compose-body">Message</label>
            <textarea
              id="compose-body"
              value={composeBody}
              onChange={(event) => setComposeBody(event.target.value)}
              rows={7}
              className="input-field resize-y text-sm"
              placeholder="Write your message..."
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setComposeOpen(false)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-sti-gray-dark hover:bg-sti-gray-light dark:border-white/10 dark:text-white dark:hover:bg-white/10"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={composing || !composeTo || !composeBody.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-sti-blue px-4 py-2 text-sm font-semibold text-white hover:bg-sti-blue-dark disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Send
            </button>
          </div>
        </form>
      </Modal>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Messages;
