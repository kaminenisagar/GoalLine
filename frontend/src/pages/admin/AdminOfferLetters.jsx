import { useEffect, useState } from 'react';
import api from '../../services/api';
import { FileText, Plus, Trash2, Download, X, User, CheckCircle, AlertCircle, Eye, Send } from 'lucide-react';

const STATUS_STYLE = {
  sent:     { bg: '#dbeafe', color: '#1d4ed8' },
  accepted: { bg: '#dcfce7', color: '#166534' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
  draft:    { bg: '#f1f5f9', color: '#475569' },
  pending:  { bg: '#fef3c7', color: '#92400e' },
};

const BLANK = {
  employee_id: '',
  candidate_name: '', candidate_email: '',
  designation: '', department: '',
  ctc: '', basic_salary: '', hra: '', pf: '',
  medical_allowance: '', special_allowance: '', deductions: '',
  joining_date: '', content: '',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const normalizeAdminOfferLetter = (letter) => {
  const basic = Number(letter.basic_salary || 0);
  const hra = Number(letter.hra || 0);
  const pf = Number(letter.pf || 0);
  const medical = Number(letter.medical_allowance || 0);
  const special = Number(letter.special_allowance || 0);
  const explicitAllowances = Number(letter.allowances || 0);
  const allowances = explicitAllowances > 0 ? explicitAllowances : hra + medical + special;
  const deductions = Number(letter.deductions || 0);
  const ctc = Number(letter.ctc || 0) || (basic + hra + pf + medical + special);

  return {
    ...letter,
    basic_salary: basic,
    hra,
    pf,
    medical_allowance: medical,
    special_allowance: special,
    allowances,
    deductions,
    ctc,
    status: letter.status || 'pending',
    candidate_name: letter.candidate_name || letter.full_name || letter.email || '',
    company_name: letter.company_name || 'GoalLine',
  };
};

const getLetterValues = (letter) => {
  const basic = Number(letter.basic_salary || 0);
  const hra = Number(letter.hra || 0);
  const pf = Number(letter.pf || 0);
  const medical = Number(letter.medical_allowance || 0);
  const special = Number(letter.special_allowance || 0);
  const allowances = Number(letter.allowances ?? (hra + medical + special));
  const deductions = Number(letter.deductions || 0);
  const ctc = Number(letter.ctc || basic + hra + pf + medical + special);
  const grossAnnual = basic + hra + medical + special;
  const netAnnual = ctc - deductions;
  return {
    ctc,
    netMonthly: netAnnual / 12,
    grossAnnual,
    netAnnual,
    deductions,
    totalAllowances: allowances,
  };
};

function generateOfferHTML(letter) {
  const company = letter.company_name || 'GoalLine';
  const basic = Number(letter.basic_salary || 0);
  const hra = Number(letter.hra || letter.allowances || 0);
  const pf = Number(letter.pf || 0);
  const medical = Number(letter.medical_allowance || 0);
  const special = Number(letter.special_allowance || 0);
  const deductions = Number(letter.deductions || 0);

  const grossAnnual = basic + hra + medical + special;
  const ctcAnnual = basic + hra + pf + medical + special;
  const netAnnual = ctcAnnual - deductions;

  const fmt = (n, monthly = false) => {
    const v = monthly ? n / 12 : n;
    return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const joining = letter.joining_date
    ? new Date(letter.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'To be mutually agreed';
  const issued = new Date(letter.created_at || new Date()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const ref = `OL-${String(letter.id || '0001').padStart(4, '0')}-${new Date().getFullYear()}`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>Offer Letter – ${letter.candidate_name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#fff;color:#1e293b;font-size:14px;line-height:1.7}
.page{max-width:760px;margin:0 auto;padding:48px 56px}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e40af;padding-bottom:20px;margin-bottom:28px}
.brand-name{font-size:24px;font-weight:800;color:#1e40af;letter-spacing:-0.5px}
.brand-tag{font-size:11px;color:#64748b;margin-top:3px}
.co-info{text-align:right;font-size:12px;color:#64748b;line-height:1.9}
.meta{display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:24px}
.subject{background:linear-gradient(135deg,#eff6ff,#f0f9ff);border-left:5px solid #1e40af;padding:14px 18px;border-radius:0 10px 10px 0;margin-bottom:28px}
.subject h2{font-size:17px;font-weight:800;color:#1e40af;letter-spacing:-0.3px}
.subject p{font-size:13px;color:#3b82f6;margin-top:3px}
p.body{margin-bottom:16px;color:#334155}
.tbl{width:100%;border-collapse:collapse;margin:20px 0;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}
.tbl th{background:#f1f5f9;padding:10px 14px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;text-align:left}
.tbl td{padding:12px 14px;border-top:1px solid #f1f5f9;color:#1e293b;font-weight:500}
.tbl tr:nth-child(even) td{background:#f8fafc}
.sal{width:100%;border-collapse:collapse;margin:16px 0;border-radius:10px;overflow:hidden;border:1px solid #dcfce7}
.sal th{background:#f0fdf4;padding:10px 14px;font-size:11px;font-weight:700;color:#166534;text-align:left}
.sal td{padding:10px 14px;border-top:1px solid #f0fdf4;font-size:13px}
.sal .gross{background:#f0fdf4;font-weight:700}
.sal .ded td{color:#dc2626}
.sal .net{background:linear-gradient(90deg,#166534,#065f46)}
.sal .net td{color:#fff;font-weight:800;font-size:14px}
.accept{background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:18px 22px;margin:28px 0}
.accept h3{color:#166534;font-size:14px;font-weight:800;margin-bottom:8px}
.accept p{color:#15803d;font-size:13px}
.sigs{display:flex;justify-content:space-between;margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0}
.sig{text-align:center;min-width:180px}
.sig-line{border-top:1.5px solid #94a3b8;width:180px;margin:40px auto 8px}
.sig-name{font-size:13px;font-weight:700;color:#1e293b}
.sig-lbl{font-size:11px;color:#64748b}
.foot{margin-top:32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:14px}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head>
<body><div class="page">
<div class="header">
  <div><div class="brand-name">${company}</div><div class="brand-tag">Enterprise Workforce Solutions</div></div>
  <div class="co-info">hr@goalline.com<br/>+91-9876543210</div>
</div>
<div class="meta"><span><strong>Date:</strong> ${issued}</span><span><strong>Ref:</strong> ${ref}</span></div>
<div class="subject"><h2>OFFER OF EMPLOYMENT</h2><p>Congratulations! We are delighted to extend this offer.</p></div>
<p class="body">Dear <strong>${letter.candidate_name}</strong>,</p>
<p class="body">We are pleased to offer you the position of <strong>${letter.designation}</strong>${letter.department ? ` in the <strong>${letter.department}</strong> department` : ''} at <strong>${company}</strong>.</p>
<table class="tbl"><thead><tr><th colspan="2">EMPLOYMENT DETAILS</th></tr></thead><tbody>
<tr><td style="width:40%"><strong>Full Name</strong></td><td>${letter.candidate_name}</td></tr>
<tr><td><strong>Designation</strong></td><td>${letter.designation}</td></tr>
${letter.department ? `<tr><td><strong>Department</strong></td><td>${letter.department}</td></tr>` : ''}
<tr><td><strong>Date of Joining</strong></td><td>${joining}</td></tr>
<tr><td><strong>Employment Type</strong></td><td>Full-Time, Permanent</td></tr>
</tbody></table>
${ctcAnnual > 0 ? `
<h3 style="font-size:13px;font-weight:800;color:#166534;margin:20px 0 10px;letter-spacing:-0.2px">COMPENSATION STRUCTURE</h3>
<table class="sal"><thead><tr>
<th>Component</th><th style="text-align:right">Monthly (₹)</th><th style="text-align:right">Annual (₹)</th>
</tr></thead><tbody>
<tr><td>Basic Salary</td><td style="text-align:right">${fmt(basic, true)}</td><td style="text-align:right">${fmt(basic)}</td></tr>
<tr><td>House Rent Allowance (HRA)</td><td style="text-align:right">${fmt(hra, true)}</td><td style="text-align:right">${fmt(hra)}</td></tr>
<tr><td>Medical Allowance</td><td style="text-align:right">${fmt(medical, true)}</td><td style="text-align:right">${fmt(medical)}</td></tr>
<tr><td>Special Allowance</td><td style="text-align:right">${fmt(special, true)}</td><td style="text-align:right">${fmt(special)}</td></tr>
<tr class="gross"><td><strong>Gross Salary</strong></td><td style="text-align:right"><strong>${fmt(grossAnnual, true)}</strong></td><td style="text-align:right"><strong>${fmt(grossAnnual)}</strong></td></tr>
<tr class="ded"><td>Less: PF / Deductions</td><td style="text-align:right">-${fmt(deductions, true)}</td><td style="text-align:right">-${fmt(deductions)}</td></tr>
<tr class="net"><td>Net Take Home Salary</td><td style="text-align:right">${fmt(netAnnual, true)}</td><td style="text-align:right">${fmt(netAnnual)}</td></tr>
</tbody></table>
<p style="font-size:12px;color:#64748b;margin-top:8px">* CTC (Cost to Company): ₹${ctcAnnual.toLocaleString('en-IN')} per annum (includes PF employer contribution)</p>
` : ''}
${letter.content ? `<p class="body" style="margin-top:20px">${(letter.content || '').replace(/\n/g, '<br/>')}</p>` : ''}
<p class="body">This offer is subject to satisfactory background verification and submission of all required documents on or before your joining date.</p>
<div class="accept"><h3>✅ Acceptance</h3><p>Please confirm acceptance within <strong>7 working days</strong> from the date of issue.</p></div>
<p class="body">Warm regards,<br/><strong>Human Resources Department</strong><br/>${company}</p>
<div class="sigs">
  <div class="sig"><div class="sig-line"></div><div class="sig-name">Authorised Signatory</div><div class="sig-lbl">HR Manager, ${company}</div></div>
  <div class="sig"><div class="sig-line"></div><div class="sig-name">${letter.candidate_name}</div><div class="sig-lbl">Candidate Signature &amp; Date</div></div>
</div>
<div class="foot">This is an official offer letter issued by ${company} · hr@goalline.com</div>
</div></body></html>`;
}

export default function AdminOfferLetters() {
  const [employees, setEmployees] = useState([]);
  const [letters, setLetters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState({});
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [previewLetter, setPreviewLetter] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [e, l] = await Promise.all([api.get('/admin/employees-for-offer'), api.get('/admin/offer-letters')]);
    setEmployees(e.data || []);
    setLetters((l.data || []).map(normalizeAdminOfferLetter));
  };

  const updateLetterStatus = async (id, status) => {
    try {
      await api.patch(`/admin/offer-letters/${id}`, { status });
      setLetters((prev) => prev.map((letter) => letter.id === id ? { ...letter, status } : letter));
    } catch (err) {
      console.error('Failed to update offer letter status', err);
      loadData();
    }
  };

  const pickEmployee = (empId) => {
    const emp = employees.find(e => String(e.id) === String(empId));
    if (!emp) {
      setForm(p => ({ ...p, employee_id: '' }));
      return;
    }
    const basicSalary = Number(emp.basic_salary || emp.salary || 0);
    const hraValue = Number(emp.hra || emp.allowances || 0);
    const pfValue = Number(emp.pf || 0);
    const medicalValue = Number(emp.medical_allowance || 0);
    const specialValue = Number(emp.special_allowance || 0);
    const deductionValue = emp.deductions != null ? Number(emp.deductions) : pfValue;
    const employeeName = emp.full_name || emp.candidate_name || emp.email || '';
    const ctcValue = Number(emp.ctc || basicSalary + hraValue + pfValue + medicalValue + specialValue);

    setForm(p => ({
      ...p,
      employee_id: empId,
      candidate_name: employeeName,
      candidate_email: emp.email || '',
      designation: emp.designation || '',
      department: emp.department || '',
      basic_salary: String(basicSalary),
      hra: String(hraValue),
      pf: String(pfValue),
      medical_allowance: String(medicalValue),
      special_allowance: String(specialValue),
      deductions: String(deductionValue),
      ctc: String(ctcValue),
      joining_date: emp.joining_date ? emp.joining_date.split('T')[0] : '',
    }));
  };

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setMsg({ type: '', text: '' });
    try {
      await api.post('/admin/offer-letters', {
        employee_id: form.employee_id || null,
        candidate_name: form.candidate_name,
        candidate_email: form.candidate_email,
        designation: form.designation,
        department: form.department,
        ctc: parseFloat(form.ctc || 0),
        basic_salary: parseFloat(form.basic_salary || 0),
        allowances: parseFloat(form.hra || 0) + parseFloat(form.medical_allowance || 0) + parseFloat(form.special_allowance || 0),
        hra: parseFloat(form.hra || 0),
        pf: parseFloat(form.pf || 0),
        medical_allowance: parseFloat(form.medical_allowance || 0),
        special_allowance: parseFloat(form.special_allowance || 0),
        deductions: parseFloat(form.deductions || 0),
        joining_date: form.joining_date || null,
        content: form.content,
      });
      setMsg({ type: 'success', text: '✅ Offer letter created and sent successfully!' });
      setShowForm(false); setForm(BLANK); loadData();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create offer letter.' });
    }
    setLoading(false);
  };

  const download = (letter) => {
    setDownloading(p => ({ ...p, [letter.id]: true }));
    const html = generateOfferHTML(letter);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `OfferLetter_${letter.candidate_name.replace(/\s+/g, '_')}.html`;
    a.click(); URL.revokeObjectURL(url);
    setDownloading(p => ({ ...p, [letter.id]: false }));
  };

  const preview = (letter) => {
    setPreviewLetter(normalizeAdminOfferLetter(letter));
  };

  const deleteLetter = async (id) => {
    if (!confirm('Delete this offer letter?')) return;
    await api.delete(`/admin/offer-letters/${id}`); loadData();
  };

  const getLetterCTC = (l) => {
    const { ctc, netMonthly } = getLetterValues(l);
    return { ctc, netMonthly };
  };

  const inputCls = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Offer Letters</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>Create & send offer letters — auto-fills from employee salary structure</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setMsg({ type: '', text: '' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancel' : 'New Offer Letter'}
        </button>
      </div>

      {msg.text && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, fontWeight: 500, fontSize: '13px' }}>
          {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#1e40af" /> Create New Offer Letter
          </h2>

          <form onSubmit={submit}>
            {/* Employee Selector */}
            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', fontSize: '13px', fontWeight: 700, color: '#1d4ed8', marginBottom: '8px', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Select Employee (Auto-fills salary structure)
              </label>
              <select value={form.employee_id} onChange={e => pickEmployee(e.target.value)}
                style={{ ...inputCls, border: '1px solid #93c5fd', background: '#fff' }}>
                <option value="">— Select an employee —</option>
                {employees.map(e => {
                  const net = ((Number(e.basic_salary || 0) + Number(e.hra || 0) + Number(e.medical_allowance || 0) + Number(e.special_allowance || 0)) - Number(e.pf || 0)) / 12;
                  return (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_code}) · {e.designation} · ₹{net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo
                    </option>
                  );
                })}
              </select>
              {form.employee_id && (
                <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={11} /> Salary structure auto-filled from employee record
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px', marginBottom: '20px' }}>
              {[
                { label: 'Candidate Name *', key: 'candidate_name', type: 'text', required: true },
                { label: 'Email', key: 'candidate_email', type: 'email' },
                { label: 'Designation *', key: 'designation', type: 'text', required: true },
                { label: 'Department', key: 'department', type: 'text' },
                { label: 'Joining Date', key: 'joining_date', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputCls} />
                </div>
              ))}
            </div>

            {/* Salary */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>💰 Salary Structure</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px' }}>
                {[
                  { key: 'basic_salary', label: 'Basic Salary', color: '#2563eb' },
                  { key: 'hra', label: 'HRA', color: '#16a34a' },
                  { key: 'pf', label: 'PF (Employer)', color: '#f59e0b' },
                  { key: 'medical_allowance', label: 'Medical Allowance', color: '#8b5cf6' },
                  { key: 'special_allowance', label: 'Special Allowance', color: '#ec4899' },
                  { key: 'deductions', label: 'Deductions', color: '#dc2626' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: f.color, marginBottom: '4px' }}>{f.label} (₹/yr)</label>
                    <input type="number" min="0" value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ ...inputCls, border: '1px solid #86efac' }} />
                  </div>
                ))}
              </div>
              {form.basic_salary && (
                <div style={{ marginTop: '14px', padding: '12px 16px', background: '#fff', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', border: '1px solid #86efac' }}>
                  {(() => {
                    const ctc = (Number(form.basic_salary) + Number(form.hra) + Number(form.pf) + Number(form.medical_allowance) + Number(form.special_allowance));
                    const net = ctc - Number(form.deductions || form.pf || 0);
                    return (
                      <>
                        <div><div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Annual CTC</div><div style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af' }}>₹{ctc.toLocaleString('en-IN')}</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Monthly Net</div><div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>₹{(net / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Additional Terms / Notes</label>
              <textarea rows={3} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Additional benefits, terms, or special conditions…"
                style={{ ...inputCls, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: loading ? 0.7 : 1 }}>
                <Send size={14} /> {loading ? 'Creating...' : 'Create & Send Offer'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(BLANK); }}
                style={{ padding: '11px 20px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Letters Table */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>All Offer Letters ({letters.length})</span>
        </div>
        {letters.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={36} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <div>No offer letters yet.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Candidate', 'Designation', 'Annual CTC', 'In-hand / Mo', 'Joining', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {letters.map(l => {
                  const { ctc, netMonthly } = getLetterCTC(l);
                  const st = STATUS_STYLE[l.status] || STATUS_STYLE.draft;
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{l.candidate_name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{l.candidate_email}</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ color: '#374151' }}>{l.designation}</div>
                        {l.department && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{l.department}</div>}
                      </td>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#1e40af' }}>₹{ctc.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#16a34a' }}>₹{netMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: '14px', color: '#475569' }}>{l.joining_date ? new Date(l.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td style={{ padding: '14px' }}>
                        {l.status === 'accepted' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '12px' }}>Accepted</span>
                        ) : (
                          <select
                            value={l.status}
                            onChange={(e) => updateLetterStatus(l.id, e.target.value)}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#0f172a' }}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button onClick={() => preview(l)} title="Preview" style={{ background: '#eff6ff', border: 'none', borderRadius: '7px', padding: '6px 9px', cursor: 'pointer', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={13} />View</button>
                          <button onClick={() => download(l)} disabled={downloading[l.id]} title="Download" style={{ background: '#f0fdf4', border: 'none', borderRadius: '7px', padding: '6px 9px', cursor: 'pointer', color: '#16a34a', opacity: downloading[l.id] ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={13} />Download</button>
                          {l.status !== 'accepted' && (
                            <button onClick={() => deleteLetter(l.id)} title="Delete" style={{ background: '#fef2f2', border: 'none', borderRadius: '7px', padding: '6px 9px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={13} />Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewLetter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '800px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>Preview: {previewLetter.candidate_name}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => download(previewLetter)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}><Download size={13} /> Download</button>
                <button onClick={() => setPreviewLetter(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer' }}><X size={16} color="#475569" /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '4px' }}>
              <iframe srcDoc={generateOfferHTML(previewLetter)} style={{ width: '100%', height: '100%', minHeight: '560px', border: 'none', borderRadius: '12px' }} title="Offer Letter Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}