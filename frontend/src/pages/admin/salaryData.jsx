// Centralized data structure for consistent salary calculations across all modules

export const calculateSalarySplit = (ctc) => {
  const ctcValue = Number(ctc) || 0;
  
  return {
    ctc: ctcValue,
    basic_salary: Math.round(ctcValue * 0.50),      // 50% of gross
    hra: Math.round(ctcValue * 0.20),               // 20% of gross
    special_allowance: Math.round(ctcValue * 0.30), // 30% of gross
    employer_pf: Math.round(ctcValue * 0.048),      // 4.8% of CTC
    gratuity: Math.round(ctcValue * 0.0192),        // 1.92% of CTC
  };
};

export const calculateMonthlyBreakdown = (employee) => {
  const basic = Number(employee.basic_salary) || 0;
  const hra = Number(employee.hra) || 0;
  const special_allowance = Number(employee.special_allowance) || 0;
  const employer_pf = Number(employee.employer_pf) || 0;
  const gratuity = Number(employee.gratuity) || 0;

  return {
    // Employee Receives Monthly
    basic_monthly: basic / 12,
    hra_monthly: hra / 12,
    special_allowance_monthly: special_allowance / 12,
    gross_monthly: (basic + hra + special_allowance) / 12,
    
    // Company Pays Extra (Monthly)
    employer_pf_monthly: employer_pf / 12,
    gratuity_monthly: gratuity / 12,
    employer_cost_monthly: (employer_pf + gratuity) / 12,
    
    // Total
    total_ctc_monthly: (basic + hra + special_allowance + employer_pf + gratuity) / 12,
    total_ctc_yearly: basic + hra + special_allowance + employer_pf + gratuity,
  };
};

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

export const salaryStructureTemplate = {
  full_name: '',
  email: '',
  phone: '',
  password: 'Employee@123',
  department: '',
  designation: '',
  joining_date: '',
  qualification: '',
  experience: '',
  ctc: '',
  basic_salary: '',
  hra: '',
  special_allowance: '',
  employer_pf: '',
  gratuity: '',
};