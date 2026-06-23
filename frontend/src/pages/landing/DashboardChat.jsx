import { useEffect, useRef, useState, useCallback } from 'react';
import http from '../../api/index';
import AdminChatReports from '../../pages/admin/AdminChatReports';
import { useAuth } from '../../context/AuthContext';
import {
  Send, MessageSquare, User, Clock, Search, Shield, Briefcase,
  Plus, Check, X, Users, AlertCircle, ChevronRight, RefreshCw,
  Flag, Trash2
} from 'lucide-react';

const ROLE_ICON = {
  admin: <Shield className="w-3 h-3" />,
  employee: <Briefcase className="w-3 h-3" />,
  client: <User className="w-3 h-3" />,
};
const ROLE_COLOR = {
  admin: 'bg-purple-100 text-purple-700',
  employee: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
};

function Avatar({ name = '', role = '', size = 8 }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = { admin: 'bg-purple-500', employee: 'bg-blue-500', client: 'bg-green-500' };
  return (
    <div className={`w-${size} h-${size} rounded-full ${colors[role] || 'bg-slate-400'} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
      {initials || '?'}
    </div>
  );
}

export default function DashboardChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // New chat modal (admin only)
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [modalSearch, setModalSearch] = useState('');

  // Employee peer chat request modal
  const [showPeerRequest, setShowPeerRequest] = useState(false);
  const [peerEmployees, setPeerEmployees] = useState([]);
  const [peerReason, setPeerReason] = useState('');
  const [peerTarget, setPeerTarget] = useState(null);
  const [peerRequests, setPeerRequests] = useState([]);
  const [showPeerRequests, setShowPeerRequests] = useState(false);

  // Admin chat request management
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedChats, setApprovedChats] = useState([]);
  const [showPendingRequests, setShowPendingRequests] = useState(false);

  // End chat & report states
  const [showEndChatModal, setShowEndChatModal] = useState(false);
  const [endReason, setEndReason] = useState('');
  const [endingChat, setEndingChat] = useState(false);

  const [frozen, setFrozen] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const [showChatHistory, setShowChatHistory] = useState(false);

  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isClient = user?.role === 'client';

  // ── Check freeze ──────────────────────────────────────────────────────────
  useEffect(() => {
    const key = isEmployee ? 'freeze_employee_chat' : isClient ? 'freeze_client_chat' : null;
    if (!key) return;
    http.get(`/system-settings/check?key=${key}`)
      .then(r => setFrozen(r.data.value === '1'))
      .catch(() => {});
  }, [isEmployee, isClient]);

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const ep = isAdmin
        ? '/admin/conversations'
        : isEmployee
        ? '/employee/conversations'
        : '/client/conversations';
      const r = await http.get(ep);
      const data = r.data || [];
      setConversations(data);

      // If the currently selected conversation was deleted (e.g. after end chat), clear it
      setSelected(prev => {
        if (!prev) return prev;
        const still = data.find(
          c => c.user_id === prev.user_id && c.chat_request_id === prev.chat_request_id
        );
        return still ? prev : null;
      });
    } catch {
      setConversations([]);
    }
  }, [isAdmin, isEmployee, isClient]);

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (conv) => {
    if (!conv) return;
    try {
      let msgs = [];
      if (conv.chat_request_id) {
        const r = await http.get(`/employee/peer-chat/${conv.chat_request_id}`);
        msgs = r.data;
      } else {
        const params = isAdmin ? `?with=${conv.user_id}` : '';
        const r = await http.get(`/chat/messages${params}`);
        msgs = r.data;
      }
      setMessages(msgs);
      if (conv.user_id) {
        http.post('/chat/mark-read', { sender_id: conv.user_id }).catch(() => {});
      }
    } catch {
      setMessages([]);
    }
  }, [isAdmin]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadConversations();
  }, []);

  // ── Load messages when selection changes ──────────────────────────────────
  useEffect(() => {
    if (selected) {
      setLoading(true);
      loadMessages(selected).finally(() => setLoading(false));
    } else {
      setMessages([]);
    }
  }, [selected]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Poll every 3s ─────────────────────────────────────────────────────────
  useEffect(() => {
    pollRef.current = setInterval(() => {
      loadConversations();
      if (selected) loadMessages(selected);
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [selected, loadConversations, loadMessages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected || sending) return;
    if (frozen) { setStatusMsg('Chat is currently frozen by admin.'); return; }
    setSending(true);
    try {
      if (selected.chat_request_id) {
        await http.post('/employee/peer-chat/message', {
          chat_request_id: selected.chat_request_id,
          recipient_id: selected.user_id,
          message: text.trim(),
        });
      } else if (isAdmin) {
        await http.post('/admin/chat', { message: text.trim(), recipient_id: selected.user_id });
      } else if (isEmployee) {
        await http.post('/employee/chat', { message: text.trim() });
      } else if (isClient) {
        await http.post('/client/chat', { message: text.trim() });
      }
      setText('');
      await loadMessages(selected);
      await loadConversations();
    } catch (err) {
      setStatusMsg(err.response?.data?.error || 'Failed to send');
    }
    setSending(false);
  };

  // ── END PEER CHAT: send history to admin → delete → allow new request ────
  const endChatAndReport = async () => {
    if (!selected || !selected.chat_request_id) return;
    setEndingChat(true);
    try {
      // 1. Send full history report to admin
      await http.post('/admin/peer-chat-report', {
        chat_request_id: selected.chat_request_id,
        ended_by: user?.full_name,
        ended_by_id: user?.id,
        ended_by_role: user?.role,
        reason: endReason.trim() || 'Chat completed by employee',
        ended_at: new Date().toISOString(),
        chat_partner_name: selected.participant_name,
        chat_partner_id: selected.user_id,
        chat_history: messages,
        total_messages: messages.length,
      });

      // 2. Delete the peer chat session (marks as ended + deletes messages from employee view)
      await http.delete(`/employee/peer-chat/${selected.chat_request_id}`);

      // 3. Clear local state immediately
      setConversations(prev =>
        prev.filter(c => c.chat_request_id !== selected.chat_request_id)
      );
      setSelected(null);
      setMessages([]);
      setShowEndChatModal(false);
      setEndReason('');

      // 4. Tell user and offer to request again
      setStatusMsg('✅ Chat ended. History sent to admin. You can request a new peer chat anytime.');
    } catch (error) {
      console.error('Failed to end chat:', error);
      setStatusMsg('Failed to end chat. Please try again.');
    }
    setEndingChat(false);
  };

  // ── Admin: open new chat modal ────────────────────────────────────────────
  const openNewChat = async () => {
    try {
      const [empRes, clientRes] = await Promise.all([
        http.get('/admin/employees'),
        http.get('/admin/clients'),
      ]);
      const emps = (empRes.data || []).map(e => ({
        id: e.user_id, name: e.full_name, role: 'employee', email: e.email,
      }));
      const clients = (clientRes.data || []).map(c => ({
        id: c.user_id, name: c.full_name, role: 'client', email: c.email,
      }));
      setAllUsers([...emps, ...clients]);
      setModalSearch('');
      setShowNewChat(true);
    } catch {}
  };

  const startChatWith = (u) => {
    const existing = conversations.find(c => c.user_id === u.id && !c.chat_request_id);
    if (existing) {
      setSelected(existing);
    } else {
      const fake = {
        user_id: u.id,
        participant_name: u.name,
        participant_type: u.role,
        last_message: 'New conversation',
        last_message_time: new Date(),
        unread_count: 0,
      };
      setConversations(prev => [fake, ...prev]);
      setSelected(fake);
    }
    setShowNewChat(false);
    setMessages([]);
  };

  // ── Employee: peer request ────────────────────────────────────────────────
  const openPeerRequest = async () => {
    try {
      const r = await http.get('/employee/colleagues');
      setPeerEmployees(r.data || []);
      setPeerTarget(null);
      setPeerReason('');
      setShowPeerRequest(true);
    } catch {}
  };

  const submitPeerRequest = async () => {
    if (!peerTarget) return;
    try {
      await http.post('/employee/chat-request', {
        requested_employee_id: peerTarget.id,
        reason: peerReason || 'Would like to discuss a work matter',
      });
      setStatusMsg('✅ Chat request sent! Awaiting admin approval.');
      setShowPeerRequest(false);
      setPeerTarget(null);
      setPeerReason('');
      loadConversations();
    } catch (err) {
      setStatusMsg(err.response?.data?.error || 'Request failed');
    }
  };

  // ── Employee: view my requests ────────────────────────────────────────────
  const loadPeerRequests = async () => {
    try {
      const r = await http.get('/employee/chat-requests');
      setPeerRequests(r.data || []);
      setShowPeerRequests(true);
    } catch {
      setPeerRequests([]);
      setShowPeerRequests(true);
    }
  };

  // ── Admin: pending + approved chat requests ───────────────────────────────
  const loadPendingRequests = async () => {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        http.get('/admin/chat-requests/pending'),
        http.get('/admin/chat-requests/approved').catch(() => ({ data: [] })),
      ]);
      setPendingRequests(pendingRes.data || []);
      setApprovedChats(approvedRes.data || []);
      setShowPendingRequests(true);
    } catch {
      setPendingRequests([]);
      setApprovedChats([]);
      setShowPendingRequests(true);
    }
  };

  const approveRequest = async (id) => {
    try {
      await http.post(`/admin/chat-request/${id}/approve`, {});
      setStatusMsg('✅ Chat request approved.');
      loadPendingRequests();
      loadConversations();
    } catch {
      setStatusMsg('Failed to approve request.');
    }
  };

  const rejectRequest = async (id) => {
    try {
      await http.post(`/admin/chat-request/${id}/reject`, { reason: 'Not approved' });
      loadPendingRequests();
    } catch {
      setStatusMsg('Failed to reject request.');
    }
  };

  const revokeChat = async (id) => {
    try {
      await http.post(`/admin/chat-request/${id}/revoke`, { reason: 'Revoked by admin' });
      setStatusMsg('Chat revoked.');
      loadPendingRequests();
      loadConversations();
    } catch {
      setStatusMsg('Failed to revoke chat.');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filteredConvos = conversations.filter(c =>
    c.participant_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const canEndChat = isEmployee && selected?.chat_request_id;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-140px)] min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Messages</h1>
          {conversations.reduce((s, c) => s + (c.unread_count || 0), 0) > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
              {conversations.reduce((s, c) => s + (c.unread_count || 0), 0)}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <>
              <button
                onClick={openNewChat}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Chat
              </button>
              <button
                onClick={loadPendingRequests}
                className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 transition-colors"
              >
                <Users className="w-4 h-4" /> Peer Requests
              </button>
              <button
                onClick={() => setShowChatHistory(true)}
                className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700"
              >
                <MessageSquare className="w-4 h-4" /> Chat History
              </button>
            </>
          )}
          {isEmployee && !frozen && (
            <>
              <button
                onClick={openPeerRequest}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <Users className="w-4 h-4" /> Request Peer Chat
              </button>
              <button
                onClick={loadPeerRequests}
                className="flex items-center gap-1 bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-slate-700 transition-colors"
              >
                <Clock className="w-4 h-4" /> My Requests
              </button>
            </>
          )}
        </div>
      </div>

      {frozen && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Chat has been temporarily disabled by the admin.</span>
        </div>
      )}

      {statusMsg && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-blue-700 text-sm">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-1 gap-0 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm min-h-0">
        {/* ── Sidebar ── */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvos.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No conversations yet</p>
                {isEmployee && !frozen && (
                  <button
                    onClick={openPeerRequest}
                    className="mt-3 text-xs text-blue-600 hover:underline"
                  >
                    Request a peer chat →
                  </button>
                )}
              </div>
            ) : filteredConvos.map((conv) => (
              <button
                key={`${conv.user_id}-${conv.chat_request_id || 'direct'}`}
                onClick={() => setSelected(conv)}
                className={`w-full text-left p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                  selected?.user_id === conv.user_id && selected?.chat_request_id === conv.chat_request_id
                    ? 'bg-blue-50 border-l-2 border-l-blue-500'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={conv.participant_name} role={conv.participant_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-800 truncate">{conv.participant_name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0 ml-1">{formatTime(conv.last_message_time)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLOR[conv.participant_type] || 'bg-slate-100 text-slate-500'}`}>
                        {ROLE_ICON[conv.participant_type]}
                        {conv.participant_type}
                      </span>
                      {conv.chat_request_id && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-1 rounded">peer</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">{conv.last_message}</p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50 flex-wrap">
                <Avatar name={selected.participant_name} role={selected.participant_type} size={10} />
                <div>
                  <h3 className="font-semibold text-slate-800">{selected.participant_name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ROLE_COLOR[selected.participant_type] || 'bg-slate-100 text-slate-500'}`}>
                      {ROLE_ICON[selected.participant_type]} {selected.participant_type}
                    </span>
                    {selected.chat_request_id && (
                      <span className="text-xs text-purple-600">Peer chat</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => loadMessages(selected)}
                  className="ml-auto p-2 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                </button>
                {/* End Chat button — only for employee peer chats */}
                {canEndChat && (
                  <button
                    onClick={() => setShowEndChatModal(true)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    End Chat & Report
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {loading ? (
                  <div className="text-center text-slate-400 py-8">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : messages.map((msg, i) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <div className="mr-2 flex-shrink-0 mt-1">
                          <Avatar name={msg.sender_name || msg.guest_name || 'U'} role={msg.sender_role || ''} size={7} />
                        </div>
                      )}
                      <div className="max-w-xs lg:max-w-md xl:max-w-lg">
                        {!isMine && (
                          <p className="text-xs text-slate-500 mb-1 ml-1">{msg.sender_name || msg.guest_name}</p>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm break-words ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                        }`}>
                          {msg.message}
                        </div>
                        <p className={`text-xs mt-1 ${isMine ? 'text-right text-slate-400' : 'text-slate-400 ml-1'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              {!frozen ? (
                <form onSubmit={sendMessage} className="p-4 border-t border-slate-200 bg-white">
                  <div className="flex gap-3">
                    <input
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder={`Message ${selected.participant_name}...`}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !text.trim()}
                      className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-slate-200 bg-amber-50 text-center text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Chat is frozen by admin.
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose from the left sidebar</p>
                {isAdmin && (
                  <button
                    onClick={openNewChat}
                    className="mt-4 flex items-center gap-2 mx-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" /> Start New Chat
                  </button>
                )}
                {isEmployee && !frozen && (
                  <button
                    onClick={openPeerRequest}
                    className="mt-4 flex items-center gap-2 mx-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Users className="w-4 h-4" /> Request Peer Chat
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* Admin: New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Start New Chat</h3>
              <button onClick={() => setShowNewChat(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 border-b">
              <input
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                placeholder="Search employees or clients..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {allUsers
                .filter(u => u.name?.toLowerCase().includes(modalSearch.toLowerCase()))
                .map(u => (
                  <button
                    key={u.id}
                    onClick={() => startChatWith(u)}
                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition-colors"
                  >
                    <Avatar name={u.name} role={u.role} />
                    <div>
                      <p className="font-medium text-sm text-slate-800">{u.name}</p>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLOR[u.role]}`}>{u.role}</span>
                        <span className="text-xs text-slate-400">{u.email}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Employee: Request Peer Chat Modal */}
      {showPeerRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Request Peer Chat</h3>
              <button onClick={() => setShowPeerRequest(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Colleague</label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  {peerEmployees.length === 0 ? (
                    <p className="text-sm text-slate-400 p-3 text-center">No colleagues found</p>
                  ) : peerEmployees.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setPeerTarget(e)}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100 last:border-0 transition-colors ${peerTarget?.id === e.id ? 'bg-blue-50' : ''}`}
                    >
                      <Avatar name={e.full_name} role="employee" size={7} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{e.full_name}</p>
                        <p className="text-xs text-slate-400">{e.employee_code} {e.department ? `• ${e.department}` : ''}</p>
                      </div>
                      {peerTarget?.id === e.id && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Chat</label>
                <textarea
                  value={peerReason}
                  onChange={e => setPeerReason(e.target.value)}
                  rows={3}
                  placeholder="Briefly describe why you need to chat..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={submitPeerRequest}
                  disabled={!peerTarget}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Send Request to Admin
                </button>
                <button
                  onClick={() => setShowPeerRequest(false)}
                  className="px-4 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee: My Requests Modal */}
      {showPeerRequests && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">My Chat Requests</h3>
              <button onClick={() => setShowPeerRequests(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {peerRequests.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <p>No requests yet</p>
                  <button
                    onClick={() => { setShowPeerRequests(false); openPeerRequest(); }}
                    className="mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Make a new request →
                  </button>
                </div>
              ) : peerRequests.map(r => (
                <div key={r.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-800">
                      {r.requester_user_id === user?.id
                        ? `You → ${r.requested_name}`
                        : `${r.requester_name} → You`}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.status === 'approved' ? 'bg-green-100 text-green-700' :
                      r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      r.status === 'ended' ? 'bg-slate-100 text-slate-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  {r.reason && <p className="text-xs text-slate-500 mb-2">{r.reason}</p>}

                  {/* Open chat if approved */}
                  {r.status === 'approved' && (
                    <button
                      onClick={() => {
                        const peerUserId = r.requester_user_id === user?.id
                          ? r.requested_user_id
                          : r.requester_user_id;
                        const peerName = r.requester_user_id === user?.id
                          ? r.requested_name
                          : r.requester_name;
                        const conv = {
                          user_id: peerUserId,
                          chat_request_id: r.id,
                          participant_name: peerName,
                          participant_type: 'employee',
                        };
                        setSelected(conv);
                        setShowPeerRequests(false);
                      }}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Open Chat <ChevronRight className="w-3 h-3" />
                    </button>
                  )}

                  {/* Allow new request if rejected or ended */}
                  {(r.status === 'rejected' || r.status === 'ended' || r.status === 'revoked') && (
                    <button
                      onClick={() => { setShowPeerRequests(false); openPeerRequest(); }}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      Request new chat <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Always show "New Request" button at bottom */}
            <div className="p-4 border-t">
              <button
                onClick={() => { setShowPeerRequests(false); openPeerRequest(); }}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Peer Chat Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Peer Chat Management Modal */}
      {showPendingRequests && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Peer Chat Management</h3>
              <button onClick={() => setShowPendingRequests(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Pending section */}
              {pendingRequests.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Pending Approval ({pendingRequests.length})
                  </h4>
                  <div className="space-y-3">
                    {pendingRequests.map(r => (
                      <div key={r.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-800">
                            {r.requester_name} → {r.requested_name}
                          </span>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">pending</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">
                          {r.requester_code} → {r.requested_code}
                        </p>
                        <p className="text-xs text-slate-500 mb-3">
                          Reason: {r.reason || 'Not specified'}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveRequest(r.id)}
                            className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => rejectRequest(r.id)}
                            className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active approved chats */}
              {approvedChats.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Active Peer Chats ({approvedChats.length})
                  </h4>
                  <div className="space-y-3">
                    {approvedChats.map(r => (
                      <div key={r.id} className="border border-green-200 bg-green-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-800">
                            {r.emp1_name} ↔ {r.emp2_name}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">active</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{r.emp1_code} · {r.emp2_code}</p>
                        <p className="text-xs text-slate-400 mb-3">{r.message_count || 0} messages exchanged</p>
                        <button
                          onClick={() => revokeChat(r.id)}
                          className="w-full bg-red-500 text-white py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Revoke Chat
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingRequests.length === 0 && approvedChats.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No pending requests or active peer chats</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={loadPendingRequests}
                className="w-full border border-slate-200 py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee: End Chat & Report Modal */}
      {showEndChatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <Flag className="w-5 h-5" />
                <h3 className="font-bold text-slate-800">End Peer Chat & Report</h3>
              </div>
              <button onClick={() => setShowEndChatModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium mb-1">What will happen:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Full chat history will be sent to admin</li>
                  <li>This conversation will be permanently deleted</li>
                  <li>You can request a new peer chat anytime after</li>
                </ul>
              </div>
              <p className="text-slate-700 text-sm">
                Ending chat with <strong>{selected?.participant_name}</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason (optional)</label>
                <textarea
                  value={endReason}
                  onChange={e => setEndReason(e.target.value)}
                  rows={2}
                  placeholder="Why are you ending this chat?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={endChatAndReport}
                  disabled={endingChat}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                >
                  {endingChat ? 'Ending...' : 'End Chat & Report'}
                </button>
                <button
                  onClick={() => setShowEndChatModal(false)}
                  className="px-4 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Chat History Modal (ended peer chats) */}
      {showChatHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Ended Peer Chats</h2>
              <button onClick={() => setShowChatHistory(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <AdminChatReports />
          </div>
        </div>
      )}
    </div>
  );
}