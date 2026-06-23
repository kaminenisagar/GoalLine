import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, X, Pencil, Trash2, ToggleLeft, ToggleRight, Eye, Settings, Save } from 'lucide-react';

const DEFAULT_PERCENTAGES = {
  basic: 50,
  hra: 20,
  pf: 6,
  medical: 4,
  special: 20,
};

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', password: 'Employee@123',
  department: '', designation: '', joining_date: '',
  qualification: '', experience: '',
  ctc: '',
  manual_breakdown: false,
  basic_salary: '', hra: '', pf: '', medical_allowance: '', special_allowance: '', deductions: '',
};

function SalaryBreakdownModal({ employee, percentages, onClose }) {
  if (!employee) return null;
  const basic = Number(employee.basic_salary || 0);
  const hra = Number(employee.hra || 0);
  const pf = Number(employee.pf || 0);
  const medical = Number(employee.medical_allowance || 0);
  const special = Number(employee.special_allowance || 0);
  const deductions = Number(employee.deductions || 0);
  const totalEarnings = basic + hra + medical + special;
  const ctc = basic + hra + pf + medical + special;
  const netAnnual = totalEarnings - pf - deductions;
  const netMonthly = netAnnual / 12;

  const rows = [
    { label: 'Basic Salary', pct: percentages.basic, monthly: basic / 12, yearly: basic, color: '#2563eb', sign: '' },
    { label: 'HRA', pct: percentages.hra, monthly: hra / 12, yearly: hra, color: '#16a34a', sign: '+' },
    { label: 'PF (Employer Contribution)', pct: percentages.pf, monthly: pf / 12, yearly: pf, color: '#f59e0b', sign: '' },
    { label: 'Medical Allowance', pct: percentages.medical, monthly: medical / 12, yearly: medical, color: '#8b5cf6', sign: '+' },
    { label: 'Special Allowance', pct: percentages.special, monthly: special / 12, yearly: special, color: '#ec4899', sign: '+' },
  ];

  const fmt = (n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '680px',
        maxHeight: '92vh', overflow: 'auto',
        boxShadow: '0 32px 64px -12px rgba(0,0,0,0.4)',
        animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)'
      }}>
        <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#1e40af 0%,#7c3aed 100%)',
          padding: '24px 28px', borderRadius: '24px 24px 0 0', color: '#fff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.75, textTransform: 'uppercase' }}>Salary Breakdown</div>
              <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{employee.full_name}</div>
              <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '2px' }}>{employee.designation} · {employee.department}</div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: '36px', height: '36px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}><X size={18} /></button>
          </div>
          {/* CTC Pills */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            {[
              { label: 'Annual CTC', value: fmt(ctc), bg: 'rgba(255,255,255,0.2)' },
              { label: 'Monthly Net', value: fmt(netMonthly), bg: 'rgba(52,211,153,0.3)' },
            ].map(p => (
              <div key={p.label} style={{ background: p.bg, borderRadius: '12px', padding: '8px 16px', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{p.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: '24px 28px' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <thead>
              <tr>
                {['Component', 'Percentage', 'Monthly', 'Yearly'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Component' ? 'left' : 'right', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: '#f8fafc', borderRadius: '10px' }}>
                  <td style={{ padding: '14px', borderRadius: '10px 0 0 10px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.color, display: 'inline-block', flexShrink: 0 }} />
                    {r.label}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: r.color }}>{r.pct}%</td>
                  <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600, color: r.sign === '+' ? '#16a34a' : r.color }}>
                    {r.sign}{fmt(r.monthly)}
                  </td>
                  <td style={{ padding: '14px', borderRadius: '0 10px 10px 0', textAlign: 'right', fontWeight: 600 }}>{fmt(r.yearly)}</td>
                </tr>
              ))}

              {/* Separator */}
              <tr><td colSpan={4} style={{ padding: '6px 0' }}><div style={{ borderTop: '2px dashed #e2e8f0' }} /></td></tr>

              {/* Total Earnings */}
              <tr style={{ background: '#eff6ff' }}>
                <td style={{ padding: '14px', borderRadius: '10px 0 0 10px', fontWeight: 700, color: '#1e40af' }}>Total Earnings</td>
                <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>100%</td>
                <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>{fmt(totalEarnings / 12)}</td>
                <td style={{ padding: '14px', borderRadius: '0 10px 10px 0', textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>{fmt(totalEarnings)}</td>
              </tr>

              {/* PF Deduction */}
              <tr style={{ background: '#fff1f2' }}>
                <td style={{ padding: '14px', borderRadius: '10px 0 0 10px', fontWeight: 600, color: '#dc2626' }}>Less: PF (Employee Deduction)</td>
                <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>-{percentages.pf}%</td>
                <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{fmt(pf / 12)}</td>
                <td style={{ padding: '14px', borderRadius: '0 10px 10px 0', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>-{fmt(pf)}</td>
              </tr>

              {/* Net */}
              <tr style={{ background: 'linear-gradient(90deg,#1e40af,#7c3aed)', borderRadius: '10px' }}>
                <td style={{ padding: '16px 14px', borderRadius: '10px 0 0 10px', fontWeight: 800, color: '#fff', fontSize: '15px' }}>💰 Net Salary (Take Home)</td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>94%</td>
                <td style={{ padding: '16px 14px', textAlign: 'right', fontWeight: 800, color: '#fff', fontSize: '17px' }}>{fmt(netMonthly)}</td>
                <td style={{ padding: '16px 14px', borderRadius: '0 10px 10px 0', textAlign: 'right', fontWeight: 800, color: '#fff', fontSize: '15px' }}>{fmt(netAnnual)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0 28px 24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: 'linear-gradient(135deg,#1e40af,#7c3aed)', color: '#fff', border: 'none',
            borderRadius: '10px', padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: '14px'
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PercentageSettingsModal({ percentages, onSave, onClose }) {
  const [local, setLocal] = useState({ ...percentages });
  const total = local.basic + local.hra + local.pf + local.medical + local.special;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px'
    }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>⚙️ Salary Percentage Settings</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Configure how CTC is split across components</div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '24px 28px' }}>
          {[
            { key: 'basic', label: 'Basic Salary', color: '#2563eb' },
            { key: 'hra', label: 'HRA', color: '#16a34a' },
            { key: 'pf', label: 'PF (Employer)', color: '#f59e0b' },
            { key: 'medical', label: 'Medical Allowance', color: '#8b5cf6' },
            { key: 'special', label: 'Special Allowance', color: '#ec4899' },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{label}</label>
                <span style={{ fontSize: '13px', fontWeight: 700, color }}>{local[key]}%</span>
              </div>
              <input
                type="range" min="0" max="80" value={local[key]}
                onChange={e => setLocal(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: color }}
              />
            </div>
          ))}
          <div style={{
            padding: '12px 16px', borderRadius: '10px',
            background: total === 100 ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${total === 100 ? '#86efac' : '#fca5a5'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: total === 100 ? '#16a34a' : '#dc2626' }}>
              {total === 100 ? '✅ Total = 100%' : `⚠️ Total = ${total}% (must be 100%)`}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: total === 100 ? '#16a34a' : '#dc2626' }}>{total}%</span>
          </div>
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          <button
            disabled={total !== 100}
            onClick={() => { onSave(local); onClose(); }}
            style={{ padding: '9px 20px', background: total === 100 ? '#2563eb' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: total === 100 ? 'pointer' : 'not-allowed', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={14} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [useManualBreakdown, setUseManualBreakdown] = useState(false);
  const [percentages, setPercentages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salaryPercentages')) || DEFAULT_PERCENTAGES; }
    catch { return DEFAULT_PERCENTAGES; }
  });

  const load = () => api.get('/admin/employees').then(r => setEmployees(r.data));
  useEffect(() => { load(); }, []);

  const calcFromCTC = (ctc) => {
    const c = parseFloat(ctc) || 0;
    return {
      basic_salary: (c * percentages.basic / 100).toString(),
      hra: (c * percentages.hra / 100).toString(),
      pf: (c * percentages.pf / 100).toString(),
      medical_allowance: (c * percentages.medical / 100).toString(),
      special_allowance: (c * percentages.special / 100).toString(),
      deductions: (c * percentages.pf / 100).toString(),
    };
  };

  const netFromForm = (f) => {
    const earnings = Number(f.basic_salary || 0) + Number(f.hra || 0) +
      Number(f.medical_allowance || 0) + Number(f.special_allowance || 0);
    return earnings - Number(f.pf || 0) - Number(f.deductions || 0);
  };

  const handleCTCChange = (val) => {
    if (useManualBreakdown) { setForm(p => ({ ...p, ctc: val })); return; }
    setForm(p => ({ ...p, ctc: val, ...calcFromCTC(val) }));
  };

  const handleComponentChange = (field, value) => {
    const updated = { ...form, [field]: value };
    if (!useManualBreakdown) {
      const ctc = (parseFloat(updated.basic_salary) || 0) + (parseFloat(updated.hra) || 0) +
        (parseFloat(updated.pf) || 0) + (parseFloat(updated.medical_allowance) || 0) + (parseFloat(updated.special_allowance) || 0);
      updated.ctc = ctc.toString();
    }
    setForm(updated);
  };

  const toggleManual = () => {
    const nm = !useManualBreakdown;
    setUseManualBreakdown(nm);
    if (!nm) setForm(p => ({ ...p, manual_breakdown: false, ...calcFromCTC(p.ctc) }));
    else setForm(p => ({ ...p, manual_breakdown: true }));
  };

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setUseManualBreakdown(false); setShowForm(true); setMsg({ type: '', text: '' }); };

  const openEdit = (emp) => {
    setEditId(emp.id);
    const isManual = emp.manual_breakdown || false;
    setUseManualBreakdown(isManual);
    setForm({
      full_name: emp.full_name || '', email: emp.email || '', phone: emp.phone || '',
      password: '', department: emp.department || '', designation: emp.designation || '',
      joining_date: emp.joining_date ? emp.joining_date.slice(0, 10) : '',
      qualification: emp.qualification || '', experience: emp.experience ?? '',
      ctc: emp.ctc ?? '', manual_breakdown: isManual,
      basic_salary: emp.basic_salary ?? '', hra: emp.hra ?? '', pf: emp.pf ?? '',
      medical_allowance: emp.medical_allowance ?? '', special_allowance: emp.special_allowance ?? '',
      deductions: emp.deductions ?? '',
    });
    setShowForm(true); setMsg({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setMsg({ type: '', text: '' });
    const sd = {
      ...form,
      ctc: parseFloat(form.ctc) || 0,
      basic_salary: parseFloat(form.basic_salary) || 0,
      hra: parseFloat(form.hra) || 0,
      pf: parseFloat(form.pf) || 0,
      medical_allowance: parseFloat(form.medical_allowance) || 0,
      special_allowance: parseFloat(form.special_allowance) || 0,
      deductions: parseFloat(form.deductions) || 0,
      manual_breakdown: useManualBreakdown,
    };
    if (!useManualBreakdown) {
      sd.ctc = sd.basic_salary + sd.hra + sd.pf + sd.medical_allowance + sd.special_allowance;
    }
    try {
      if (editId) {
        await api.put(`/admin/employees/${editId}`, sd);
        setMsg({ type: 'success', text: '✅ Employee updated.' });
      } else {
        await api.post('/admin/employees', sd);
        setMsg({ type: 'success', text: '✅ Employee created. Default password: ' + (form.password || 'Employee@123') });
      }
      setShowForm(false); load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee permanently?')) return;
    await api.delete(`/admin/employees/${id}`); load();
  };

  const handleToggle = async (id) => {
    await api.patch(`/admin/employees/${id}/toggle`); load();
  };

  const savePercentages = (p) => {
    setPercentages(p);
    localStorage.setItem('salaryPercentages', JSON.stringify(p));
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const readOnlyStyle = { ...inputStyle, background: '#f8fafc', color: '#64748b' };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <style>{`.row-hover:hover{background:#f8fafc!important}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Employee Management</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>{employees.length} employees · Enter CTC to auto-generate salary breakdown</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowSettings(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '9px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
            <Settings size={15} /> % Settings
          </button>
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
            <Plus size={15} /> Add Employee
          </button>
        </div>
      </div>

      {msg.text && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4', color: msg.type === 'error' ? '#dc2626' : '#16a34a', border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#86efac'}`, fontWeight: 500, fontSize: '13px' }}>
          {msg.text}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Employee', 'Department', 'Designation', 'Annual CTC', 'Monthly Net', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Annual CTC' || h === 'Monthly Net' ? 'right' : 'left', fontWeight: 700, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const basic = Number(emp.basic_salary || 0);
                const hra = Number(emp.hra || 0);
                const pf = Number(emp.pf || 0);
                const medical = Number(emp.medical_allowance || 0);
                const special = Number(emp.special_allowance || 0);
                const deductions = Number(emp.deductions || 0);
                const ctc = basic + hra + pf + medical + special;
                const netAnnual = (basic + hra + medical + special) - pf - deductions;
                const netMonthly = netAnnual / 12;

                return (
                  <tr key={emp.id} className="row-hover" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp.full_name || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{emp.employee_code}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{emp.department || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{emp.designation || '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>₹{ctc.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>₹{netMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: emp.is_active ? '#dcfce7' : '#fee2e2', color: emp.is_active ? '#166534' : '#991b1b' }}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setSelectedEmployee(emp); setShowModal(true); }} title="View Breakdown" style={{ background: '#ede9fe', border: 'none', borderRadius: '7px', padding: '6px 9px', cursor: 'pointer', color: '#7c3aed' }}><Eye size={14} /></button>
                        <button onClick={() => openEdit(emp)} title="Edit" style={{ background: '#f1f5f9', border: 'none', borderRadius: '7px', padding: '6px 9px', cursor: 'pointer', color: '#475569' }}><Pencil size={14} /></button>
                        <button onClick={() => handleToggle(emp.id)} title={emp.is_active ? 'Deactivate' : 'Activate'} style={{ background: '#f1f5f9', border: 'none', borderRadius: '7px', padding: '6px 9px', cursor: 'pointer' }}>
                          {emp.is_active ? <ToggleRight size={14} color="#16a34a" /> : <ToggleLeft size={14} />}
                        </button>
                        <button onClick={() => handleDelete(emp.id)} title="Delete" style={{ background: '#fef2f2', border: 'none', borderRadius: '7px', padding: '6px 9px', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr><td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No employees yet. Click "Add Employee" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- MODALS ---- */}
      {showModal && <SalaryBreakdownModal employee={selectedEmployee} percentages={percentages} onClose={() => setShowModal(false)} />}
      {showSettings && <PercentageSettingsModal percentages={percentages} onSave={savePercentages} onClose={() => setShowSettings(false)} />}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '860px', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '24px 28px' }}>
              {/* Form Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>{editId ? '✏️ Edit Employee' : '➕ Add New Employee'}</h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>Fill CTC field to auto-calculate salary components using current % settings</p>
                </div>
                <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Mode Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#374151' }}>Salary Entry Mode</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {useManualBreakdown ? 'Enter each component manually' : `Auto-calculate from CTC (${percentages.basic}% Basic + ${percentages.hra}% HRA + ${percentages.pf}% PF + ${percentages.medical}% Medical + ${percentages.special}% Special)`}
                    </div>
                  </div>
                  <button type="button" onClick={toggleManual} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', background: useManualBreakdown ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                    {useManualBreakdown ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
                    {useManualBreakdown ? 'Manual Mode' : 'Auto Mode'}
                  </button>
                </div>

                {/* Personal Info */}
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '10px' }}>Personal Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '14px', marginBottom: '22px' }}>
                  {[
                    { label: 'Full Name *', key: 'full_name', type: 'text', required: true, ph: 'Full Name' },
                    { label: 'Email *', key: 'email', type: 'email', required: true, ph: 'Email' },
                    { label: 'Phone', key: 'phone', type: 'text', ph: 'Phone' },
                    ...(!editId ? [{ label: 'Password', key: 'password', type: 'password', ph: 'Password' }] : []),
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>{f.label}</label>
                      <input type={f.type} value={form[f.key]} placeholder={f.ph} required={f.required}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
                    </div>
                  ))}
                </div>

                {/* Job Details */}
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '10px' }}>Job Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '14px', marginBottom: '22px' }}>
                  {[
                    { label: 'Department', key: 'department', ph: 'e.g. Engineering' },
                    { label: 'Designation', key: 'designation', ph: 'e.g. Software Engineer' },
                    { label: 'Qualification', key: 'qualification', ph: 'e.g. B.Tech' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>{f.label}</label>
                      <input value={form[f.key]} placeholder={f.ph} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Joining Date</label>
                    <input type="date" value={form.joining_date} onChange={e => setForm(p => ({ ...p, joining_date: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Experience (yrs)</label>
                    <input type="number" step="0.5" value={form.experience} placeholder="Years" onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                {/* Salary */}
                <div style={{ background: '#f0fdf4', borderRadius: '14px', border: '1px solid #86efac', padding: '20px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.08em', marginBottom: '14px' }}>💰 Salary Structure</div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '5px' }}>
                      Annual CTC (₹) {!useManualBreakdown && <span style={{ color: '#10b981', fontSize: '10px', fontWeight: 500 }}>· auto-calculates all fields below</span>}
                    </label>
                    <input type="number" step="10000" placeholder="e.g. 600000" value={form.ctc}
                      onChange={e => handleCTCChange(e.target.value)}
                      style={{ ...inputStyle, fontWeight: 700, fontSize: '15px', border: '2px solid #86efac' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
                    {[
                      { key: 'basic_salary', label: `Basic (${percentages.basic}%)`, color: '#2563eb' },
                      { key: 'hra', label: `HRA (${percentages.hra}%)`, color: '#16a34a' },
                      { key: 'pf', label: `PF (${percentages.pf}%)`, color: '#f59e0b' },
                      { key: 'medical_allowance', label: `Medical (${percentages.medical}%)`, color: '#8b5cf6' },
                      { key: 'special_allowance', label: `Special (${percentages.special}%)`, color: '#ec4899' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: f.color, marginBottom: '4px' }}>{f.label}</label>
                        <input type="number" value={form[f.key]}
                          onChange={e => handleComponentChange(f.key, e.target.value)}
                          readOnly={!useManualBreakdown}
                          style={useManualBreakdown ? inputStyle : readOnlyStyle} />
                      </div>
                    ))}
                  </div>

                  {form.ctc > 0 && (
                    <div style={{ marginTop: '16px', background: '#fff', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', border: '1px solid #86efac' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Annual CTC</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e40af' }}>₹{Number(form.ctc).toLocaleString('en-IN')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Monthly Take Home</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>₹{(netFromForm(form) / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={{ background: 'linear-gradient(135deg,#1e40af,#7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 28px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                    {editId ? '✅ Update Employee' : '✅ Create Employee'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '10px', padding: '11px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}