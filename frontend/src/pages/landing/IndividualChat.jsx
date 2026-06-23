import { useEffect, useRef, useState, useCallback } from 'react';
import http from '../../api/index';
import { useAuth } from '../../context/AuthContext';
import { Send, MessageSquare, User, Clock } from 'lucide-react';

/**
 * IndividualChat — true 1-on-1 chat.
 *
 * Admin: picks a user from the sidebar → messages are stored with
 *        sender_id=admin, recipient_id=selectedUser.id (and vice-versa).
 *        GET /api/chat/messages?with=<userId>
 *        POST /api/admin/chat   { message, recipient_id }
 *
 * Employee / Client: always talks to admin.
 *        GET /api/chat/messages          (backend filters to their convo with admin)
 *        POST /api/employee/chat  OR  /api/client/chat   { message }
 */
export default function IndividualChat({ postPath }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  // ── Load conversation partners (admin only) ────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      http.get('/admin/employees').catch(() => ({ data: [] })),
      http.get('/admin/clients').catch(() => ({ data: [] })),
    ]).then(([emp, cli]) => {
      const empList = (emp.data || []).map((e) => ({ ...e, _type: 'employee' }));
      const cliList = (cli.data || []).map((c) => ({ ...c, _type: 'client' }));
      setUsers([...empList, ...cliList]);
    });
  }, [isAdmin]);

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(() => {
    // Admin must have a selected user; others always load their own convo
    if (isAdmin && !selectedUser) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const endpoint = isAdmin
      ? `/chat/messages?with=${selectedUser.id}`
      : '/chat/messages';

    http.get(endpoint)
      .then((r) => {
        setMessages(r.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isAdmin, selectedUser]);

  // Re-fetch + start polling whenever selected conversation changes
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    loadMessages();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────
  const send = async () => {
    if (!text.trim() || sending) return;
    if (isAdmin && !selectedUser) return;

    setSending(true);
    try {
      const body = { message: text.trim() };
      if (isAdmin) body.recipient_id = selectedUser.id;

      await http.post(postPath, body);
      setText('');
      loadMessages();
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // A message belongs to "me" if my user id sent it
  const isMe = (m) => m.sender_id === user?.id || m.sender_name === user?.full_name;

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] sm:h-[calc(100vh-9rem)]">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Individual Chat</h1>
        <p className="text-slate-500 text-sm">Private one-on-one conversations</p>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar: user list (admin only) */}
        {isAdmin && (
          <div className="hidden sm:flex flex-col w-56 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden shrink-0">
            <div className="p-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={`${u._type}-${u.id}`}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 ${
                    selectedUser?.id === u.id && selectedUser?._type === u._type
                      ? 'bg-brand-50 border-l-2 border-l-brand-500'
                      : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 bg-brand-100 text-brand-700">
                    {u.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{u.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{u._type}</p>
                  </div>
                </button>
              ))}
              {!users.length && (
                <p className="text-xs text-slate-400 p-3">No users found</p>
              )}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-800">
                {isAdmin
                  ? selectedUser
                    ? `${selectedUser.full_name} (${selectedUser._type})`
                    : 'Select a conversation'
                  : 'GoalLine Admin'}
              </p>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Online
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isAdmin && !selectedUser ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <MessageSquare className="w-10 h-10 opacity-30" />
                <p className="text-sm">Select a user from the left to start chatting</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Loading messages…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <MessageSquare className="w-10 h-10 opacity-30" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((m, i) => {
                const mine = isMe(m);
                return (
                  <div key={m.id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] sm:max-w-[60%] ${mine ? 'order-2' : ''}`}>
                      {!mine && (
                        <p className="text-xs text-slate-400 mb-1 ml-1">
                          {m.sender_name || m.guest_name || 'Unknown'}
                        </p>
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          mine
                            ? 'bg-brand-600 text-white rounded-tr-sm'
                            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                        }`}
                      >
                        {m.message}
                      </div>
                      <p className={`text-xs text-slate-400 mt-1 flex items-center gap-1 ${mine ? 'justify-end mr-1' : 'ml-1'}`}>
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(m.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-3 sm:p-4 shrink-0">
            {isAdmin && !selectedUser ? (
              <p className="text-sm text-slate-400 text-center py-2">
                Select a user from the left to start chatting
              </p>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKey}
                  style={{ maxHeight: '120px', overflowY: 'auto' }}
                />
                <button
                  onClick={send}
                  disabled={sending || !text.trim() || (isAdmin && !selectedUser)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile user picker for admin */}
      {isAdmin && (
        <div className="sm:hidden mt-3">
          <select
            className="input-field w-full text-sm"
            value={selectedUser ? `${selectedUser._type}-${selectedUser.id}` : ''}
            onChange={(e) => {
              if (!e.target.value) { setSelectedUser(null); return; }
              const [type, id] = e.target.value.split('-');
              const u = users.find((u) => String(u.id) === id && u._type === type);
              setSelectedUser(u || null);
            }}
          >
            <option value="">Select a user to chat with…</option>
            {users.map((u) => (
              <option key={`${u._type}-${u.id}`} value={`${u._type}-${u.id}`}>
                {u.full_name} ({u._type})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
