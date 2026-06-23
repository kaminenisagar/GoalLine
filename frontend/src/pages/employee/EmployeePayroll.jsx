import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Download, Printer, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const COMPANY = 'GoalLine';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function downloadPayslipPDF(p) {
  const companyName = p.company_name || COMPANY;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${companyName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1a202c; background: white; padding: 0; }
    .payslip { max-width: 700px; margin: 0 auto; padding: 2rem; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #db2777; }
    .brand { font-size: 1.75rem; font-weight: 800; color: #db2777; }
    .brand-sub { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }
    .payslip-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; text-align: right; }
    .payslip-period { font-size: 0.875rem; color: #64748b; text-align: right; margin-top: 0.25rem; }
    .section { margin-bottom: 1.25rem; }
    .section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .info-item { background: #f8fafc; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
    .info-label { font-size: 0.75rem; color: #64748b; }
    .info-value { font-size: 0.875rem; font-weight: 600; color: #0f172a; margin-top: 0.125rem; }
    .salary-table { width: 100%; border-collapse: collapse; }
    .salary-table th { background: #f1f5f9; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.8125rem; color: #374151; }
    .salary-table td { padding: 0.5rem 0.75rem; font-size: 0.875rem; border-bottom: 1px solid #f1f5f9; }
    .salary-table .amount { text-align: right; }
    .net-row { background: #fdf2f8; }
    .net-row td { font-weight: 800; color: #db2777; font-size: 1rem; }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; text-align: center; font-size: 0.75rem; color: #94a3b8; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="payslip">
  <div class="header">
    <div>
      <div class="brand">${companyName}</div>
      <div class="brand-sub">Official Payslip Document</div>
    </div>
    <div>
      <div class="payslip-title">Salary Payslip</div>
      <div class="payslip-period">${MONTHS[(p.month || 1) - 1]} ${p.year}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Employee Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Employee Name</div>
        <div class="info-value">${p.employee_name || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Employee Code</div>
        <div class="info-value">${p.employee_code || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Pay Period</div>
        <div class="info-value">${MONTHS[(p.month || 1) - 1]} ${p.year}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Payment Status</div>
        <div class="info-value" style="text-transform:capitalize">${p.status || 'processed'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Salary Breakdown</div>
    <table class="salary-table">
      <thead>
        <tr><th>Component</th><th class="amount">Amount</th></tr>
      </thead>
      <tbody>
        <tr><td>Basic Salary</td><td class="amount">₹${Number(p.basic_salary || 0).toLocaleString()}</td></tr>
        <tr><td>Allowances (HRA, TA, etc.)</td><td class="amount" style="color:#16a34a">+₹${Number((Number(p.allowances) || 0) + (Number(p.hra) || 0) + (Number(p.medical_allowance) || 0) + (Number(p.special_allowance) || 0)).toLocaleString()}</td></tr>
        <tr><td>Gross Salary</td><td class="amount">₹${Number((Number(p.basic_salary) || 0) + ((Number(p.allowances) || 0) + (Number(p.hra) || 0) + (Number(p.medical_allowance) || 0) + (Number(p.special_allowance) || 0))).toLocaleString()}</td></tr>
        <tr><td>PF</td><td class="amount" style="color:#dc2626">-₹${Number(p.pf || 0).toLocaleString()}</td></tr>
        <tr><td>Other Deductions</td><td class="amount" style="color:#dc2626">-₹${Number(p.deductions || 0).toLocaleString()}</td></tr>
        <tr><td>Total Deductions</td><td class="amount" style="color:#dc2626">-₹${Number((Number(p.pf) || 0) + (Number(p.deductions) || 0)).toLocaleString()}</td></tr>
        <tr class="net-row"><td>Net Salary (Take Home)</td><td class="amount">₹${Number(p.net_salary || 0).toLocaleString()}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    This is a computer-generated payslip. Issued by ${companyName}.<br/>
    For queries, contact your HR department.
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.print();
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function EmployeePayroll() {
  const [payroll, setPayroll] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/employee/payroll').then((res) => setPayroll(res.data));
  }, []);

  const latest = payroll[0];
  const total = payroll.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Salary & Payslips</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>View your salary history and download payslips as PDF</p>
      </div>

      {/* Summary cards */}
      {payroll.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Latest Pay</p>
            <p style={{ fontWeight: 800, fontSize: '1.25rem', color: '#db2777', margin: '0.25rem 0 0' }}>₹{Number(latest?.net_salary || 0).toLocaleString()}</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.125rem 0 0' }}>{MONTHS[(latest?.month || 1) - 1]} {latest?.year}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Total Earned</p>
            <p style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', margin: '0.25rem 0 0' }}>₹{total.toLocaleString()}</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.125rem 0 0' }}>{payroll.length} payslip(s)</p>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Latest Status</p>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#16a34a', margin: '0.25rem 0 0', textTransform: 'capitalize' }}>{latest?.status || '—'}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {payroll.map((p) => {
          const companyName = p.company_name || p.payslip_company || COMPANY;
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {/* Header row */}
              <div
                onClick={() => setExpanded(isOpen ? null : p.id)}
                style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{companyName}</p>
                  <p style={{ fontWeight: 600, fontSize: '1rem', margin: '0.25rem 0 0', color: '#0f172a' }}>{MONTHS[(p.month || 1) - 1]} {p.year}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 800, fontSize: '1.25rem', color: '#db2777', margin: 0 }}>₹{Number(p.net_salary || 0).toLocaleString()}</p>
                    <span style={{ padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, background: p.status === 'paid' ? '#f0fdf4' : '#fdf2f8', color: p.status === 'paid' ? '#16a34a' : '#db2777', textTransform: 'capitalize' }}>
                      {p.status}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp style={{ width: '1.25rem', height: '1.25rem', color: '#94a3b8' }} /> : <ChevronDown style={{ width: '1.25rem', height: '1.25rem', color: '#94a3b8' }} />}
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '1rem 1.25rem', background: '#fafafa' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Basic Salary</p>
                      <p style={{ fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0' }}>₹{Number(p.basic_salary || 0).toLocaleString()}</p>
                    </div>
                    <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Allowances</p>
                      <p style={{ fontWeight: 700, color: '#16a34a', margin: '0.25rem 0 0' }}>+₹{Number((Number(p.allowances) || 0) + (Number(p.hra) || 0) + (Number(p.medical_allowance) || 0) + (Number(p.special_allowance) || 0)).toLocaleString()}</p>
                    </div>
                    <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Deductions</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0' }}>PF: ₹{Number(p.pf || 0).toLocaleString()}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.125rem 0 0' }}>Other: ₹{Number(p.deductions || 0).toLocaleString()}</p>
                      <p style={{ fontWeight: 700, color: '#dc2626', margin: '0.25rem 0 0' }}>-₹{Number((Number(p.pf) || 0) + (Number(p.deductions) || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadPayslipPDF({ ...p, employee_name: p.full_name || 'Employee' })}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#db2777', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    <Download style={{ width: '1rem', height: '1rem' }} />
                    Download Payslip PDF
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!payroll.length && <p style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center', background: 'white', borderRadius: '0.75rem' }}>No payroll records yet. Contact admin.</p>}
      </div>
    </div>
  );
}