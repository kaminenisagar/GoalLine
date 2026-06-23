import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, Pencil, Trash2, Download, CheckCircle, AlertCircle, Calendar, X, Printer } from 'lucide-react';

const MONTHS = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' }
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const DEFAULT_PERCENTAGES = {
  basic: 50,
  hra: 20,
  pf: 6,
  medical: 4,
  special: 20,
};

export default function AdminPayroll() {
  const [payroll, setPayroll] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: CURRENT_YEAR,
    basic_salary: '',
    hra: '',
    pf: '',
    medical_allowance: '',
    special_allowance: '',
    allowances: '',
    deductions: '',
    net_salary: '',
    notes: '',
  });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [filterEmp, setFilterEmp] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [percentages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salaryPercentages')) || DEFAULT_PERCENTAGES; }
    catch { return DEFAULT_PERCENTAGES; }
  });

  const load = async () => {
    try {
      const [p, e] = await Promise.all([
        api.get('/admin/payroll'),
        api.get('/admin/employees')
      ]);
      setPayroll(p.data || []);
      setEmployees(e.data || []);
    } catch (err) {
      console.error('Load error:', err);
    }
  };

  useEffect(() => { load(); }, []);

  const calculateNetSalary = (basic, hra, pf, medical, special, allowances, deductions) => {
    const totalEarnings = (Number(basic) || 0) + (Number(hra) || 0) + 
                          (Number(medical) || 0) + (Number(special) || 0) + (Number(allowances) || 0);
    const totalDeductions = (Number(pf) || 0) + (Number(deductions) || 0);
    return totalEarnings - totalDeductions;
  };

  const handleEmployeeSelect = (employeeId) => {
    const selectedEmp = employees.find((e) => String(e.id) === String(employeeId));
    if (selectedEmp) {
      // Calculate monthly salary from annual components (annual ÷ 12)
      const annualBasic = Number(selectedEmp.basic_salary || 0);
      const annualHra = Number(selectedEmp.hra || 0);
      const annualPf = Number(selectedEmp.pf || 0);
      const annualMedical = Number(selectedEmp.medical_allowance || 0);
      const annualSpecial = Number(selectedEmp.special_allowance || 0);
      const annualAllowances = Number(selectedEmp.allowances || 0);
      const annualDeductions = Number(selectedEmp.deductions || 0);
      
      const monthlyBasic = annualBasic / 12;
      const monthlyHra = annualHra / 12;
      const monthlyPf = annualPf / 12;
      const monthlyMedical = annualMedical / 12;
      const monthlySpecial = annualSpecial / 12;
      const monthlyAllowances = annualAllowances / 12;
      const monthlyDeductions = annualDeductions / 12;
      
      const net = calculateNetSalary(monthlyBasic, monthlyHra, monthlyPf, monthlyMedical, monthlySpecial, monthlyAllowances, monthlyDeductions);
      
      setForm({
        ...form,
        employee_id: employeeId,
        basic_salary: monthlyBasic.toString(),
        hra: monthlyHra.toString(),
        pf: monthlyPf.toString(),
        medical_allowance: monthlyMedical.toString(),
        special_allowance: monthlySpecial.toString(),
        allowances: monthlyAllowances.toString(),
        deductions: monthlyDeductions.toString(),
        net_salary: net.toString(),
      });
    } else {
      setForm({ ...form, employee_id: employeeId });
    }
  };

  const recalculateNet = (updatedForm) => {
    const net = calculateNetSalary(
      updatedForm.basic_salary,
      updatedForm.hra,
      updatedForm.pf,
      updatedForm.medical_allowance,
      updatedForm.special_allowance,
      updatedForm.allowances,
      updatedForm.deductions
    );
    setForm({ ...updatedForm, net_salary: net.toString() });
  };

  const handleInputChange = (field, value) => {
    const updated = { ...form, [field]: value };
    recalculateNet(updated);
  };

  const processPayroll = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });
    
    // Check for duplicate month/year for same employee
    if (!editId) {
      const existing = payroll.find(p => 
        String(p.employee_id) === String(form.employee_id) &&
        p.month === parseInt(form.month) &&
        p.year === parseInt(form.year)
      );
      
      if (existing) {
        setMsg({ type: 'error', text: '❌ Duplicate entry! Payroll for this employee in the selected month/year already exists.' });
        setLoading(false);
        return;
      }
    }
    
    const submitData = {
      employee_id: form.employee_id,
      month: parseInt(form.month),
      year: parseInt(form.year),
      basic_salary: parseFloat(form.basic_salary) || 0,
      hra: parseFloat(form.hra) || 0,
      pf: parseFloat(form.pf) || 0,
      medical_allowance: parseFloat(form.medical_allowance) || 0,
      special_allowance: parseFloat(form.special_allowance) || 0,
      allowances: parseFloat(form.allowances) || 0,
      deductions: parseFloat(form.deductions) || 0,
      net_salary: parseFloat(form.net_salary) || 0,
      notes: form.notes,
    };
    
    try {
      if (editId) {
        await api.put(`/admin/payroll/${editId}`, submitData);
        setMsg({ type: 'success', text: '✅ Payroll updated successfully!' });
      } else {
        const res = await api.post('/admin/payroll', submitData);
        setMsg({ type: 'success', text: `✅ Payroll processed! Net salary: ₹${res.data.net_salary?.toLocaleString()}` });
      }
      setForm({
        employee_id: '',
        month: new Date().getMonth() + 1,
        year: CURRENT_YEAR,
        basic_salary: '',
        hra: '',
        pf: '',
        medical_allowance: '',
        special_allowance: '',
        allowances: '',
        deductions: '',
        net_salary: '',
        notes: '',
      });
      setEditId(null);
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to process payroll' });
    }
    setLoading(false);
  };

  const openEdit = (payrollRecord) => {
    setEditId(payrollRecord.id);
    setForm({
      employee_id: payrollRecord.employee_id,
      month: payrollRecord.month,
      year: payrollRecord.year,
      basic_salary: payrollRecord.basic_salary || '',
      hra: payrollRecord.hra || '',
      pf: payrollRecord.pf || '',
      medical_allowance: payrollRecord.medical_allowance || '',
      special_allowance: payrollRecord.special_allowance || '',
      allowances: payrollRecord.allowances || '',
      deductions: payrollRecord.deductions || '',
      net_salary: payrollRecord.net_salary || '',
      notes: payrollRecord.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payroll record?')) return;
    await api.delete(`/admin/payroll/${id}`);
    load();
  };

  const generatePayslip = async (payrollRecord) => {
    try {
      const res = await api.get(`/admin/payroll/${payrollRecord.id}/payslip`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${payrollRecord.employee_name}_${MONTHS[payrollRecord.month-1].name}_${payrollRecord.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(`/api/admin/payroll/${payrollRecord.id}/payslip-html`, '_blank');
    }
  };

  const viewPayslip = (payrollRecord) => {
    setSelectedPayroll(payrollRecord);
    setShowPayslipModal(true);
  };

  // Filter payroll records
  const filtered = payroll.filter((p) => {
    let match = true;
    if (filterEmp) {
      match = match && (String(p.employee_id) === filterEmp || 
        p.full_name?.toLowerCase().includes(filterEmp.toLowerCase()));
    }
    if (filterMonth) match = match && p.month === parseInt(filterMonth);
    if (filterYear) match = match && p.year === parseInt(filterYear);
    return match;
  });

  // Calculate totals
  const totalBasic = filtered.reduce((sum, p) => sum + Number(p.basic_salary || 0), 0);
  const totalHra = filtered.reduce((sum, p) => sum + Number(p.hra || 0), 0);
  const totalPf = filtered.reduce((sum, p) => sum + Number(p.pf || 0), 0);
  const totalMedical = filtered.reduce((sum, p) => sum + Number(p.medical_allowance || 0), 0);
  const totalSpecial = filtered.reduce((sum, p) => sum + Number(p.special_allowance || 0), 0);
  const totalAllowances = filtered.reduce((sum, p) => sum + Number(p.allowances || 0), 0);
  const totalDeductions = filtered.reduce((sum, p) => sum + Number(p.deductions || 0), 0);
  const totalNet = filtered.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);

  // Group by month for summary
  const monthlySummary = {};
  payroll.forEach(p => {
    const key = `${p.month}-${p.year}`;
    if (!monthlySummary[key]) {
      monthlySummary[key] = { month: p.month, year: p.year, total: 0, count: 0 };
    }
    monthlySummary[key].total += Number(p.net_salary || 0);
    monthlySummary[key].count++;
  });

  const getMonthName = (month) => {
    return MONTHS.find(m => m.value === month)?.name || month;
  };

  const printPayslip = () => {
    const printContent = document.getElementById('payslip-print-content');
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>💰 Payroll Management</h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
            Monthly salary processing and payslip generation
          </p>
        </div>
        <button 
          onClick={() => { setEditId(null); setShowForm(true); }} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#db2777', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={18} /> Process Monthly Payroll
        </button>
      </div>

      {/* Message */}
      {msg.text && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4', color: msg.type === 'error' ? '#dc2626' : '#16a34a', border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}` }}>
          {msg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Monthly Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Payroll Released</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>₹{totalNet.toLocaleString()}</div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>{filtered.length} employees processed</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Basic Salary</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>₹{totalBasic.toLocaleString()}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Allowances</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>+ ₹{(totalAllowances + totalHra + totalMedical + totalSpecial).toLocaleString()}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Deductions</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>- ₹{(totalPf + totalDeductions).toLocaleString()}</div>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} /> Monthly Salary Release Summary
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Month</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Employees Processed</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Total Salary Released</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(monthlySummary).sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
              }).map((summary, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{getMonthName(summary.month)} {summary.year}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{summary.count} employees</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#db2777' }}>₹{summary.total.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                      Released
                    </span>
                  </td>
                </tr>
              ))}
              {Object.keys(monthlySummary).length === 0 && (
                <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No payroll records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <select 
            value={filterEmp} 
            onChange={(e) => setFilterEmp(e.target.value)} 
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
          >
            <option value="">All Employees</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
            ))}
          </select>
        </div>
        <div style={{ width: '150px' }}>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
            <option value="">All Months</option>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
          </select>
        </div>
        <div style={{ width: '120px' }}>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {(filterEmp || filterMonth || filterYear) && (
          <button onClick={() => { setFilterEmp(''); setFilterMonth(''); setFilterYear(''); }} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Payroll Records Table - All Columns */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1200px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Employee</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Period</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>Basic</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>HRA</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>PF</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>Medical</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>Special</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>Deductions</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>Net Salary</th>
                <th style={{ padding: '14px 12px', textAlign: 'center' }}>Payslip</th>
                <th style={{ padding: '14px 12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const netSalary = Number(p.net_salary || 0);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 500 }}>{p.full_name || p.employee_name || '-'}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.employee_code}</div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500, color: '#475569' }}>
                      {getMonthName(p.month)} {p.year}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>₹{Number(p.basic_salary).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#16a34a' }}>₹{Number(p.hra || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#f59e0b' }}>₹{Number(p.pf || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#8b5cf6' }}>₹{Number(p.medical_allowance || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#ec4899' }}>₹{Number(p.special_allowance || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>-₹{Number(p.deductions || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#db2777' }}>₹{netSalary.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => viewPayslip(p)} style={{ background: '#e0e7ff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', color: '#4f46e5', fontSize: '12px' }}>
                        <Download size={14} style={{ marginRight: '4px' }} /> View
                      </button>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => openEdit(p)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} style={{ background: '#fef2f2', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', color: '#dc2626' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="12" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    No payroll records found. Click "Process Monthly Payroll" to get started.
                  </td>
                </tr>
              )}
              {filtered.length > 0 && (
                <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #e2e8f0' }}>
                  <td colSpan="2" style={{ padding: '12px', textAlign: 'right' }}>Total:</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{totalBasic.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{totalHra.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{totalPf.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{totalMedical.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{totalSpecial.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{totalAllowances.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{totalDeductions.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#db2777', fontSize: '16px' }}>₹{totalNet.toLocaleString()}</td>
                  <td colSpan="2"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Payroll Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '750px', maxHeight: '92vh', overflow: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{editId ? '✏️ Edit Payroll' : '📄 Process Monthly Payroll'}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={processPayroll}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>Select Employee *</label>
                <select required value={form.employee_id} onChange={(e) => handleEmployeeSelect(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}>
                  <option value="">-- Select Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code}) - {e.designation}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>Month</label>
                  <select value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>Year</label>
                  <select value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Salary Components (Monthly)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div><label style={{ fontSize: '12px', fontWeight: 500 }}>Basic ({percentages.basic}%)</label><input type="number" step="0.01" value={form.basic_salary} onChange={(e) => handleInputChange('basic_salary', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
                  <div><label style={{ fontSize: '12px', fontWeight: 500, color: '#16a34a' }}>HRA ({percentages.hra}%)</label><input type="number" step="0.01" value={form.hra} onChange={(e) => handleInputChange('hra', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
                  <div><label style={{ fontSize: '12px', fontWeight: 500, color: '#f59e0b' }}>PF ({percentages.pf}%)</label><input type="number" step="0.01" value={form.pf} onChange={(e) => handleInputChange('pf', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
                  <div><label style={{ fontSize: '12px', fontWeight: 500, color: '#8b5cf6' }}>Medical ({percentages.medical}%)</label><input type="number" step="0.01" value={form.medical_allowance} onChange={(e) => handleInputChange('medical_allowance', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
                  <div><label style={{ fontSize: '12px', fontWeight: 500, color: '#ec4899' }}>Special ({percentages.special}%)</label><input type="number" step="0.01" value={form.special_allowance} onChange={(e) => handleInputChange('special_allowance', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
                  <div><label style={{ fontSize: '12px', fontWeight: 500, color: '#16a34a' }}>Additional Allowances</label><input type="number" step="0.01" value={form.allowances} onChange={(e) => handleInputChange('allowances', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
                  <div><label style={{ fontSize: '12px', fontWeight: 500, color: '#dc2626' }}>Additional Deductions</label><input type="number" step="0.01" value={form.deductions} onChange={(e) => handleInputChange('deductions', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /></div>
                </div>
              </div>

              {form.basic_salary && (
                <div style={{ background: '#fce7f3', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#be185d' }}>Total Earnings</div>
                      <div style={{ fontWeight: 'bold', fontSize: '18px' }}>₹{(Number(form.basic_salary) + Number(form.hra) + Number(form.medical_allowance) + Number(form.special_allowance) + Number(form.allowances)).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#be185d' }}>Total Deductions</div>
                      <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#dc2626' }}>₹{(Number(form.pf) + Number(form.deductions)).toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#be185d' }}>Net Salary</div>
                      <div style={{ fontWeight: 'bold', fontSize: '22px', color: '#db2777' }}>₹{Number(form.net_salary).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>Notes (Optional)</label>
                <textarea rows={2} placeholder="Any remarks..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" disabled={loading} style={{ background: '#db2777', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>
                  {loading ? 'Processing...' : (editId ? 'Update Payroll' : 'Process Payroll')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {showPayslipModal && selectedPayroll && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px'
        }}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '650px', maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>📄 Payslip</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={printPayslip} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Printer size={14} /> Print</button>
                <button onClick={() => generatePayslip(selectedPayroll)} style={{ background: '#db2777', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={14} /> PDF</button>
                <button onClick={() => setShowPayslipModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            <div id="payslip-print-content">
              <div style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ color: '#db2777', margin: 0, fontSize: '28px' }}>GoalLine</h2>
                  <p style={{ color: '#64748b', margin: '4px 0 0' }}>Official Monthly Payslip</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div><span style={{ color: '#64748b' }}>Employee:</span> <strong>{selectedPayroll.full_name}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Employee Code:</span> <strong>{selectedPayroll.employee_code}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Designation:</span> <strong>{selectedPayroll.designation}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Department:</span> <strong>{selectedPayroll.department}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Month:</span> <strong>{getMonthName(selectedPayroll.month)} {selectedPayroll.year}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Processed On:</span> <strong>{new Date(selectedPayroll.processed_at).toLocaleDateString()}</strong></div>
                </div>

                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Salary Breakdown</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '10px 0' }}>Basic Salary</td><td style={{ textAlign: 'right' }}>₹{Number(selectedPayroll.basic_salary).toLocaleString()}</td></tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '10px 0', color: '#16a34a' }}>HRA</td><td style={{ textAlign: 'right', color: '#16a34a' }}>₹{Number(selectedPayroll.hra).toLocaleString()}</td></tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '10px 0' }}>PF (Employer)</td><td style={{ textAlign: 'right' }}>₹{Number(selectedPayroll.pf).toLocaleString()}</td></tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '10px 0', color: '#8b5cf6' }}>Medical Allowance</td><td style={{ textAlign: 'right', color: '#8b5cf6' }}>₹{Number(selectedPayroll.medical_allowance).toLocaleString()}</td></tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '10px 0', color: '#ec4899' }}>Special Allowance</td><td style={{ textAlign: 'right', color: '#ec4899' }}>₹{Number(selectedPayroll.special_allowance).toLocaleString()}</td></tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '10px 0', color: '#16a34a' }}>Additional Allowances</td><td style={{ textAlign: 'right', color: '#16a34a' }}>+ ₹{Number(selectedPayroll.allowances).toLocaleString()}</td></tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '10px 0', color: '#dc2626' }}>Additional Deductions</td><td style={{ textAlign: 'right', color: '#dc2626' }}>- ₹{Number(selectedPayroll.deductions).toLocaleString()}</td></tr>
                    <tr style={{ background: '#fce7f3' }}><td style={{ padding: '16px 0', fontWeight: 'bold', fontSize: '16px' }}>💰 Net Salary Paid</td><td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '18px', color: '#db2777' }}>₹{Number(selectedPayroll.net_salary).toLocaleString()}</td></tr>
                  </tbody>
                </table>

                <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8' }}>
                  This is a computer-generated payslip. No signature required.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}