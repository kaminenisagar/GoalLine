/**
 * salaryUtils.js
 * Shared salary calculation helpers
 */

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatCurrencyPrecise(amount) {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  const num = parseFloat(amount);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Split CTC into components
 * 
 * For ₹6,00,000/year CTC (₹50,000/month):
 *   Employer PF (4.8% of CTC) = ₹28,800/year (₹2,400/month)
 *   Gratuity (1.92% of CTC) = ₹11,520/year (₹960/month)
 *   Gross = CTC - PF - Gratuity = ₹5,59,680/year (₹46,640/month)
 *   Basic (50% of Gross) = ₹2,79,840/year (₹23,320/month)
 *   HRA (20% of Gross) = ₹1,11,936/year (₹9,328/month)
 *   Special Allowance (30% of Gross) = ₹1,67,904/year (₹13,992/month)
 */
export function splitCTC(ctc) {
  const total = Number(ctc) || 0;
  
  const employer_pf = Math.round(total * 0.048);
  const gratuity = Math.round(total * 0.0192);
  const gross = total - employer_pf - gratuity;
  
  const basic_salary = Math.round(gross * 0.50);
  const hra = Math.round(gross * 0.20);
  const special_allowance = gross - basic_salary - hra;
  
  return {
    basic_salary,
    hra,
    special_allowance,
    employer_pf,
    gratuity,
  };
}

/**
 * Calculate salary breakdown
 */
export function calculateSalaryBreakdown(annualBasic, annualAllowances, annualDeductions) {
  const basic = parseFloat(annualBasic) || 0;
  const allowances = parseFloat(annualAllowances) || 0;
  const employerCost = parseFloat(annualDeductions) || 0;

  const gross = basic + allowances;
  const net = gross;
  const ctc = gross + employerCost;

  return {
    year: {
      basic,
      allowances,
      employerCost,
      gross,
      net,
      ctc,
    },
    month: {
      basic: basic / 12,
      allowances: allowances / 12,
      employerCost: employerCost / 12,
      gross: gross / 12,
      net: net / 12,
      ctc: ctc / 12,
    },
  };
}

export function yearlyToMonthlyPayroll(emp) {
  return {
    basic_salary: emp.basic_salary ? (Number(emp.basic_salary) / 12).toFixed(2) : '',
    allowances: emp.allowances ? (Number(emp.allowances) / 12).toFixed(2) : '0',
    deductions: emp.deductions ? (Number(emp.deductions) / 12).toFixed(2) : '0',
  };
}

export function calcMonthlyNet(basic, allowances) {
  return Number(basic || 0) + Number(allowances || 0);
}

export function getMonthName(month) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[(month || 1) - 1];
}