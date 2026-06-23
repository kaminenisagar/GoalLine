import { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  Search, User, Globe, RefreshCw, CheckCircle, XCircle,
  Trash2, Send, Star, Eye, MessageSquare, Plus, Clock, Edit3
} from 'lucide-react';

const STATUS_META = {
  enquiry_received:        { label: 'Enquiry Received',     color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  project_started:         { label: 'Project Started',       color: 'bg-blue-100 text-blue-800 border-blue-200' },
  development_in_progress: { label: 'In Development',        color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  testing_phase:           { label: 'Testing / In Review',   color: 'bg-purple-100 text-purple-800 border-purple-200' },
  changes_requested:       { label: 'Changes Requested',     color: 'bg-red-100 text-red-800 border-red-200' },
  domain_connected:        { label: 'Domain Sent to Client', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  project_completed:       { label: 'Project Completed',     color: 'bg-green-100 text-green-800 border-green-200' },
  final_delivery:          { label: 'Final Delivery',        color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  on_hold:                 { label: 'On Hold',               color: 'bg-amber-100 text-amber-800 border-amber-200' },
  cancelled:               { label: 'Cancelled',             color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status?.replace(/_/g,' ') || '—', color: 'bg-slate-100 text-slate-500 border-slate-200' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${m.color}`}>{m.label}</span>;
}

function Modal({ title, subtitle, onClose, children, maxWidth = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-start px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-lg text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none mt-0.5 ml-4">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function inp(extra = '') {
  return `w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent bg-slate-50 ${extra}`;
}

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [viewModal, setViewModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [reassignModal, setReassignModal] = useState(null);
  const [domainReviewModal, setDomainReviewModal] = useState(null);
  const [sendDomainModal, setSendDomainModal] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [editStatusModal, setEditStatusModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [updateModal, setUpdateModal] = useState(null); // admin add update note

  const [assignEmpId, setAssignEmpId] = useState('');
  const [reassignForm, setReassignForm] = useState({ employee_id: '', changes_required: '', notes: '' });
  const [domainForm, setDomainForm] = useState({ domain_name: '', hosting_details: '' });
  const [domainReviewForm, setDomainReviewForm] = useState({ decision: '', feedback: '' });
  const [feedbackForm, setFeedbackForm] = useState({ feedback: '', rating: 5 });
  const [editStatusForm, setEditStatusForm] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([api.get('/admin/projects'), api.get('/admin/employees')]);
      setProjects(p.data || []);
      setEmployees(e.data || []);
    } catch (ex) {
      toast('Failed to load projects: ' + (ex.response?.data?.error || ex.message), true);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toast = (m, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m);
    setTimeout(() => { setMsg(''); setErr(''); }, 4500);
  };

  /* ─── Actions ─── */
  const doAssign = async () => {
    if (!assignEmpId) return;
    try {
      await api.post(`/admin/projects/${assignModal.id}/assign`, { employee_id: Number(assignEmpId) });
      await api.put(`/admin/projects/${assignModal.id}`, { status: 'project_started' });
      toast('✅ Project assigned. Employee can now see it in their dashboard.');
      setAssignModal(null); setAssignEmpId(''); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed to assign', true); }
  };

  const doReassign = async () => {
    const { employee_id, changes_required, notes } = reassignForm;
    if (!employee_id || !changes_required) return toast('Select employee and describe changes required', true);
    try {
      await api.post(`/admin/projects/${reassignModal.id}/reassign`, {
        employee_id: Number(employee_id),
        notes: `Changes Required:\n${changes_required}\n\nAdmin Notes: ${notes || '—'}`,
      });
      toast('✅ Project reassigned with change instructions.');
      setReassignModal(null); setReassignForm({ employee_id: '', changes_required: '', notes: '' }); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed to reassign', true); }
  };

  const doDomainReview = async () => {
    const { decision, feedback } = domainReviewForm;
    if (!decision) return toast('Select a decision', true);
    if (!feedback.trim()) return toast('Feedback is required', true);
    try {
      if (decision === 'approve') {
        await api.put(`/admin/projects/${domainReviewModal.id}`, { status: 'domain_connected', admin_notes: feedback });
        toast('✅ Domain approved. Sending to client…');
        const prev = domainReviewModal;
        setDomainReviewModal(null);
        setSendDomainModal(prev);
        setDomainForm({ domain_name: prev.employee_domain_draft || '', hosting_details: prev.employee_domain_hosting || '' });
      } else {
        const prev = domainReviewModal;
        setDomainReviewModal(null);
        setReassignModal(prev);
        setReassignForm({ employee_id: '', changes_required: feedback, notes: 'Domain review failed — please fix and resubmit.' });
        toast('Opening reassign form with domain feedback pre-filled.');
      }
      load();
    } catch (e) { toast(e.response?.data?.error || 'Failed', true); }
  };

  const doSendDomain = async () => {
    if (!domainForm.domain_name.trim()) return toast('Domain name is required', true);
    try {
      await api.post(`/admin/projects/${sendDomainModal.id}/send-domain`, domainForm);
      toast('✅ Domain sent to client. Client will review and approve or request changes.');
      setSendDomainModal(null); setDomainForm({ domain_name: '', hosting_details: '' }); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed to send domain', true); }
  };

  const doSendFeedback = async () => {
    if (!feedbackForm.feedback.trim()) return toast('Feedback is required', true);
    try {
      await api.post(`/admin/projects/${feedbackModal.id}/final-feedback`, { ...feedbackForm, send_to_client: false });
      toast('✅ Feedback sent to employee.');
      setFeedbackModal(null); setFeedbackForm({ feedback: '', rating: 5 }); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed', true); }
  };

  const doEditStatus = async () => {
    if (!editStatusForm) return toast('Select a status', true);
    try {
      await api.put(`/admin/projects/${editStatusModal.id}`, { status: editStatusForm });
      toast('✅ Status updated.');
      setEditStatusModal(null); setEditStatusForm(''); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed', true); }
  };

  const doDeleteProject = async () => {
    try {
      await api.delete(`/admin/projects/${deleteConfirm.id}`);
      toast('🗑 Project deleted.');
      setDeleteConfirm(null); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed to delete', true); }
  };

  const doAddUpdate = async () => {
    if (!updateNote.trim()) return toast('Enter update note', true);
    try {
      await api.post(`/admin/projects/${updateModal.id}/updates`, { note: updateNote });
      toast('✅ Update note added.');
      setUpdateModal(null); setUpdateNote(''); load();
    } catch (e) { toast(e.response?.data?.error || 'Failed', true); }
  };

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.title?.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q) || p.tracking_id?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Project Management</h1>
          <p className="text-slate-500 text-xs mt-0.5">Assign · Track · Review Domains · Send to Clients</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2.5 rounded-xl">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl">{err}</div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={inp('pl-9 py-2')} placeholder="Search by name, client, tracking ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={inp('w-48')} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-14 text-slate-400 text-sm">Loading projects…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-slate-400 text-sm">No projects found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Tracking ID', 'Project', 'Client', 'Employee', 'Status', 'Actions'].map(h =>
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{p.tracking_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 max-w-[200px] truncate">{p.title}</div>
                      {p.budget && <div className="text-xs text-slate-400">₹{Number(p.budget).toLocaleString()}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.client_name || '—'}</td>
                    <td className="px-4 py-3">
                      {p.assigned_employee
                        ? <span className="flex items-center gap-1 text-slate-700 text-xs"><User className="w-3 h-3 text-slate-400" />{p.assigned_employee}</span>
                        : <span className="text-slate-400 text-xs">Not assigned</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {/* View */}
                        <button onClick={() => setViewModal(p)} className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1 font-medium">
                          <Eye className="w-3 h-3" /> View
                        </button>

                        {/* Edit Status */}
                        <button onClick={() => { setEditStatusModal(p); setEditStatusForm(p.status); }} className="text-xs px-2 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 flex items-center gap-1 font-medium">
                          <Edit3 className="w-3 h-3" /> Status
                        </button>

                        {/* Add Update */}
                        <button onClick={() => setUpdateModal(p)} className="text-xs px-2 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 flex items-center gap-1 font-medium">
                          <MessageSquare className="w-3 h-3" /> Update
                        </button>

                        {/* Assign */}
                        {!p.assigned_employee && (
                          <button onClick={() => { setAssignModal(p); setAssignEmpId(''); }} className="text-xs px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 font-medium">
                            <User className="w-3 h-3" /> Assign
                          </button>
                        )}

                        {/* Reassign */}
                        {p.assigned_employee && !['project_completed','final_delivery','cancelled'].includes(p.status) && (
                          <button onClick={() => { setReassignModal(p); setReassignForm({ employee_id: '', changes_required: '', notes: '' }); }} className="text-xs px-2 py-1 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 flex items-center gap-1 font-medium">
                            <RefreshCw className="w-3 h-3" /> Reassign
                          </button>
                        )}

                        {/* Review Domain */}
                        {p.employee_domain_draft && !p.domain_name && (
                          <button onClick={() => setDomainReviewModal(p)} className="text-xs px-2 py-1 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-1 font-medium">
                            <Globe className="w-3 h-3" /> Review Domain
                          </button>
                        )}

                        {/* Send Domain to Client */}
                        {(p.status === 'domain_connected' || p.domain_name) && !p.domain_sent_at && (
                          <button onClick={() => { setSendDomainModal(p); setDomainForm({ domain_name: p.domain_name || p.employee_domain_draft || '', hosting_details: p.hosting_details || '' }); }} className="text-xs px-2 py-1 rounded-lg bg-cyan-100 text-cyan-700 hover:bg-cyan-200 flex items-center gap-1 font-medium">
                            <Send className="w-3 h-3" /> Send to Client
                          </button>
                        )}

                        {/* Feedback */}
                        {['project_completed','final_delivery'].includes(p.status) && (
                          <button onClick={() => setFeedbackModal(p)} className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1 font-medium">
                            <Star className="w-3 h-3" /> Feedback
                          </button>
                        )}

                        {/* Delete */}
                        <button onClick={() => setDeleteConfirm(p)} className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 font-medium">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── VIEW PROJECT ─── */}
      {viewModal && (
        <Modal title={viewModal.title} subtitle={`Tracking: ${viewModal.tracking_id}`} onClose={() => setViewModal(null)} maxWidth="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Client', value: viewModal.client_name || '—' },
                { label: 'Status', value: <StatusBadge status={viewModal.status} /> },
                { label: 'Budget', value: viewModal.budget ? `₹${Number(viewModal.budget).toLocaleString()}` : '—' },
                { label: 'Deadline', value: viewModal.deadline ? new Date(viewModal.deadline).toLocaleDateString() : '—' },
                { label: 'Assigned To', value: viewModal.assigned_employee || 'Not assigned' },
                { label: 'Client Approval', value: <span className="capitalize">{viewModal.client_approval || 'Pending'}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{label}</p>
                  <div className="font-medium text-slate-800 text-sm">{value}</div>
                </div>
              ))}
            </div>
            {viewModal.description && (
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">{viewModal.description}</p>
              </div>
            )}
            {viewModal.employee_domain_draft && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-1">Employee Submitted Domain</p>
                <p className="font-mono text-sm text-purple-900">{viewModal.employee_domain_draft}</p>
              </div>
            )}
            {viewModal.domain_name && (
              <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3">
                <p className="text-xs text-cyan-700 font-semibold uppercase tracking-wide mb-1">Domain Sent to Client</p>
                <p className="font-mono text-sm text-cyan-900">{viewModal.domain_name}</p>
              </div>
            )}
            {viewModal.client_change_request && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs text-red-700 font-semibold uppercase tracking-wide mb-1">Client Requested Changes</p>
                <p className="text-sm text-red-800">{viewModal.client_change_request}</p>
              </div>
            )}
            {viewModal.admin_notes && (
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Admin Notes</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">{viewModal.admin_notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ─── EDIT STATUS ─── */}
      {editStatusModal && (
        <Modal title="Edit Project Status" subtitle={`Project: ${editStatusModal.title}`} onClose={() => setEditStatusModal(null)}>
          <div className="space-y-4">
            <Field label="New Status">
              <select className={inp()} value={editStatusForm} onChange={e => setEditStatusForm(e.target.value)}>
                <option value="">— Select status —</option>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={doEditStatus} className="flex-1 bg-sky-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-sky-700 transition">Update Status</button>
              <button onClick={() => setEditStatusModal(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── ADD UPDATE NOTE ─── */}
      {updateModal && (
        <Modal title="Add Project Update" subtitle={`Project: ${updateModal.title}`} onClose={() => setUpdateModal(null)}>
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-sm text-violet-800">
              This note will be visible to employees and admin as a project update log.
            </div>
            <Field label="Update Note *">
              <textarea className={inp('h-24 resize-none')} placeholder="Describe what was updated, changed, or communicated…"
                value={updateNote} onChange={e => setUpdateNote(e.target.value)} />
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={doAddUpdate} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-700 transition">Save Update</button>
              <button onClick={() => setUpdateModal(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── ASSIGN EMPLOYEE ─── */}
      {assignModal && (
        <Modal title="Assign Project to Employee" subtitle={`Project: ${assignModal.title}`} onClose={() => setAssignModal(null)}>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
              Once assigned, the employee will see this project in their dashboard and can update status, submit work notes, and submit the domain.
            </div>
            <Field label="Select Employee">
              <select className={inp()} value={assignEmpId} onChange={e => setAssignEmpId(e.target.value)}>
                <option value="">— Choose an employee —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code || e.department || 'Employee'})</option>)}
              </select>
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={doAssign} disabled={!assignEmpId} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 transition">Assign Project</button>
              <button onClick={() => setAssignModal(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── REASSIGN ─── */}
      {reassignModal && (
        <Modal title="Reassign Project" subtitle={`Project: ${reassignModal.title}`} onClose={() => setReassignModal(null)}>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-sm text-orange-800">
              The employee will be notified with your change instructions and must resubmit work.
            </div>
            <Field label="Assign To Employee">
              <select className={inp()} value={reassignForm.employee_id} onChange={e => setReassignForm({ ...reassignForm, employee_id: e.target.value })}>
                <option value="">— Select employee —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.department || 'Employee'})</option>)}
              </select>
            </Field>
            <Field label="Changes Required *">
              <textarea className={inp('h-24 resize-none')} placeholder="Describe exactly what needs to be changed or fixed…"
                value={reassignForm.changes_required} onChange={e => setReassignForm({ ...reassignForm, changes_required: e.target.value })} />
            </Field>
            <Field label="Additional Notes (optional)">
              <textarea className={inp('h-16 resize-none')} placeholder="Extra context or deadline reminders…"
                value={reassignForm.notes} onChange={e => setReassignForm({ ...reassignForm, notes: e.target.value })} />
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={doReassign} className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-700 transition">Reassign with Instructions</button>
              <button onClick={() => setReassignModal(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── REVIEW DOMAIN ─── */}
      {domainReviewModal && (
        <Modal title="Review Employee's Domain" subtitle={`Project: ${domainReviewModal.title}`} onClose={() => setDomainReviewModal(null)}>
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
              <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-1">Submitted Domain</p>
              <p className="font-mono text-base text-purple-900 font-bold">{domainReviewModal.employee_domain_draft}</p>
              {domainReviewModal.employee_domain_hosting && <p className="text-sm text-purple-700 mt-1">{domainReviewModal.employee_domain_hosting}</p>}
            </div>
            <Field label="Decision *">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDomainReviewForm({ ...domainReviewForm, decision: 'approve' })}
                  className={`py-2.5 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-1.5 transition ${domainReviewForm.decision === 'approve' ? 'bg-green-600 text-white border-green-600' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => setDomainReviewForm({ ...domainReviewForm, decision: 'reject' })}
                  className={`py-2.5 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-1.5 transition ${domainReviewForm.decision === 'reject' ? 'bg-red-600 text-white border-red-600' : 'border-red-200 text-red-700 hover:bg-red-50'}`}>
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </Field>
            <Field label={domainReviewForm.decision === 'approve' ? 'Approval Notes' : 'Changes Required *'}>
              <textarea className={inp('h-20 resize-none')}
                placeholder={domainReviewForm.decision === 'approve' ? 'Great work! Requirements met…' : 'What needs to be fixed…'}
                value={domainReviewForm.feedback} onChange={e => setDomainReviewForm({ ...domainReviewForm, feedback: e.target.value })} />
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={doDomainReview} disabled={!domainReviewForm.decision || !domainReviewForm.feedback}
                className="flex-1 bg-pink-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-pink-700 disabled:opacity-40 transition">Submit Review</button>
              <button onClick={() => setDomainReviewModal(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── SEND DOMAIN TO CLIENT ─── */}
      {sendDomainModal && (
        <Modal title="Send Domain to Client" subtitle={`Project: ${sendDomainModal.title}`} onClose={() => setSendDomainModal(null)}>
          <div className="space-y-4">
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3 text-sm text-cyan-800">
              Client will see this domain in their portal and can approve or request changes.
            </div>
            <Field label="Domain / Live URL *">
              <input type="text" className={inp()} placeholder="https://yourclient.com"
                value={domainForm.domain_name} onChange={e => setDomainForm({ ...domainForm, domain_name: e.target.value })} />
            </Field>
            <Field label="Hosting Details (optional)">
              <textarea className={inp('h-20 resize-none')} placeholder="cPanel credentials, server, support contact…"
                value={domainForm.hosting_details} onChange={e => setDomainForm({ ...domainForm, hosting_details: e.target.value })} />
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={doSendDomain} className="flex-1 bg-cyan-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-cyan-700 transition">Send to Client</button>
              <button onClick={() => setSendDomainModal(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── FEEDBACK TO EMPLOYEE ─── */}
      {feedbackModal && (
        <Modal title="Send Final Feedback" subtitle={`Project: ${feedbackModal.title}`} onClose={() => setFeedbackModal(null)}>
          <div className="space-y-4">
            <Field label="Performance Rating">
              <div className="flex gap-2 items-center">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setFeedbackForm({ ...feedbackForm, rating: n })}
                    className={`w-9 h-9 rounded-full font-bold text-sm transition ${feedbackForm.rating >= n ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-500'}`}>{n}</button>
                ))}
                <span className="text-sm text-slate-500 ml-1">{feedbackForm.rating}/5</span>
              </div>
            </Field>
            <Field label="Written Feedback *">
              <textarea className={inp('h-28 resize-none')} placeholder="Describe performance, quality, communication, delivery…"
                value={feedbackForm.feedback} onChange={e => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })} />
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={doSendFeedback} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition">Send Feedback</button>
              <button onClick={() => setFeedbackModal(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── DELETE CONFIRM ─── */}
      {deleteConfirm && (
        <Modal title="Confirm Delete" onClose={() => setDeleteConfirm(null)}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-800">
              Are you sure you want to delete <strong>{deleteConfirm.title}</strong>? This action cannot be undone and will remove all associated data.
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={doDeleteProject} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition">Delete Project</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}