import { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  Briefcase,
  TrendingUp,
  X,
  Printer,
} from 'lucide-react';

const STATUS_COLOR = {
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
};

const formatCurrency = (amount) => {
  const num = Number(amount || 0);

  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const normalizeOfferLetter = (letter) => {
  const basic = Number(letter.basic_salary || 0);
  const hra = Number(letter.hra || 0);
  const pf = Number(letter.pf || 0);
  const medical = Number(letter.medical_allowance || 0);
  const special = Number(letter.special_allowance || 0);
  const explicitAllowances = Number(letter.allowances || 0);
  const totalAllowances = explicitAllowances > 0 ? explicitAllowances : hra + medical + special;
  const otherDeductions = Number(letter.deductions || 0);
  const totalDeductions = pf + otherDeductions;
  const annualCTC = Number(letter.ctc || 0) || (basic + pf + totalAllowances);
  const monthlyCTC = annualCTC / 12;
  const annualGross = basic + totalAllowances;
  const annualNet = annualCTC - totalDeductions;
  const candidateName = letter.candidate_name || letter.full_name || letter.name || '';

  return {
    ...letter,
    basic_salary: basic,
    hra,
    pf,
    medical_allowance: medical,
    special_allowance: special,
    allowances: totalAllowances,
    deductions: totalDeductions,
    annualCTC,
    monthlyCTC,
    annualGross,
    annualNet,
    monthlyNet: annualNet / 12,
    candidate_name: candidateName,
  };
};

const calculateSalaryBreakdown = (
  annualBasic,
  annualAllowances,
  annualDeductions,
  annualCTC
) => {
  const basic = Number(annualBasic || 0);
  const allowances = Number(annualAllowances || 0);
  const deductions = Number(annualDeductions || 0);
  const ctc = Number(annualCTC || 0);

  const annualGross = basic + allowances;
  const annualNet = ctc > 0 ? ctc - deductions : annualGross - deductions;

  return {
    year: {
      basic,
      allowances,
      deductions,
      gross: annualGross,
      net: annualNet,
    },
    month: {
      basic: annualBasic / 12,
      allowances: annualAllowances / 12,
      deductions: annualDeductions / 12,
      gross: annualGross / 12,
      net: annualNet / 12,
    },
  };
};

function generateOfferHTML(letter) {
          const normalized = normalizeOfferLetter(letter);
          const basic = normalized.basic_salary;
          const hra = normalized.hra;
          const pf = normalized.pf;
          const medical = normalized.medical_allowance;
          const special = normalized.special_allowance;
          const totalAllowances = normalized.allowances;
          const totalDeductions = normalized.deductions;
          const annualCTC = normalized.annualCTC;
          const monthlyCTC = normalized.monthlyCTC;
          const candidateName = normalized.candidate_name;
          const breakdown = calculateSalaryBreakdown(
            basic,
            totalAllowances,
            totalDeductions,
            annualCTC
          );

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Offer Letter</title>

<style>
body{
  font-family: Arial, sans-serif;
  padding:40px;
  color:#1e293b;
}

.header{
  display:flex;
  justify-content:space-between;
  border-bottom:2px solid #2563eb;
  padding-bottom:15px;
  margin-bottom:30px;
}

.company{
  font-size:28px;
  font-weight:bold;
  color:#2563eb;
}

.title{
  font-size:24px;
  font-weight:bold;
  margin-bottom:20px;
}

table{
  width:100%;
  border-collapse:collapse;
  margin-top:20px;
}

table th{
  background:#f1f5f9;
}

table th,
table td{
  border:1px solid #cbd5e1;
  padding:10px;
  text-align:left;
}

.footer{
  margin-top:40px;
}

.net{
  background:#dcfce7;
  font-weight:bold;
}

</style>
</head>

<body>

<div class="header">
  <div>
    <div class="company">${letter.company_name || 'GoalLine'}</div>
    <div>${letter.company_email || 'hr@goalline.com'}</div>
  </div>

  <div>
    <strong>Date:</strong>
    ${new Date(letter.created_at).toLocaleDateString('en-IN')}
  </div>
</div>

<div class="title">Offer Letter</div>

<p>
Dear <strong>${candidateName}</strong>,
</p>

<p>
We are pleased to offer you the position of
<strong>${letter.designation}</strong>.
</p>

<div style="margin-top:16px; display:flex; gap:24px;">
  <div><strong>Annual CTC:</strong> ${formatCurrency(annualCTC)}</div>
  <div><strong>Monthly Salary:</strong> ${formatCurrency(monthlyCTC)}</div>
  <div><strong>Monthly Net:</strong> ${formatCurrency(breakdown.month.net)}</div>
</div>

<table>
<tr>
  <th>Field</th>
  <th>Details</th>
</tr>

<tr>
  <td>Candidate Name</td>
  <td>${candidateName}</td>
</tr>

<tr>
  <td>Email</td>
  <td>${letter.candidate_email || '-'}</td>
</tr>

<tr>
  <td>Department</td>
  <td>${letter.department || '-'}</td>
</tr>

<tr>
  <td>Joining Date</td>
  <td>
    ${
      letter.joining_date
        ? new Date(letter.joining_date).toLocaleDateString('en-IN')
        : '-'
    }
  </td>
</tr>

</table>

<h3 style="margin-top:30px">Salary Breakdown</h3>

<table>
<tr>
  <th>Component</th>
  <th>Yearly</th>
  <th>Monthly</th>
</tr>

<tr>
  <td>Basic Salary</td>
  <td>${formatCurrency(breakdown.year.basic)}</td>
  <td>${formatCurrency(breakdown.month.basic)}</td>
</tr>

<tr>
  <td>Allowances</td>
  <td>${formatCurrency(breakdown.year.allowances)}</td>
  <td>${formatCurrency(breakdown.month.allowances)}</td>
</tr>

<tr>
  <td>Deductions</td>
  <td>${formatCurrency(breakdown.year.deductions)}</td>
  <td>${formatCurrency(breakdown.month.deductions)}</td>
</tr>

<tr class="net">
  <td>Net Salary</td>
  <td>${formatCurrency(breakdown.year.net)}</td>
  <td>${formatCurrency(breakdown.month.net)}</td>
</tr>

</table>

${
  letter.content
    ? `
<h3 style="margin-top:30px">Terms & Conditions</h3>
<p>${letter.content}</p>
`
    : ''
}

<div class="footer">
  <p>
    Regards,<br/>
    HR Team<br/>
    ${letter.company_name || 'GoalLine'}
  </p>
</div>

</body>
</html>
`;
}

function handleDownloadHTML(letter) {
  const html = generateOfferHTML(letter);

  const blob = new Blob([html], {
    type: 'text/html',
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;

  a.download = `Offer_Letter_${letter.candidate_name}.html`;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function handlePrint(letter) {
  const html = generateOfferHTML(letter);

  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Popup blocked. Please allow popups.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

export default function EmployeeOfferLetters() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState(null);

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      const res = await api.get('/employee/offer-letters');

      const formatted = (res.data || []).map((item) => {
        const normalized = normalizeOfferLetter(item);
        return {
          ...item,
          ...normalized,
        };
      });

      setLetters(formatted);
    } catch (err) {
      console.error(err);
      alert('Failed to load offer letters');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">
          Employee Offer Letters
        </h1>

        <p className="text-slate-500 mt-1">
          View, download and print your offer letters
        </p>
      </div>

      {letters.length === 0 && (
        <div className="bg-white border rounded-2xl p-10 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />

          <p className="text-slate-500">
            No Offer Letters Found
          </p>
        </div>
      )}

      <div className="space-y-5">

        {letters.map((letter) => {
          const breakdown = calculateSalaryBreakdown(
            letter.basic_salary,
            letter.allowances,
            letter.deductions
          );
          const annualCTC = letter.annualCTC;
          const monthlyCTC = letter.monthlyCTC;

          return (
            <div key={letter.id} className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b bg-slate-50">

                <div className="flex justify-between items-start">

                  <div className="flex gap-4">

                    <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-blue-600" />
                    </div>

                    <div>

                      <h2 className="text-xl font-bold text-slate-800">
                        {letter.designation}
                      </h2>

                      <p className="text-slate-500 text-sm">
                        {letter.company_name || 'GoalLine'}
                      </p>

                      <div className="flex items-center gap-2 mt-2">

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                            STATUS_COLOR[letter.status] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {letter.status || 'pending'}
                        </span>

                      </div>

                    </div>

                  </div>

                  <div className="text-right text-sm text-slate-400">

                    <div>
                      Ref:
                      {' '}
                      OL-
                      {String(letter.id).padStart(4, '0')}
                    </div>

                    <div>
                      {new Date(letter.created_at).toLocaleDateString('en-IN')}
                    </div>

                  </div>

                </div>

              </div>

              <div className="p-5">

                <div className="grid md:grid-cols-2 gap-4">

                  <div className="space-y-3">

                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400" />

                      <span className="text-slate-600 text-sm">
                        Department:
                      </span>

                      <span className="font-medium text-sm">
                        {letter.department || '-'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />

                      <span className="text-slate-600 text-sm">
                        Joining:
                      </span>

                      <span className="font-medium text-sm">
                        {letter.joining_date
                          ? new Date(
                              letter.joining_date
                            ).toLocaleDateString('en-IN')
                          : '-'}
                      </span>
                    </div>

                  </div>

                  <div className="space-y-3">

                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />

                      <span className="text-slate-600 text-sm">Annual CTC:</span>

                      <span className="font-semibold text-green-700">
                        {formatCurrency(annualCTC)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />

                      <span className="text-slate-600 text-sm">Monthly Salary:</span>

                      <span className="font-semibold text-blue-700">
                        {formatCurrency(monthlyCTC)}
                      </span>
                    </div>

                  </div>

                </div>

                <div className="mt-5 bg-slate-50 rounded-xl p-4">

                  <h3 className="font-semibold text-slate-700 mb-3">
                    Salary Breakdown
                  </h3>

                  <div className="grid grid-cols-3 gap-4 text-sm">

                    <div>
                      <p className="text-slate-500">Basic</p>

                      <p className="font-semibold">
                        {formatCurrency(breakdown.year.basic)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Allowances</p>

                      <p className="font-semibold">
                        {formatCurrency(breakdown.year.allowances)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Deductions</p>

                      <p className="font-semibold text-red-600">
                        {formatCurrency(breakdown.year.deductions)}
                      </p>
                    </div>

                  </div>

                </div>

              </div>

              <div className="p-5 border-t bg-slate-50 flex flex-wrap gap-3">

                <button
                  onClick={() => setSelectedLetter(letter)}
                  className="px-4 py-2 rounded-lg bg-white border hover:bg-slate-100 text-sm font-medium flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View
                </button>

                <button
                  onClick={() => handleDownloadHTML(letter)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>

                <button
                  onClick={() => handlePrint(letter)}
                  className="px-4 py-2 rounded-lg bg-white border hover:bg-slate-100 text-sm font-medium flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>

              </div>

            </div>
          );
        })}

      </div>

      {selectedLetter && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 bg-blue-600 text-white p-5 flex justify-between items-center rounded-t-2xl">

              <div>
                <h2 className="text-xl font-bold">Offer Letter Details</h2>
                <p className="text-sm text-white/80">OL-{String(selectedLetter.id).padStart(4, '0')}</p>
              </div>

              <button onClick={() => setSelectedLetter(null)} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>

            </div>

            <div className="p-6">
              {(() => {
                  const s = normalizeOfferLetter(selectedLetter);
                  const breakdown = calculateSalaryBreakdown(s.basic_salary, s.allowances, s.deductions, s.annualCTC);
                const annualCTC = s.annualCTC;
                const monthlyCTC = s.monthlyCTC;
                return (
                  <div style={{ fontFamily: 'Arial, sans-serif', color: '#1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #2563eb', paddingBottom: 12, marginBottom: 18 }}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>{s.company_name || 'GoalLine'}</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>{s.company_email || 'hr@goalline.com'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div><strong>Date:</strong> {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : ''}</div>
                        <div style={{ color: '#64748b', fontSize: 13 }}>Ref: OL-{String(s.id).padStart(4, '0')}</div>
                      </div>
                    </div>

                    <h2 style={{ margin: '0 0 12px 0' }}>Offer Letter</h2>
                    <p>Dear <strong>{s.candidate_name}</strong>,</p>
                    <p>We are pleased to offer you the position of <strong>{s.designation}</strong> in the <strong>{s.department}</strong> department.</p>

                    <div style={{ marginTop: 12, display: 'flex', gap: 24 }}>
                      <div><strong>Annual CTC:</strong> {formatCurrency(annualCTC)}</div>
                      <div><strong>Monthly Salary:</strong> {formatCurrency(monthlyCTC)}</div>
                      <div><strong>Monthly Net:</strong> {formatCurrency(s.monthlyNet)}</div>
                    </div>

                    <h3 style={{ marginTop: 20 }}>Salary Breakdown</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ textAlign: 'left', padding: 10, border: '1px solid #cbd5e1' }}>Component</th>
                          <th style={{ textAlign: 'right', padding: 10, border: '1px solid #cbd5e1' }}>Yearly</th>
                          <th style={{ textAlign: 'right', padding: 10, border: '1px solid #cbd5e1' }}>Monthly</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1' }}>Basic Salary</td>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'right' }}>{formatCurrency(breakdown.year.basic)}</td>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'right' }}>{formatCurrency(breakdown.month.basic)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1' }}>Allowances</td>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'right' }}>{formatCurrency(breakdown.year.allowances)}</td>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'right' }}>{formatCurrency(breakdown.month.allowances)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1' }}>Deductions (PF & others)</td>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'right' }}>-{formatCurrency(breakdown.year.deductions)}</td>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'right' }}>-{formatCurrency(breakdown.month.deductions)}</td>
                        </tr>
                        <tr style={{ background: '#dcfce7', fontWeight: 700 }}>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1' }}>Net Salary (Take Home)</td>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'right' }}>{formatCurrency(breakdown.year.net)}</td>
                          <td style={{ padding: 10, border: '1px solid #cbd5e1', textAlign: 'right' }}>{formatCurrency(breakdown.month.net)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ marginTop: 20, color: '#64748b' }}>Joining Date: {s.joining_date ? new Date(s.joining_date).toLocaleDateString('en-IN') : '-'}</div>

                    <div style={{ marginTop: 28 }}>Regards,<br/>HR Team<br/>{s.company_name || 'GoalLine'}</div>
                  </div>
                );
              })()}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}