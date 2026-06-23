import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { Tag, Clock, Globe, CheckCircle, AlertCircle, ChevronDown, RefreshCw, Eye, Send, RotateCcw, Trash2, MessageSquare } from 'lucide-react';

const EMPLOYEE_STATUSES = ['assigned', 'in_progress', 'in_review', 'completed'];

const STATUS_COLORS = {
  assigned:    { pill: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  in_progress: { pill: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_review:   { pill: 'bg-purple-100 text-purple-700 border-purple-200' },
  completed:   { pill: 'bg-green-100 text-green-700 border-green-200' },
};

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener('scroll', h, true);
    return () => window.removeEventListener('scroll', h, true);
  }, [open]);

  const handleOpen = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }
    setOpen(o => !o);
  };

  const current = STATUS_COLORS[value]?.pill || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={handleOpen}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap ${current} hover:opacity-90`}
        style={{ minWidth: 130 }}>
        <span className="capitalize">{(value || '').replace(/_/g, ' ')}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1"
          style={{ top: pos.top, left: pos.left, width: Math.max(pos.width, 160), zIndex: 9999 }}>
          {EMPLOYEE_STATUSES.map(s => {
            const c = STATUS_COLORS[s]?.pill || 'bg-slate-100 text-slate-600 border-slate-200';
            return (
              <button key={s} type="button" onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${s === value ? 'bg-slate-50' : ''}`}>
                <span className={`px-2.5 py-0.5 rounded-full border font-semibold capitalize ${c}`}>{s.replace(/_/g, ' ')}</span>
                {s === value && <CheckCircle className="w-3.5 h-3.5 ml-auto text-slate-400 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

function ModalWrapper({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-base text-slate-800">{title}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export default function EmployeeProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Modals
  const [domainModal, setDomainModal] = useState(null);
  const [domainForm, setDomainForm] = useState({ domain_name: '', hosting_details: '' });
  const [viewModal, setViewModal] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);
  const [updateNote, setUpdateNote] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/employee/projects')
      .then(res => setProjects(res.data || []))
      .catch(() => toast('Failed to load projects', true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toast = (m, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m);
    setTimeout(() => { setMsg(''); setErr(''); }, 4000);
  };

  const updateStatus = async (assignmentId, status) => {
    try {
      await api.put(`/employee/projects/${assignmentId}/progress`, { status });
      toast('✅ Status updated.');
      load();
    } catch (e) { toast(e.response?.data?.error || 'Failed to update status', true); }
  };

  const submitWork = async (projectId) => {
    const notes = prompt('Describe the work you completed:');
    if (notes === null) return;
    try {
      await api.post(`/employee/projects/${projectId}/submit`, { notes: notes || 'Work completed' });
      toast('✅ Work submitted to admin.');
      load();
    } catch (e) { toast(e.response?.data?.error || 'Failed to submit', true); }
  };

  const submitDomain = async (e) => {
    e.preventDefault();
    if (!domainModal) return;
    try {
      await api.post(`/employee/projects/${domainModal}/submit-domain`, domainForm);
      setDomainModal(null);
      setDomainForm({ domain_name: '', hosting_details: '' });
      toast('✅ Domain sent to admin for review.');
      load();
    } catch (ex) { toast(ex.response?.data?.error || 'Failed to submit domain', true); }
  };

  const resubmitWork = async (projectId) => {
    const notes = prompt('Describe what you revised:');
    if (!notes) return;
    try {
      await api.post(`/employee/projects/${projectId}/resubmit`, { notes });
      toast('✅ Work resubmitted.');
      load();
    } catch (e) { toast(e.response?.data?.error || 'Failed to resubmit', true); }
  };

  const addUpdate = async () => {
    if (!updateNote.trim()) return toast('Enter an update note', true);
    try {
      await api.post(`/employee/projects/${updateModal}/updates`, { note: updateNote });
      setUpdateModal(null); setUpdateNote('');
      toast('✅ Update note saved.');
      load();
    } catch (e) { toast(e.response?.data?.error || 'Failed', true); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Projects</h1>
          <p className="text-slate-500 text-xs mt-0.5">View assigned projects · Update status · Submit domain</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2.5 rounded-xl">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl">{err}</div>}

      {/* Projects Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-14 text-slate-400 text-sm">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-14 text-slate-400 text-sm">No projects assigned yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase whitespace-nowrap">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase whitespace-nowrap">Tracking ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase whitespace-nowrap">Deadline</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase whitespace-nowrap" style={{ minWidth: 150 }}>Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, idx) => (
                  <tr key={p.id} className={`hover:bg-slate-50/60 transition-colors ${idx !== projects.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    {/* Project info */}
                    <td className="px-4 py-4" style={{ maxWidth: 240 }}>
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{p.title}</p>
                      {p.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{p.description}</p>}

                      {p.admin_feedback && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs font-semibold text-amber-700 mb-0.5">📋 Admin Feedback</p>
                          <p className="text-xs text-amber-800 leading-relaxed">{p.admin_feedback}</p>
                        </div>
                      )}
                      {p.domain_submitted_to_admin && !p.admin_domain_approved && !p.admin_feedback && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Awaiting admin review
                        </span>
                      )}
                      {p.admin_domain_approved && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Domain approved & sent
                        </span>
                      )}
                    </td>

                    {/* Tracking ID */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                        <Tag className="w-3 h-3" />{p.tracking_id}
                      </span>
                    </td>

                    {/* Deadline */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {p.deadline
                        ? <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border ${new Date(p.deadline) < new Date() ? 'text-red-600 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                            <Clock className="w-3 h-3" />{new Date(p.deadline).toLocaleDateString()}
                          </span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </td>

                    {/* Status dropdown */}
                    <td className="px-4 py-4">
                      <StatusDropdown value={p.status} onChange={s => updateStatus(p.id, s)} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* View details */}
                        <button type="button" onClick={() => setViewModal(p)}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition">
                          <Eye className="w-3 h-3" /> View
                        </button>

                        {/* Add update note */}
                        <button type="button" onClick={() => { setUpdateModal(p.project_id); setUpdateNote(''); }}
                          className="text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition border border-violet-200">
                          <MessageSquare className="w-3 h-3" /> Update
                        </button>

                        {/* Submit Work */}
                        {p.status !== 'completed' && !p.domain_submitted_to_admin && (
                          <button type="button" onClick={() => submitWork(p.project_id)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg font-semibold transition">
                            Submit Work
                          </button>
                        )}

                        {/* Send Domain */}
                        {p.status !== 'completed' && !p.domain_submitted_to_admin && (
                          <button type="button" onClick={() => { setDomainForm({ domain_name: '', hosting_details: '' }); setDomainModal(p.project_id); }}
                            className="text-xs border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition">
                            <Globe className="w-3 h-3" /> Send Domain
                          </button>
                        )}

                        {/* Resubmit after admin feedback */}
                        {p.admin_feedback && p.status !== 'completed' && (
                          <>
                            <button type="button" onClick={() => resubmitWork(p.project_id)}
                              className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" /> Resubmit
                            </button>
                            <button type="button" onClick={() => { setDomainForm({ domain_name: '', hosting_details: '' }); setDomainModal(p.project_id); }}
                              className="text-xs border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition">
                              <Globe className="w-3 h-3" /> Update Domain
                            </button>
                          </>
                        )}

                        {p.domain_submitted_to_admin && !p.admin_domain_approved && !p.admin_feedback && (
                          <span className="text-xs text-slate-400 italic">Pending review…</span>
                        )}

                        {p.status === 'completed' && !p.admin_feedback && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" /> Done
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── View Project Details Modal ── */}
      {viewModal && (
        <ModalWrapper onClose={() => setViewModal(null)} title={viewModal.title}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 font-semibold mb-1">Project Name</p>
                <p className="text-sm font-medium text-slate-900">{viewModal.title}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 font-semibold mb-1">Deadline</p>
                <p className="text-sm font-medium text-slate-900">{viewModal.deadline ? new Date(viewModal.deadline).toLocaleDateString() : '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 font-semibold mb-1">Tracking ID</p>
                <p className="text-sm font-mono text-slate-700">{viewModal.tracking_id}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 font-semibold mb-1">Status</p>
                <p className="text-sm capitalize font-medium text-slate-900">{(viewModal.status || '').replace(/_/g, ' ')}</p>
              </div>
            </div>
            {viewModal.description && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 font-semibold mb-1">Description</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewModal.description}</p>
              </div>
            )}
            {viewModal.admin_feedback && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Admin Feedback</p>
                <p className="text-sm text-amber-800">{viewModal.admin_feedback}</p>
              </div>
            )}
          </div>
        </ModalWrapper>
      )}

      {/* ── Add Update Modal ── */}
      {updateModal && (
        <ModalWrapper onClose={() => setUpdateModal(null)} title="Send Update to Admin">
          <p className="text-sm text-slate-500">Describe your progress, issues, or any updates for admin review.</p>
          <textarea
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
            placeholder="e.g. Completed homepage design, working on backend APIs…"
            rows={4}
            value={updateNote}
            onChange={e => setUpdateNote(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={addUpdate} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition">Send Update</button>
            <button type="button" onClick={() => setUpdateModal(null)} className="px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl transition">Cancel</button>
          </div>
        </ModalWrapper>
      )}

      {/* ── Domain Submit Modal ── */}
      {domainModal && (
        <ModalWrapper onClose={() => setDomainModal(null)} title="Submit Domain to Admin">
          <p className="text-sm text-slate-500">Enter the live domain URL. Admin will review and forward to the client.</p>
          <form onSubmit={submitDomain} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Domain URL <span className="text-red-500">*</span></label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                placeholder="https://example.com" required value={domainForm.domain_name}
                onChange={e => setDomainForm({ ...domainForm, domain_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hosting / DNS Notes <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                placeholder="e.g. Hosted on Vercel, DNS via Cloudflare…" rows={3} value={domainForm.hosting_details}
                onChange={e => setDomainForm({ ...domainForm, hosting_details: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition">Send to Admin</button>
              <button type="button" className="px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl transition" onClick={() => setDomainModal(null)}>Cancel</button>
            </div>
          </form>
        </ModalWrapper>
      )}
    </div>
  );
}