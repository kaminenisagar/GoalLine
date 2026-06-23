import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../../components/shared/StarRating';
import { Send, MessageCircle, RefreshCw, Download, Paperclip, Bell, BellOff, CheckCircle, Clock, AlertCircle, XCircle, Circle, ChevronRight } from 'lucide-react';

const TABS = ['projects', 'submit', 'payments', 'chat', 'feedback', 'complaints'];

function statusLabel(s) { return s ? s.replace(/_/g, ' ') : ''; }

function statusColor(s) {
  const map = {
    enquiry_received: '#f59e0b', project_started: '#3b82f6', development_in_progress: '#6366f1',
    testing_phase: '#8b5cf6', changes_requested: '#ef4444', domain_connected: '#06b6d4',
    project_completed: '#22c55e', final_delivery: '#16a34a', on_hold: '#94a3b8', cancelled: '#dc2626',
  };
  return map[s] || '#64748b';
}

// All possible statuses in order for the timeline
const STATUS_TIMELINE = [
  { key: 'enquiry_received', label: 'Enquiry Received' },
  { key: 'project_started', label: 'Project Started' },
  { key: 'development_in_progress', label: 'Development' },
  { key: 'testing_phase', label: 'Testing' },
  { key: 'changes_requested', label: 'Changes Requested' },
  { key: 'domain_connected', label: 'Domain Connected' },
  { key: 'final_delivery', label: 'Final Delivery' },
  { key: 'project_completed', label: 'Completed' },
];

function ProjectTimeline({ status }) {
  const currentIndex = STATUS_TIMELINE.findIndex(s => s.key === status);
  const isCancelled = status === 'cancelled';
  const isOnHold = status === 'on_hold';

  if (isCancelled || isOnHold) {
    return (
      <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: isCancelled ? '#fef2f2' : '#f8fafc', border: `1px solid ${isCancelled ? '#fecaca' : '#e2e8f0'}`, fontSize: '0.8125rem', color: isCancelled ? '#dc2626' : '#94a3b8', fontWeight: 600 }}>
        {isCancelled ? '❌ Project Cancelled' : '⏸ Project On Hold'}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</p>
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: '0.25rem', gap: 0 }}>
        {STATUS_TIMELINE.filter(s => s.key !== 'changes_requested').map((s, i, arr) => {
          const idx = STATUS_TIMELINE.findIndex(x => x.key === s.key);
          const done = currentIndex > idx;
          const active = currentIndex === idx;
          const isLast = i === arr.length - 1;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#22c55e' : active ? '#db2777' : '#e2e8f0',
                  border: active ? '2px solid #db2777' : 'none',
                  transition: 'all 0.3s',
                  boxShadow: active ? '0 0 0 3px #fce7f3' : 'none',
                }}>
                  {done ? <CheckCircle style={{ width: '1rem', height: '1rem', color: 'white' }} />
                    : active ? <Circle style={{ width: '0.75rem', height: '0.75rem', color: 'white', fill: 'white' }} />
                      : <Circle style={{ width: '0.75rem', height: '0.75rem', color: '#cbd5e1' }} />}
                </div>
                <span style={{ fontSize: '0.625rem', color: done ? '#22c55e' : active ? '#db2777' : '#94a3b8', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', maxWidth: '4rem', textAlign: 'center', lineHeight: 1.2 }}>{s.label}</span>
              </div>
              {!isLast && (
                <div style={{ width: '2rem', height: '2px', background: done ? '#22c55e' : '#e2e8f0', margin: '0 0.125rem', marginBottom: '1rem', flexShrink: 0, transition: 'background 0.3s' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Browser Notifications Hook ───────────────────────────────────────────────
function useNotifications() {
  const [permission, setPermission] = useState(Notification.permission);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const notify = useCallback((title, body, icon = '/favicon.ico') => {
    if (Notification.permission === 'granted') {
      const n = new Notification(title, { body, icon });
      setTimeout(() => n.close(), 6000);
    }
  }, []);

  return { permission, requestPermission, notify };
}

// ─── Invoice PDF Download ──────────────────────────────────────────────────────
async function downloadInvoicePDF(inv) {
  // Attempt server-side PDF download first
  try {
    const res = await api.get(`/client/invoices/${inv.id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${inv.invoice_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  } catch (_) {}

  // Fallback: generate a basic HTML invoice and print-to-PDF
  const pending = Number(inv.amount) - Number(inv.paid_total || 0);
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${inv.invoice_number}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 2rem; color: #1e293b; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    .brand { font-size: 1.75rem; font-weight: 800; color: #db2777; }
    .invoice-title { font-size: 1.25rem; font-weight: 700; color: #64748b; text-align: right; }
    .invoice-number { font-size: 0.875rem; color: #94a3b8; }
    hr { border: none; border-top: 2px solid #e2e8f0; margin: 1.5rem 0; }
    .row { display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 0.9375rem; }
    .label { color: #64748b; }
    .value { font-weight: 600; }
    .total-row { font-size: 1.125rem; font-weight: 700; border-top: 2px solid #e2e8f0; padding-top: 0.75rem; margin-top: 0.5rem; }
    .due { color: #dc2626; }
    .paid { color: #16a34a; }
    .footer { margin-top: 3rem; font-size: 0.8125rem; color: #94a3b8; text-align: center; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8125rem; font-weight: 700; background: ${inv.status === 'paid' ? '#f0fdf4' : '#fef2f2'}; color: ${inv.status === 'paid' ? '#16a34a' : '#dc2626'}; text-transform: capitalize; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">GoalLine</div>
      <div style="font-size:0.875rem;color:#64748b;margin-top:0.25rem;">Digital Solutions</div>
    </div>
    <div style="text-align:right">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">${inv.invoice_number}</div>
      <div style="margin-top:0.5rem"><span class="status-badge">${inv.status}</span></div>
    </div>
  </div>
  <hr/>
  <div class="row"><span class="label">Project</span><span class="value">${inv.project_title}</span></div>
  <div class="row"><span class="label">Invoice Date</span><span class="value">${new Date().toLocaleDateString()}</span></div>
  <hr/>
  <div class="row total-row"><span>Total Amount</span><span>₹${Number(inv.amount).toLocaleString()}</span></div>
  <div class="row"><span class="label">Amount Paid</span><span class="paid">₹${Number(inv.paid_total || 0).toLocaleString()}</span></div>
  ${pending > 0 ? `<div class="row"><span class="label">Amount Due</span><span class="due">₹${pending.toLocaleString()}</span></div>` : ''}
  <div class="footer">Thank you for choosing GoalLine · support@goalline.in</div>
</body>
</html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}

export default function ClientPortal() {
  const { user, logout } = useAuth();
  const { permission, requestPermission, notify } = useNotifications();
  const [tab, setTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitForm, setSubmitForm] = useState({ title: '', description: '', purpose: '', project_type: '', budget: '', deadline: '', company_name: '', is_self: false });
  const [submitMsg, setSubmitMsg] = useState({ type: '', text: '' });
  const [actionProject, setActionProject] = useState(null);
  const [approveForm, setApproveForm] = useState({ rating: 5, comment: '' });
  const [changeNotes, setChangeNotes] = useState('');
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ payment_method: 'upi', upi_id: '', amount: '' });
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, comment: '', project_id: '' });
  const [complaintForm, setComplaintForm] = useState({ subject: '', description: '', project_id: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [expandedProject, setExpandedProject] = useState(null);
  // Chat
  const [chats, setChats] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatFile, setChatFile] = useState(null);
  const [chatFilePreview, setChatFilePreview] = useState(null);
  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const prevChatCountRef = useRef(0);

  const loadProjects = () => api.get('/client/projects').then((r) => setProjects(r.data));
  const loadPayments = () => api.get('/client/payments').then((r) => setPayments(r.data));
  const loadChat = useCallback(() =>
    api.get('/client/chat/messages').then((r) => {
      const msgs = r.data || [];
      // Notify on new incoming messages
      if (msgs.length > prevChatCountRef.current) {
        const newMsgs = msgs.slice(prevChatCountRef.current);
        newMsgs.forEach(m => {
          if (m.sender_id !== user?.id) {
            notify('GoalLine', `${m.sender_name}: ${m.message}`);
          }
        });
      }
      prevChatCountRef.current = msgs.length;
      setChats(msgs);
    }).catch(() => {}), [notify, user?.id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadProjects(), loadPayments()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'chat') {
      loadChat();
      const iv = setInterval(loadChat, 5000);
      return () => clearInterval(iv);
    }
  }, [tab, loadChat]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  // File attachment handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setChatFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setChatFilePreview(null);
    }
  };

  const clearAttachment = () => {
    setChatFile(null);
    setChatFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    setSubmitMsg({ type: '', text: '' });
    try {
      const res = await api.post('/client/projects', {
        title: submitForm.title,
        description: [submitForm.description, submitForm.purpose ? `Purpose: ${submitForm.purpose}` : ''].filter(Boolean).join('\n'),
        project_type: submitForm.project_type,
        budget: submitForm.budget,
        deadline: submitForm.deadline,
      });
      setSubmitMsg({ type: 'success', text: `✅ Project submitted! Tracking ID: ${res.data.tracking_id}. Admin will review and get back to you.` });
      setSubmitForm({ title: '', description: '', purpose: '', project_type: '', budget: '', deadline: '', company_name: '', is_self: false });
      notify('GoalLine', `Project submitted! Tracking ID: ${res.data.tracking_id}`);
      await loadProjects();
      setTab('projects');
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.response?.data?.error || 'Failed to submit project' });
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/client/projects/${id}/approve`, approveForm);
      await api.post('/client/feedback', { rating: approveForm.rating, comment: approveForm.comment, project_id: id });
      setActionProject(null);
      setMsg({ type: 'success', text: '✅ Project approved and feedback saved.' });
      loadProjects();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Approval failed' }); }
  };

  const handleRequestChanges = async (id) => {
    try {
      await api.post(`/client/projects/${id}/request-changes`, { notes: changeNotes });
      setActionProject(null);
      setChangeNotes('');
      setMsg({ type: 'success', text: '✅ Change request sent. Admin will reassign and update you.' });
      loadProjects();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Request failed' }); }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payModal) return;
    try {
      await api.post(`/client/invoices/${payModal.id}/pay`, {
        ...payForm,
        amount: Number(payForm.amount) || Number(payModal.amount) - Number(payModal.paid_total || 0),
      });
      setPayModal(null);
      setPayForm({ payment_method: 'upi', upi_id: '', amount: '' });
      setMsg({ type: 'success', text: '✅ Payment submitted successfully! Admin has been notified.' });
      notify('GoalLine', 'Payment submitted successfully!');
      loadPayments();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Payment failed' }); }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      await api.post('/client/feedback', feedbackForm);
      setMsg({ type: 'success', text: '✅ Thank you for your feedback!' });
      setFeedbackForm({ rating: 5, comment: '', project_id: '' });
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Failed' }); }
  };

  const submitComplaint = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/client/complaint', complaintForm);
      setMsg({ type: 'success', text: `✅ Complaint submitted. Ticket ID: ${res.data.ticket_id}` });
      setComplaintForm({ subject: '', description: '', project_id: '' });
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Failed' }); }
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMsg.trim() && !chatFile) return;
    setChatSending(true);
    try {
      if (chatFile) {
        // Send with file attachment via FormData
        const fd = new FormData();
        if (chatMsg.trim()) fd.append('message', chatMsg.trim());
        fd.append('attachment', chatFile);
        await api.post('/client/chat', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/client/chat', { message: chatMsg.trim() });
      }
      setChatMsg('');
      clearAttachment();
      await loadChat();
    } catch { } finally { setChatSending(false); }
  };

  const tabStyle = (t) => ({
    padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize',
    background: tab === t ? '#db2777' : '#f1f5f9',
    color: tab === t ? 'white' : '#374151',
  });

  const cardStyle = { background: 'white', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '0.75rem' };
  const inputStyle = { width: '100%', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };
  const btnPrimary = { background: '#db2777', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' };
  const btnSecondary = { background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#f472b6' }}>GoalLine</span>
          <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Client Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Notification toggle */}
          <button
            type="button"
            title={permission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
            onClick={requestPermission}
            style={{ background: 'transparent', border: '1px solid #475569', color: permission === 'granted' ? '#f472b6' : '#94a3b8', borderRadius: '0.375rem', padding: '0.375rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
          >
            {permission === 'granted' ? <Bell style={{ width: '0.875rem', height: '0.875rem' }} /> : <BellOff style={{ width: '0.875rem', height: '0.875rem' }} />}
            {permission === 'granted' ? 'On' : 'Notify'}
          </button>
          <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>{user?.full_name}</span>
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '0.375rem', padding: '0.375rem 0.75rem', cursor: 'pointer', fontSize: '0.8125rem' }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Global message */}
        {msg.text && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4', color: msg.type === 'error' ? '#dc2626' : '#16a34a', border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{msg.text}</span>
            <button type="button" onClick={() => setMsg({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {TABS.map((t) => <button key={t} type="button" onClick={() => setTab(t)} style={tabStyle(t)}>{t === 'submit' ? '+ New Project' : t}</button>)}
        </div>

        {/* ── PROJECTS TAB ── */}
        {tab === 'projects' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>My Projects</h2>
            {loading && <p style={{ color: '#94a3b8' }}>Loading...</p>}
            {!loading && !projects.length && <div style={cardStyle}><p style={{ color: '#94a3b8', textAlign: 'center' }}>No projects yet. Submit one to get started!</p></div>}
            {projects.map((p) => (
              <div key={p.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.375rem', color: '#0f172a' }}>{p.title}</h3>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 0.5rem' }}>ID: {p.tracking_id}</p>
                    {p.description && <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 0.5rem' }}>{p.description}</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: statusColor(p.status) + '20', color: statusColor(p.status), border: `1px solid ${statusColor(p.status)}40`, textTransform: 'capitalize' }}>
                        {statusLabel(p.status)}
                      </span>
                      {p.budget && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Budget: ₹{Number(p.budget).toLocaleString()}</span>}
                      {p.deadline && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Deadline: {new Date(p.deadline).toLocaleDateString()}</span>}
                    </div>
                    {p.domain_name && (
                      <p style={{ fontSize: '0.8125rem', color: '#0891b2', marginTop: '0.5rem' }}>
                        🌐 Live: <a href={`https://${p.domain_name.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" style={{ color: '#0891b2' }}>{p.domain_name}</a>
                      </p>
                    )}

                    {/* Progress Timeline — toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedProject(expandedProject === p.id ? null : p.id)}
                      style={{ marginTop: '0.625rem', background: 'none', border: 'none', cursor: 'pointer', color: '#db2777', fontSize: '0.8125rem', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <ChevronRight style={{ width: '0.875rem', height: '0.875rem', transform: expandedProject === p.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      {expandedProject === p.id ? 'Hide Progress' : 'View Progress'}
                    </button>
                    {expandedProject === p.id && <ProjectTimeline status={p.status} />}
                  </div>
                  {p.status === 'final_delivery' && p.client_approval !== 'approved' && (
                    <button type="button" onClick={() => setActionProject(p)} style={btnPrimary}>Review & Approve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SUBMIT PROJECT TAB ── */}
        {tab === 'submit' && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Submit New Project</h2>
            {submitMsg.text && (
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', background: submitMsg.type === 'error' ? '#fef2f2' : '#f0fdf4', color: submitMsg.type === 'error' ? '#dc2626' : '#16a34a' }}>
                {submitMsg.text}
              </div>
            )}
            <form onSubmit={handleSubmitProject} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Project Title *</label>
                <input style={inputStyle} placeholder="e.g. E-Commerce Website" required value={submitForm.title} onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Project Description *</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Describe your project requirements..." required value={submitForm.description} onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Purpose / Goals</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="What do you want to achieve with this project?" value={submitForm.purpose} onChange={(e) => setSubmitForm({ ...submitForm, purpose: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Project Type</label>
                  <select style={inputStyle} value={submitForm.project_type} onChange={(e) => setSubmitForm({ ...submitForm, project_type: e.target.value })}>
                    <option value="">Select type...</option>
                    <option value="Website">Website</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="E-Commerce">E-Commerce</option>
                    <option value="Dashboard">Dashboard</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Budget (₹)</label>
                  <input style={inputStyle} type="number" placeholder="e.g. 50000" value={submitForm.budget} onChange={(e) => setSubmitForm({ ...submitForm, budget: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Deadline</label>
                <input style={inputStyle} type="date" value={submitForm.deadline} onChange={(e) => setSubmitForm({ ...submitForm, deadline: e.target.value })} />
              </div>
              <button type="submit" style={btnPrimary}>Submit Project Request</button>
            </form>
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
        {tab === 'payments' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Payments & Invoices</h2>
            {!payments.length && <div style={cardStyle}><p style={{ color: '#94a3b8', textAlign: 'center' }}>No invoices yet.</p></div>}
            {payments.map((inv) => {
              const pending = Number(inv.amount) - Number(inv.paid_total || 0);
              return (
                <div key={inv.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <p style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>{inv.project_title}</p>
                      <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0' }}>Invoice: {inv.invoice_number}</p>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem' }}>Total: <strong>₹{Number(inv.amount).toLocaleString()}</strong></span>
                        <span style={{ fontSize: '0.875rem', color: '#16a34a' }}>Paid: ₹{Number(inv.paid_total || 0).toLocaleString()}</span>
                        {pending > 0 && <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>Due: ₹{pending.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span style={{ padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: inv.status === 'paid' ? '#f0fdf4' : inv.status === 'partial' ? '#fff7ed' : '#fef2f2', color: inv.status === 'paid' ? '#16a34a' : inv.status === 'partial' ? '#d97706' : '#dc2626', textTransform: 'capitalize' }}>
                        {inv.status}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {/* ── Invoice PDF Download Button ── */}
                        <button
                          type="button"
                          onClick={() => downloadInvoicePDF(inv)}
                          style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                          title="Download Invoice PDF"
                        >
                          <Download style={{ width: '0.875rem', height: '0.875rem' }} /> PDF
                        </button>
                        {inv.status !== 'paid' && (
                          <button type="button" onClick={() => setPayModal(inv)} style={btnPrimary}>Pay Now</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {tab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageCircle style={{ width: '1.25rem', height: '1.25rem', color: '#db2777' }} /> Chat with GoalLine
              </h2>
              <button type="button" onClick={loadChat} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <RefreshCw style={{ width: '0.875rem', height: '0.875rem' }} /> Refresh
              </button>
            </div>
            <div style={{ flex: 1, background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {!chats.length && <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>No messages yet. Send a message to the GoalLine team!</p>}
                {chats.map((c, i) => {
                  const mine = c.sender_id === user?.id;
                  const isImage = c.attachment_url && /\.(jpe?g|png|gif|webp)$/i.test(c.attachment_url);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                      <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '0 0 0.25rem' }}>
                        {mine ? 'You' : c.sender_name}
                        {c.role && <span style={{ marginLeft: '0.25rem', fontSize: '0.625rem', fontWeight: 700, color: c.role === 'admin' ? '#db2777' : '#6366f1', textTransform: 'uppercase' }}>({c.role})</span>}
                      </p>
                      <div style={{ maxWidth: '70%', padding: '0.625rem 0.875rem', borderRadius: mine ? '1rem 1rem 0.25rem 1rem' : '0.25rem 1rem 1rem 1rem', background: mine ? '#db2777' : '#f1f5f9', color: mine ? 'white' : '#1e293b', fontSize: '0.875rem', wordBreak: 'break-word' }}>
                        {c.message && <p style={{ margin: 0 }}>{c.message}</p>}
                        {/* Attachment rendering */}
                        {c.attachment_url && (
                          <div style={{ marginTop: c.message ? '0.5rem' : 0 }}>
                            {isImage ? (
                              <img src={c.attachment_url} alt="attachment" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '0.5rem', display: 'block', cursor: 'pointer' }} onClick={() => window.open(c.attachment_url, '_blank')} />
                            ) : (
                              <a href={c.attachment_url} target="_blank" rel="noreferrer" style={{ color: mine ? 'white' : '#db2777', textDecoration: 'underline', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Paperclip style={{ width: '0.75rem', height: '0.75rem' }} />
                                {c.attachment_name || 'Attachment'}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '0.625rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* File preview strip */}
              {chatFile && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.5rem 0.75rem', background: '#fdf4ff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {chatFilePreview ? (
                    <img src={chatFilePreview} alt="preview" style={{ width: '2.5rem', height: '2.5rem', objectFit: 'cover', borderRadius: '0.375rem' }} />
                  ) : (
                    <div style={{ width: '2.5rem', height: '2.5rem', background: '#e9d5ff', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Paperclip style={{ width: '1rem', height: '1rem', color: '#7c3aed' }} />
                    </div>
                  )}
                  <span style={{ fontSize: '0.8125rem', color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatFile.name}</span>
                  <button type="button" onClick={clearAttachment} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.125rem', lineHeight: 1 }}>×</button>
                </div>
              )}

              {/* Chat input */}
              <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.75rem' }}>
                <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {/* Hidden file input */}
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" onChange={handleFileChange} style={{ display: 'none' }} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                    style={{ background: chatFile ? '#fdf4ff' : '#f1f5f9', border: chatFile ? '1px solid #d8b4fe' : '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: chatFile ? '#7c3aed' : '#64748b', flexShrink: 0 }}
                  >
                    <Paperclip style={{ width: '1rem', height: '1rem' }} />
                  </button>
                  <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Type a message..." style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', outline: 'none' }} disabled={chatSending} />
                  <button type="submit" disabled={chatSending || (!chatMsg.trim() && !chatFile)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '0.375rem', opacity: (!chatMsg.trim() && !chatFile) ? 0.5 : 1, flexShrink: 0 }}>
                    <Send style={{ width: '1rem', height: '1rem' }} /> Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── FEEDBACK TAB ── */}
        {tab === 'feedback' && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Give Feedback</h2>
            <form onSubmit={submitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.5rem' }}>Rating</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1,2,3,4,5].map((s) => (
                    <button key={s} type="button" onClick={() => setFeedbackForm({ ...feedbackForm, rating: s })} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: s <= feedbackForm.rating ? '#f59e0b' : '#e2e8f0' }}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Project</label>
                <select style={inputStyle} value={feedbackForm.project_id} onChange={(e) => setFeedbackForm({ ...feedbackForm, project_id: e.target.value })}>
                  <option value="">General feedback</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Comment *</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} required placeholder="Share your experience..." value={feedbackForm.comment} onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })} />
              </div>
              <button type="submit" style={btnPrimary}>Submit Feedback</button>
            </form>
          </div>
        )}

        {/* ── COMPLAINTS TAB ── */}
        {tab === 'complaints' && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Submit a Complaint</h2>
            <form onSubmit={submitComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Related Project</label>
                <select style={inputStyle} value={complaintForm.project_id} onChange={(e) => setComplaintForm({ ...complaintForm, project_id: e.target.value })}>
                  <option value="">Not project-specific</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Subject *</label>
                <input style={inputStyle} required placeholder="Brief subject" value={complaintForm.subject} onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem' }}>Description *</label>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} required placeholder="Describe the issue in detail..." value={complaintForm.description} onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })} />
              </div>
              <button type="submit" style={btnPrimary}>Submit Complaint</button>
            </form>
          </div>
        )}
      </div>

      {/* ── Payment Modal ── */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '420px', margin: '1rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Pay Invoice</h3>
            <p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
              {payModal.project_title} — Total: ₹{Number(payModal.amount).toLocaleString()}<br />
              <span style={{ color: '#dc2626' }}>Due: ₹{(Number(payModal.amount) - Number(payModal.paid_total || 0)).toLocaleString()}</span>
            </p>
            <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem', fontSize: '0.875rem', width: '100%' }} value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
              </select>
              <input style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }} type="number" placeholder="Amount (₹) *" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
              {payForm.payment_method === 'upi' && (
                <input style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }} placeholder="UPI ID or transaction ref *" required value={payForm.upi_id} onChange={(e) => setPayForm({ ...payForm, upi_id: e.target.value })} />
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" style={{ ...btnPrimary, flex: 1 }}>Confirm Payment</button>
                <button type="button" onClick={() => setPayModal(null)} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Approve/Change Modal ── */}
      {actionProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '480px', margin: '1rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>Review Project</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>{actionProject.title}</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {[1,2,3,4,5].map((s) => (
                <button key={s} type="button" onClick={() => setApproveForm({ ...approveForm, rating: s })} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: s <= approveForm.rating ? '#f59e0b' : '#e2e8f0' }}>★</button>
              ))}
            </div>
            <textarea style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem', fontSize: '0.875rem', width: '100%', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.75rem' }} rows={3} placeholder="Feedback comment..." value={approveForm.comment} onChange={(e) => setApproveForm({ ...approveForm, comment: e.target.value })} />
            <textarea style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem', fontSize: '0.875rem', width: '100%', resize: 'vertical', boxSizing: 'border-box', marginBottom: '1rem' }} rows={2} placeholder="Change request notes (if requesting changes)..." value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => handleApprove(actionProject.id)} style={{ ...btnPrimary, background: '#16a34a' }}>✅ Approve</button>
              <button type="button" onClick={() => handleRequestChanges(actionProject.id)} style={{ ...btnPrimary, background: '#d97706' }}>🔄 Request Changes</button>
              <button type="button" onClick={() => setActionProject(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}