import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

dotenv.config();

const COMPANY_NAME = 'GoalLine';
const PORT = parseInt(process.env.PORT || '5005', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'goalline-dev-secret-change-me';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Sagar@123',
  database: process.env.DB_NAME || 'goalline',
  waitForConnections: true,
  connectionLimit: 10,
});

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

let mailTransporter = null;
if (smtpConfigured) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

function generateTrackingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'GL';
  for (let i = 0; i < 8; i++) id += chars[crypto.randomInt(0, chars.length)];
  return id;
}

function generateEmployeeCode() {
  return `EMP${Date.now().toString(36).toUpperCase().slice(-6)}${crypto.randomInt(10, 99)}`;
}

function generateInvoiceNumber() {
  const y = new Date().getFullYear();
  const n = crypto.randomInt(10000, 99999);
  return `INV-${y}-${n}`;
}

function generateTicketId() {
  return `GLC${crypto.randomInt(100000, 999999)}`;
}

async function notify(userId, title, message, type = 'info') {
  await pool.query(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
    [userId, title, message, type]
  );
}

async function notifyAdmins(title, message, type = 'info') {
  const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE");
  for (const a of admins) await notify(a.id, title, message, type);
}

async function sendEmail(to, subject, html) {
  if (!mailTransporter) return false;
  await mailTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  return true;
}

async function createOTP(email, purpose = 'login') {
  const otp = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query(
    'UPDATE otp_verifications SET is_used = TRUE WHERE email = ? AND purpose = ? AND is_used = FALSE',
    [email, purpose]
  );
  await pool.query(
    'INSERT INTO otp_verifications (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
    [email, otp, purpose, expires]
  );
  return otp;
}

const createLoginOTP = (email) => createOTP(email, 'login');

async function sendOtpResponse(email, portal, purpose = 'login') {
  const otp = await createOTP(email, purpose);
  const payload = { message: 'OTP sent', otp: smtpConfigured ? undefined : otp };
  if (!smtpConfigured) {
    console.log(`[DEV OTP ${purpose}] ${email} (${portal || 'any'}): ${otp}`);
    payload.dev_otp = otp;
  } else {
    await sendEmail(email, `GoalLine ${purpose === 'forgot_password' ? 'Password Reset' : 'Login'} OTP`, `<p>Your OTP is <strong>${otp}</strong>. Valid 10 minutes.</p>`);
  }
  return payload;
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function userPayload(row, extras = {}) {
  return {
    id: row.user_id || row.id,
    email: row.email,
    role: row.role,
    full_name: row.full_name,
    phone: row.phone,
    ...extras,
  };
}

async function findUserByEmailRole(email, role) {
  const [rows] = await pool.query(
    'SELECT u.*, e.id AS employee_id, e.employee_code, c.id AS client_id, c.tracking_id AS client_tracking_id FROM users u LEFT JOIN employees e ON e.user_id = u.id LEFT JOIN clients c ON c.user_id = u.id WHERE u.email = ? AND u.role = ?',
    [email, role]
  );
  return rows[0] || null;
}

async function getEmployeeId(userId) {
  const [rows] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
  return rows[0]?.id;
}

async function getClientId(userId) {
  const [rows] = await pool.query('SELECT id FROM clients WHERE user_id = ?', [userId]);
  return rows[0]?.id;
}

async function logProjectStage(projectId, stage, message, createdBy = null) {
  await pool.query(
    'INSERT INTO project_tracking_log (project_id, stage, message, created_by) VALUES (?, ?, ?, ?)',
    [projectId, stage, message, createdBy]
  );
}

async function trackProjectPayload(projectId) {
  const [projects] = await pool.query(
    `SELECT p.*, u.full_name AS client_name, c.tracking_id AS client_tracking_id
     FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id
     WHERE p.id = ?`,
    [projectId]
  );
  if (!projects.length) return null;
  const project = projects[0];
  const [logs] = await pool.query(
    'SELECT * FROM project_tracking_log WHERE project_id = ? ORDER BY created_at ASC',
    [projectId]
  );
  const [invoices] = await pool.query(
    'SELECT * FROM invoices WHERE project_id = ? ORDER BY created_at DESC',
    [projectId]
  );
  return { ...project, tracking_log: logs, invoices };
}

// ─── Middleware ──────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── Auth routes ─────────────────────────────────────────────────────────────

app.get('/api/admin/dashboard', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [[stats]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM employees) AS employees,
      (SELECT COUNT(*) FROM clients) AS clients,
      (SELECT COUNT(*) FROM leave_requests WHERE status = 'pending') AS pending_leaves,
      (SELECT COUNT(*) FROM complaints WHERE status IN ('open','in_progress')) AS open_complaints,
      (SELECT COUNT(*) FROM projects WHERE status = 'development_in_progress') AS active_projects,
      (SELECT COUNT(*) FROM projects WHERE status = 'project_completed') AS completed_projects,
      (SELECT COUNT(*) FROM payroll WHERE MONTH(processed_at) = MONTH(NOW()) AND YEAR(processed_at) = YEAR(NOW())) AS payroll_this_month
  `);
  const [recent_projects] = await pool.query(`
    SELECT p.id, p.title, p.status, p.updated_at, p.deadline, p.start_date, u.full_name AS client_name
    FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id
    ORDER BY p.updated_at DESC LIMIT 8
  `);
  const [project_chart] = await pool.query(`
    SELECT status, COUNT(*) AS count FROM projects GROUP BY status
  `);
  // FIXED: Properly handle GROUP BY with ONLY_FULL_GROUP_BY SQL mode
  const [monthly_projects] = await pool.query(`
    SELECT 
      DATE_FORMAT(created_at, '%b %Y') AS month, 
      COUNT(*) AS count
    FROM projects 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
    ORDER BY MIN(created_at) ASC
  `);
  const [payroll_chart] = await pool.query(`
    SELECT CONCAT(month,'/',year) AS period, SUM(net_salary) AS total
    FROM payroll WHERE year >= YEAR(NOW())-1 GROUP BY year, month ORDER BY year, month LIMIT 12
  `);
  res.json({ stats, recent_projects, project_chart, monthly_projects, payroll_chart });
}));

app.get('/api/admin/clients', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*, u.email, u.full_name, u.phone FROM clients c JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC`
  );
  res.json(rows);
}));

app.post('/api/auth/send-otp', asyncHandler(async (req, res) => {
  const { email, portal } = req.body;
  if (!email || !portal) return res.status(400).json({ error: 'Email and portal required' });
  if (!['admin', 'employee', 'client'].includes(portal)) {
    return res.status(400).json({ error: 'Invalid portal' });
  }
  const user = await findUserByEmailRole(email, portal);
  if (!user) return res.status(404).json({ error: 'No account found for this portal' });
  res.json(await sendOtpResponse(email, portal, 'login'));
}));

app.post('/api/auth/forgot-password/verify-email', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const [users] = await pool.query('SELECT id, role FROM users WHERE email = ? AND is_active = TRUE', [email]);
  if (!users.length) return res.status(404).json({ error: 'Email not registered' });
  if (users[0].role === 'client') return res.status(400).json({ error: 'Clients: contact admin for password reset' });
  const payload = await sendOtpResponse(email, users[0].role, 'forgot_password');
  res.json(payload);
}));

app.post('/api/auth/forgot-password/reset', asyncHandler(async (req, res) => {
  const { email, otp, newPassword, new_password } = req.body;
  const pwd = newPassword || new_password;
  if (!email || !otp || !pwd) return res.status(400).json({ error: 'Email, OTP, and new password required' });
  const [otps] = await pool.query(
    'SELECT * FROM otp_verifications WHERE email = ? AND purpose = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [email, 'forgot_password']
  );
  if (!otps.length || otps[0].otp_code !== otp) return res.status(401).json({ error: 'Invalid or expired OTP' });
  await pool.query('UPDATE otp_verifications SET is_used = TRUE WHERE id = ?', [otps[0].id]);
  const hash = await bcrypt.hash(pwd, 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email]);
  res.json({ message: 'Password reset successful' });
}));
app.put('/api/admin/settings/profile', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { full_name, phone } = req.body;
  await pool.query('UPDATE users SET full_name = ?, phone = ? WHERE id = ?', [full_name, phone || null, req.user.id]);
  res.json({ message: 'Profile updated' });
}));
app.get('/api/admin/settings/profile', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT full_name, phone, email FROM users WHERE id = ?',
    [req.user.id]
  );

  res.json(rows[0]);
}));
app.get(
  '/api/employee/settings/profile',
  authenticate,
  requireRole('employee'),
  asyncHandler(async (req, res) => {
    const [userRows] = await pool.query(
      'SELECT full_name, phone FROM users WHERE id = ?',
      [req.user.id]
    );

    const empId = await getEmployeeId(req.user.id);

    let empData = {};
    if (empId) {
      const [empRows] = await pool.query(
        'SELECT department, designation FROM employees WHERE id = ?',
        [empId]
      );
      empData = empRows[0] || {};
    }

    res.json({
      full_name: userRows[0]?.full_name || '',
      phone: userRows[0]?.phone || '',
      department: empData.department || '',
      designation: empData.designation || '',
    });
  })
);
app.put('/api/admin/settings/password', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(current_password, rows[0].password_hash))) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(new_password, 10), req.user.id]);
  res.json({ message: 'Password updated' });
}));

app.put('/api/employee/settings/profile', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const { full_name, phone, department, designation } = req.body;
  await pool.query('UPDATE users SET full_name = ?, phone = ? WHERE id = ?', [full_name, phone || null, req.user.id]);
  const empId = await getEmployeeId(req.user.id);
  if (empId) await pool.query('UPDATE employees SET department = ?, designation = ? WHERE id = ?', [department, designation, empId]);
  res.json({ message: 'Profile updated' });
}));

app.put('/api/employee/settings/password', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(current_password, rows[0].password_hash))) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(new_password, 10), req.user.id]);
  res.json({ message: 'Password updated' });
}));
// Add these routes to your server.js file

// Employee: Update project status with notes
// Admin: Review submitted work and provide feedback
app.post('/api/admin/projects/:projectId/review', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { decision, feedback, rating } = req.body;
  const projectId = req.params.projectId;
  
  // decision: 'approve', 'reject', 'request_changes'
  if (!['approve', 'reject', 'request_changes'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' });
  }
  
  // Get assignment
  const [assignment] = await pool.query(
    `SELECT pa.*, e.user_id as employee_user_id 
     FROM project_assignments pa 
     JOIN employees e ON e.id = pa.employee_id 
     WHERE pa.project_id = ? AND pa.status = 'submitted'`,
    [projectId]
  );
  
  if (!assignment.length) {
    return res.status(404).json({ error: 'No submitted work found for this project' });
  }
  
  let newStatus = '';
  let projectStatus = '';
  
  switch (decision) {
    case 'approve':
      newStatus = 'approved';
      projectStatus = 'domain_connected';
      break;
    case 'reject':
      newStatus = 'revision';
      projectStatus = 'changes_requested';
      break;
    case 'request_changes':
      newStatus = 'revision';
      projectStatus = 'changes_requested';
      break;
  }
  
  // Update assignment
  await pool.query(
    'UPDATE project_assignments SET status = ?, admin_feedback = ? WHERE project_id = ?',
    [newStatus, feedback || null, projectId]
  );
  
  // Update project status
  await pool.query(
    'UPDATE projects SET status = ?, admin_notes = CONCAT(IFNULL(admin_notes, ""), "\nAdmin Review: ", ?) WHERE id = ?',
    [projectStatus, feedback || decision, projectId]
  );
  
  // Add to tracking log
  await logProjectStage(projectId, projectStatus, `Admin ${decision} work: ${feedback || ''}`, req.user.id);
  
  // Add appraisal rating if approved and rating provided
  if (decision === 'approve' && rating) {
    await pool.query(
      'INSERT INTO appraisals (employee_id, period, rating, feedback, reviewed_by) VALUES (?, ?, ?, ?, ?)',
      [assignment[0].employee_id, DATE_FORMAT(NOW(), '%Y-%m'), rating, feedback || 'Project completed successfully', req.user.id]
    );
  }
  
  // Notify employee
  await notify(
    assignment[0].employee_user_id,
    `Project Review: ${decision === 'approve' ? 'Approved' : 'Changes Requested'}`,
    `Project has been reviewed. ${feedback || ''}`,
    'review'
  );
  
  res.json({ message: `Work ${decision}d successfully` });
}));

// Admin: Provide final feedback on completed project
app.post('/api/admin/projects/:projectId/final-feedback', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { feedback, rating, send_to_client } = req.body;
  const projectId = req.params.projectId;
  
  // Get project and client info
  const [project] = await pool.query(
    `SELECT p.*, c.id as client_id, u.id as client_user_id, u.email as client_email 
     FROM projects p 
     JOIN clients c ON c.id = p.client_id 
     JOIN users u ON u.id = c.user_id 
     WHERE p.id = ?`,
    [projectId]
  );
  
  if (!project.length) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // Store admin feedback
  await pool.query(
    'UPDATE projects SET admin_feedback = ?, admin_rating = ?, completed_at = NOW() WHERE id = ?',
    [feedback, rating || null, projectId]
  );
  
  // Add to tracking log
  await logProjectStage(projectId, 'final_delivery', `Admin final feedback: ${feedback}`, req.user.id);
  
  // Send email to client if requested
  if (send_to_client && project[0].client_email) {
    await sendEmail(
      project[0].client_email,
      `Project Completed: ${project[0].title}`,
      `<h3>Project Completed Successfully</h3>
       <p>Your project "${project[0].title}" has been completed.</p>
       <p>Admin Feedback: ${feedback}</p>
       ${rating ? `<p>Rating: ${rating}/5</p>` : ''}
       <p>Thank you for choosing GoalLine!</p>`
    );
  }
  
  res.json({ message: 'Feedback submitted successfully' });
}));

// Admin: Get projects pending review
app.get('/api/admin/projects/pending-review', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [projects] = await pool.query(
    `SELECT p.id, p.title, p.tracking_id, p.admin_notes,
            pa.id as assignment_id, pa.work_notes, pa.submitted_at,
            u.full_name as employee_name, e.employee_code,
            c.full_name as client_name
     FROM projects p
     JOIN project_assignments pa ON pa.project_id = p.id
     JOIN employees emp ON emp.id = pa.employee_id
     JOIN users e ON e.id = emp.user_id
     JOIN clients cl ON cl.id = p.client_id
     JOIN users c ON c.id = cl.user_id
     WHERE pa.status = 'submitted'
     ORDER BY pa.submitted_at ASC`
  );
  res.json(projects);
}));
// Employee: Update project status with proper workflow
app.put('/api/employee/projects/:assignmentId/status', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const { status, notes, progress_percent } = req.body;
  
  // Valid statuses for employee workflow
  const validStatuses = ['pending', 'in_progress', 'in_review', 'domain_ready', 'domain_submitted', 'completed', 'revision'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  // Get assignment details
  const [assignment] = await pool.query(
    `SELECT pa.*, p.title, p.client_id, p.tracking_id
     FROM project_assignments pa 
     JOIN projects p ON p.id = pa.project_id 
     WHERE pa.id = ? AND pa.employee_id = ?`,
    [req.params.assignmentId, empId]
  );
  
  if (!assignment.length) {
    return res.status(404).json({ error: 'Assignment not found' });
  }
  
  // Update assignment status
  const updates = ['status = ?'];
  const values = [status];
  
  if (notes) {
    updates.push('work_notes = CONCAT(IFNULL(work_notes, ""), "\n[", DATE_FORMAT(NOW(), "%Y-%m-%d %H:%i"), "] ", ?)');
    values.push(notes);
  }
  
  if (progress_percent !== undefined) {
    updates.push('progress_percent = ?');
    values.push(progress_percent);
  }
  
  if (status === 'in_review') {
    updates.push('submitted_at = NOW()');
    updates.push('progress_percent = 100');
  }
  
  values.push(req.params.assignmentId);
  await pool.query(`UPDATE project_assignments SET ${updates.join(', ')} WHERE id = ?`, values);
  
  // Update project status based on workflow
  let projectStatus = '';
  switch (status) {
    case 'in_review':
      projectStatus = 'testing_phase';
      break;
    case 'domain_ready':
      projectStatus = 'development_in_progress';
      break;
    case 'domain_submitted':
      projectStatus = 'domain_connected';
      break;
    case 'completed':
      projectStatus = 'project_completed';
      break;
    case 'revision':
      projectStatus = 'changes_requested';
      break;
    default:
      projectStatus = 'project_started';
  }
  
  await pool.query(
    'UPDATE projects SET status = ?, admin_notes = CONCAT(IFNULL(admin_notes, ""), "\n", ?) WHERE id = ?',
    [projectStatus, `Employee status: ${status} - ${notes || ''}`, assignment[0].project_id]
  );
  
  // Log the status change
  await logProjectStage(assignment[0].project_id, status, `Employee updated status to ${status}: ${notes || ''}`, req.user.id);
  
  // Notify admins when work is submitted for review
  if (status === 'in_review') {
    await notifyAdmins(
      'Work Submitted for Review',
      `Project "${assignment[0].title}" (${assignment[0].tracking_id}) has been submitted for review by ${req.user.full_name}`,
      'submission'
    );
  }
  
  // Notify admins when domain is ready
  if (status === 'domain_ready') {
    await notifyAdmins(
      'Domain Ready for Deployment',
      `Project "${assignment[0].title}" domain is ready. Employee has marked it as ready for domain submission.`,
      'domain'
    );
  }
  
  res.json({ message: 'Status updated successfully' });
}));
// ========== EMPLOYEE ROUTES - FIXED VERSION ==========

const normalizeEmployeeRow = (row) => {
  const basic_salary = row.basic_salary ?? row.salary ?? 0;
  const hra = row.hra ?? 0;
  const pf = row.pf ?? 0;
  const medical_allowance = row.medical_allowance ?? 0;
  const special_allowance = row.special_allowance ?? 0;
  const allowances = row.allowances ?? 0;
  const deductions = row.deductions ?? 0;
  const ctc = row.ctc ?? (Number(basic_salary) + Number(hra) + Number(pf) + Number(medical_allowance) + Number(special_allowance));
  const net_salary = Number(basic_salary) + Number(allowances) - Number(deductions);
  return {
    ...row,
    basic_salary,
    hra,
    pf,
    medical_allowance,
    special_allowance,
    allowances,
    deductions,
    ctc,
    net_salary,
  };
};

// Get all employees
app.get('/api/admin/employees', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT e.*, u.full_name, u.email, u.phone, u.is_active
    FROM employees e 
    JOIN users u ON u.id = e.user_id 
    ORDER BY e.created_at DESC
  `);
  res.json(rows.map(normalizeEmployeeRow));
}));

// Get employees for offer letter dropdown
app.get('/api/admin/employees-for-offer', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT e.*, u.full_name, u.email, u.phone
    FROM employees e
    JOIN users u ON u.id = e.user_id
    WHERE u.is_active = TRUE
    ORDER BY u.full_name
  `);
  res.json(rows.map(normalizeEmployeeRow));
}));

// Create Employee - FIXED VERSION (MySQL compatible)
app.post('/api/admin/employees', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const {
    full_name,
    email,
    phone,
    password,
    department,
    designation,
    joining_date,
    qualification,
    experience,
    // Salary fields
    ctc,
    basic_salary,
    allowances,
    deductions,
    hra,
    pf,
    medical_allowance,
    special_allowance,
    manual_breakdown
  } = req.body;

  console.log('Received employee data:', req.body); // Debug log

  // Validate required fields
  if (!full_name || !email) {
    return res.status(400).json({ error: 'Full name and email are required' });
  }

  // Check if email already exists
  const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser.length > 0) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password || 'Employee@123', 10);

  // Generate employee code
  const [codeCount] = await pool.query('SELECT COUNT(*) as count FROM employees');
  const employeeCode = `EMP${Date.now().toString(36).toUpperCase()}${((codeCount[0].count || 0) + 1).toString().padStart(3, '0')}`;

  // Safe number conversion
  const safeFloat = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const safeString = (value) => {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
  };

  // Start transaction
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Create user
    const [userResult] = await connection.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active) 
       VALUES (?, ?, ?, ?, 'employee', 1)`,
      [full_name, email, safeString(phone), hashedPassword]
    );

    const userId = userResult.insertId;

    // Insert employee with all salary fields
    const [empResult] = await connection.query(
      `INSERT INTO employees (
        user_id, employee_code, department, designation, joining_date,
        qualification, experience, 
        ctc, basic_salary, allowances, deductions, 
        hra, pf, medical_allowance, special_allowance, 
        manual_breakdown
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        employeeCode,
        safeString(department),
        safeString(designation),
        joining_date || null,
        safeString(qualification),
        safeFloat(experience),
        safeFloat(ctc),
        safeFloat(basic_salary),
        safeFloat(allowances),
        safeFloat(deductions),
        safeFloat(hra),
        safeFloat(pf),
        safeFloat(medical_allowance),
        safeFloat(special_allowance),
        manual_breakdown ? 1 : 0
      ]
    );

    await connection.commit();
    connection.release();

    console.log('Employee created successfully:', empResult.insertId);

    res.status(201).json({
      success: true,
      id: empResult.insertId,
      user_id: userId,
      employee_code: employeeCode,
      full_name,
      email,
      message: 'Employee created successfully',
      default_password: password || 'Employee@123'
    });

  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Employee creation error:', err);
    res.status(500).json({ error: 'Failed to create employee: ' + err.message });
  }
}));

// Get single employee
app.get('/api/admin/employees/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const [employees] = await pool.query(
    `SELECT e.*, u.full_name, u.email, u.phone, u.is_active 
     FROM employees e 
     JOIN users u ON u.id = e.user_id 
     WHERE e.id = ?`,
    [req.params.id]
  );
  
  if (employees.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  res.json(normalizeEmployeeRow(employees[0]));
}));

// Update employee
app.put('/api/admin/employees/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const {
    full_name,
    email,
    phone,
    department,
    designation,
    joining_date,
    qualification,
    experience,
    ctc,
    basic_salary,
    allowances,
    deductions,
    hra,
    pf,
    medical_allowance,
    special_allowance,
    manual_breakdown
  } = req.body;

  const safeFloat = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const safeString = (value) => {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
  };

  // Get employee to get user_id
  const [emp] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [req.params.id]);
  if (emp.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Update user
    await connection.query(
      'UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?',
      [full_name, email, safeString(phone), emp[0].user_id]
    );

    // Update employee
    await connection.query(
      `UPDATE employees SET 
        department = ?, designation = ?, joining_date = ?,
        qualification = ?, experience = ?,
        ctc = ?, basic_salary = ?, allowances = ?, deductions = ?,
        hra = ?, pf = ?, medical_allowance = ?, special_allowance = ?,
        manual_breakdown = ?
      WHERE id = ?`,
      [
        safeString(department),
        safeString(designation),
        joining_date || null,
        safeString(qualification),
        safeFloat(experience),
        safeFloat(ctc),
        safeFloat(basic_salary),
        safeFloat(allowances),
        safeFloat(deductions),
        safeFloat(hra),
        safeFloat(pf),
        safeFloat(medical_allowance),
        safeFloat(special_allowance),
        manual_breakdown ? 1 : 0,
        req.params.id
      ]
    );

    await connection.commit();
    connection.release();

    res.json({ success: true, message: 'Employee updated successfully' });

  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Employee update error:', err);
    res.status(500).json({ error: 'Failed to update employee: ' + err.message });
  }
}));

// Toggle employee active status
app.patch('/api/admin/employees/:id/toggle', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const [emp] = await pool.query(
    `SELECT e.user_id, u.is_active 
     FROM employees e 
     JOIN users u ON u.id = e.user_id 
     WHERE e.id = ?`,
    [req.params.id]
  );
  
  if (emp.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  const newStatus = emp[0].is_active ? 0 : 1;
  
  await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, emp[0].user_id]);
  
  res.json({ success: true, message: `Employee ${newStatus ? 'activated' : 'deactivated'} successfully` });
}));

// Delete employee
app.delete('/api/admin/employees/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const [emp] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [req.params.id]);
  
  if (emp.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    // Delete employee record
    await connection.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    // Delete user record
    await connection.query('DELETE FROM users WHERE id = ?', [emp[0].user_id]);
    
    await connection.commit();
    connection.release();
    
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Employee deletion error:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
}));

// Update employee
app.put('/api/admin/employees/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const {
    full_name,
    email,
    phone,
    department,
    designation,
    joining_date,
    qualification,
    experience,
    ctc,
    basic_salary,
    allowances,
    deductions,
    hra,
    pf,
    medical_allowance,
    special_allowance,
    manual_breakdown
  } = req.body;

  const safeFloat = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const safeString = (value) => {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
  };

  // Get employee to get user_id
  const [emp] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [req.params.id]);
  if (emp.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Update user
    await connection.query(
      'UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?',
      [full_name, email, safeString(phone), emp[0].user_id]
    );

    // Update employee
    await connection.query(
      `UPDATE employees SET 
        department = ?, designation = ?, joining_date = ?,
        qualification = ?, experience = ?,
        ctc = ?, basic_salary = ?, allowances = ?, deductions = ?,
        hra = ?, pf = ?, medical_allowance = ?, special_allowance = ?,
        manual_breakdown = ?
      WHERE id = ?`,
      [
        safeString(department),
        safeString(designation),
        joining_date || null,
        safeString(qualification),
        safeFloat(experience),
        safeFloat(ctc),
        safeFloat(basic_salary),
        safeFloat(allowances),
        safeFloat(deductions),
        safeFloat(hra),
        safeFloat(pf),
        safeFloat(medical_allowance),
        safeFloat(special_allowance),
        manual_breakdown ? 1 : 0,
        req.params.id
      ]
    );

    await connection.commit();
    connection.release();

    res.json({ success: true, message: 'Employee updated successfully' });

  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Employee update error:', err);
    res.status(500).json({ error: 'Failed to update employee: ' + err.message });
  }
}));

// Toggle employee active status
app.patch('/api/admin/employees/:id/toggle', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const [emp] = await pool.query(
    `SELECT e.user_id, u.is_active 
     FROM employees e 
     JOIN users u ON u.id = e.user_id 
     WHERE e.id = ?`,
    [req.params.id]
  );
  
  if (emp.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  const newStatus = emp[0].is_active ? 0 : 1;
  
  await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, emp[0].user_id]);
  
  res.json({ success: true, message: `Employee ${newStatus ? 'activated' : 'deactivated'} successfully` });
}));

// Delete employee
app.delete('/api/admin/employees/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const [emp] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [req.params.id]);
  
  if (emp.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    await connection.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    await connection.query('DELETE FROM users WHERE id = ?', [emp[0].user_id]);
    
    await connection.commit();
    connection.release();
    
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('Employee deletion error:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
}));
// Admin: Review domain and provide feedback/reassign
app.post('/api/admin/projects/:projectId/review-domain', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { decision, feedback, reassign_to_employee } = req.body;
  const projectId = req.params.projectId;
  
  // decision: 'approve', 'reject', 'reassign'
  if (!['approve', 'reject', 'reassign'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' });
  }
  
  const [project] = await pool.query(
    `SELECT p.*, pa.id as assignment_id, pa.employee_id, e.user_id as employee_user_id
     FROM projects p
     JOIN project_assignments pa ON pa.project_id = p.id
     JOIN employees e ON e.id = pa.employee_id
     WHERE p.id = ? AND pa.status = 'domain_submitted'`,
    [projectId]
  );
  
  if (!project.length) {
    return res.status(404).json({ error: 'Project not found or not in domain submitted state' });
  }
  
  let newStatus = '';
  let assignmentStatus = '';
  let projectStatus = '';
  
  switch (decision) {
    case 'approve':
      newStatus = 'completed';
      assignmentStatus = 'approved';
      projectStatus = 'final_delivery';
      break;
    case 'reject':
      newStatus = 'revision';
      assignmentStatus = 'revision';
      projectStatus = 'changes_requested';
      break;
    case 'reassign':
      if (!reassign_to_employee) {
        return res.status(400).json({ error: 'Employee ID required for reassign' });
      }
      newStatus = 'reassigned';
      assignmentStatus = 'revision';
      projectStatus = 'changes_requested';
      
      // Update assignment to new employee
      await pool.query(
        'UPDATE project_assignments SET employee_id = ?, status = "assigned", admin_feedback = ? WHERE project_id = ?',
        [reassign_to_employee, feedback, projectId]
      );
      break;
  }
  
  if (decision !== 'reassign') {
    await pool.query(
      'UPDATE project_assignments SET status = ?, admin_feedback = ? WHERE project_id = ?',
      [assignmentStatus, feedback, projectId]
    );
  }
  
  await pool.query(
    'UPDATE projects SET status = ?, admin_feedback = ?, completed_at = ? WHERE id = ?',
    [projectStatus, feedback, decision === 'approve' ? new Date() : null, projectId]
  );
  
  // Add feedback to project
  await logProjectStage(projectId, projectStatus, `Admin domain review: ${decision} - ${feedback}`, req.user.id);
  
  // Notify employee
  let employeeUserId = project[0].employee_user_id;
  if (decision === 'reassign' && reassign_to_employee) {
    const [newEmp] = await pool.query(
      'SELECT user_id FROM employees WHERE id = ?',
      [reassign_to_employee]
    );
    if (newEmp.length) employeeUserId = newEmp[0].user_id;
  }
  
  await notify(
    employeeUserId,
    `Domain Review: ${decision === 'approve' ? 'Approved & Completed' : decision === 'reject' ? 'Changes Required' : 'Reassigned'}`,
    feedback || `Your domain submission has been ${decision}.`,
    'domain_review'
  );
  
  res.json({ message: `Domain ${decision}d successfully` });
}));
// Admin: Get projects ready for domain deployment
app.get('/api/admin/projects/ready-for-domain', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [projects] = await pool.query(
    `SELECT p.id, p.title, p.tracking_id, p.employee_domain_draft, p.employee_domain_hosting,
            u.full_name as employee_name
     FROM projects p
     LEFT JOIN project_assignments pa ON pa.project_id = p.id
     LEFT JOIN employees emp ON emp.id = pa.employee_id
     LEFT JOIN users u ON u.id = emp.user_id
     WHERE p.employee_domain_draft IS NOT NULL 
       AND p.domain_name IS NULL
       AND p.status != 'domain_connected'
     ORDER BY p.updated_at DESC`
  );
  res.json(projects);
}));
app.get('/api/employee/offer-letters', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [rows] = await pool.query(
    `SELECT * FROM offer_letters
     WHERE employee_id = ? OR candidate_email = (SELECT email FROM users WHERE id = ?)
     ORDER BY created_at DESC`,
    [empId, req.user.id]
  );
  res.json(rows.map((r) => ({ ...r, company_name: COMPANY_NAME })));
}));
// Get all offer letters (admin) - FIXED to include all salary fields
app.get('/api/admin/offer-letters', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT ol.*, u.full_name AS created_by_name
    FROM offer_letters ol
    LEFT JOIN users u ON u.id = ol.created_by
    ORDER BY ol.created_at DESC
  `);
  
  // Ensure all numeric fields are properly formatted
  const formattedRows = rows.map(row => ({
    ...row,
    basic_salary: parseFloat(row.basic_salary) || 0,
    allowances: parseFloat(row.allowances) || 0,
    deductions: parseFloat(row.deductions) || 0,
    company_name: COMPANY_NAME
  }));
  
  res.json(formattedRows);
}));

// Get single offer letter (for preview)
app.get('/api/offer-letters/:id', authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM offer_letters WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  
  const ol = rows[0];
  res.json({
    ...ol,
    basic_salary: parseFloat(ol.basic_salary) || 0,
    allowances: parseFloat(ol.allowances) || 0,
    deductions: parseFloat(ol.deductions) || 0,
    company_name: COMPANY_NAME
  });
}));

app.post(
  '/api/admin/offer-letters',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {

    try {

      console.log("BODY DATA => ", req.body);

      const {
        employee_id,
        candidate_name,
        candidate_email,
        designation,
        department,

        basic_salary,
        allowances,

        hra,
        pf,
        medical_allowance,
        special_allowance,

        deductions,

        joining_date,
        content,
      } = req.body;

      const sql = `
        INSERT INTO offer_letters
        (
          employee_id,
          candidate_name,
          candidate_email,
          designation,
          department,

          basic_salary,
          hra,
          pf,
          medical_allowance,
          special_allowance,

          allowances,
          deductions,

          joining_date,
          content,

          status,
          created_by
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        employee_id || null,
        candidate_name || '',
        candidate_email || '',
        designation || '',
        department || '',

        Number(basic_salary || 0),
        Number(hra || 0),
        Number(pf || 0),
        Number(medical_allowance || 0),
        Number(special_allowance || 0),

        Number(allowances || 0),
        Number(deductions || 0),

        joining_date || null,
        content || '',

        'pending',
        req.user.id,
      ];

      console.log(values);

      const [result] = await pool.query(sql, values);

      res.status(201).json({
        success: true,
        id: result.insertId,
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: err.message
      });

    }

  })
);
// Get all offer letters (admin)
app.get('/api/admin/offer-letters', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT ol.*, u.full_name AS created_by_name
    FROM offer_letters ol
    LEFT JOIN users u ON u.id = ol.created_by
    ORDER BY ol.created_at DESC
  `);
  res.json(rows.map((r) => ({ ...r, company_name: COMPANY_NAME })));
}));

// Update offer letter status (admin)
app.patch('/api/admin/offer-letters/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE offer_letters SET status=? WHERE id=?', [status, req.params.id]);
  res.json({ message: 'Updated' });
}));

// Delete offer letter (admin)
app.delete('/api/admin/offer-letters/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM offer_letters WHERE id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
}));

// Download offer letter as printable HTML — accessible to both admin and employee
app.get('/api/offer-letters/:id/download', authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM offer_letters WHERE id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const ol = rows[0];
  const basic   = Number(ol.basic_salary  || 0);
  const allow   = Number(ol.allowances    || 0);
  const deduct  = Number(ol.deductions    || 0);
  const net     = basic + allow - deduct;
  const fmt     = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const joining = ol.joining_date
    ? new Date(ol.joining_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
    : '_______________';
  const issued = new Date(ol.created_at || Date.now())
    .toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
  const bodyText = (ol.content || '').replace(/\n/g, '<br/>') ||
    `We are pleased to offer you the position of <strong>${ol.designation}</strong>${ol.department ? ` in our <strong>${ol.department}</strong> department` : ''} at <strong>${COMPANY_NAME}</strong>.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Offer Letter – ${ol.candidate_name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',serif;background:#f0f4f8;padding:2rem;color:#1a1a2e}
@media print{body{padding:0;background:#fff}.no-print{display:none}}
.page{max-width:760px;margin:0 auto;background:#fff;padding:3rem;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15);position:relative;overflow:hidden}
.wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:5rem;font-weight:900;color:rgba(37,99,235,.04);pointer-events:none;user-select:none;white-space:nowrap}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:1.5rem;border-bottom:3px solid #1e3a5f;margin-bottom:2rem}
.co{font-size:2rem;font-weight:700;color:#1e3a5f;font-family:'Segoe UI',sans-serif}
.co-sub{font-size:.85rem;color:#64748b;margin-top:.2rem}
.ref{text-align:right;font-size:.8rem;color:#64748b}
.ref strong{display:block;font-size:.9rem;color:#1e293b}
h2{text-align:center;font-size:1.35rem;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.1em;margin:1.5rem 0;text-decoration:underline;text-underline-offset:4px}
.to{margin-bottom:1.5rem;font-size:.9rem;line-height:1.7}
.body{font-size:.95rem;line-height:1.9;margin-bottom:1.5rem}
table{width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:.9rem}
th{background:#1e3a5f;color:#fff;padding:.6rem 1rem;text-align:left}
td{padding:.6rem 1rem;border:1px solid #e2e8f0}
tr:nth-child(even) td{background:#f8fafc}
.tot td{background:#1e3a5f!important;color:#fff!important;font-weight:700}
.grn{color:#16a34a}
.red{color:#dc2626}
.terms{margin:1.5rem 0}
.terms h3{font-size:1rem;font-weight:700;color:#1e3a5f;margin-bottom:.5rem}
.terms ul{padding-left:1.5rem;font-size:.875rem;line-height:2.2}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:3rem;padding-top:2rem;border-top:1px solid #e2e8f0}
.sig-line{border-bottom:1px solid #374151;margin:2rem 0 .4rem}
.sig p{font-size:.82rem;color:#64748b;margin-top:.3rem}
.footer{text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid #e2e8f0;font-size:.72rem;color:#94a3b8}
.print-btn{display:block;margin:1.5rem auto;padding:.75rem 2rem;background:#1e3a5f;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer}
</style>
</head>
<body>
<div class="page">
  <div class="wm">${COMPANY_NAME.toUpperCase()}</div>
  <div class="hdr">
    <div><div class="co">${COMPANY_NAME}</div><div class="co-sub">Human Resources Department</div></div>
    <div class="ref"><strong>Date: ${issued}</strong>Ref: OL-${String(ol.id).padStart(4,'0')}</div>
  </div>
  <h2>Offer of Employment</h2>
  <div class="to">
    <strong>To,</strong><br/>
    ${ol.candidate_name}<br/>
    ${ol.candidate_email ? ol.candidate_email : ''}
  </div>
  <div class="body">Dear ${ol.candidate_name},<br/><br/>${bodyText}</div>
  <div>
    <strong>Compensation Structure:</strong>
    <table>
      <thead><tr><th>Component</th><th style="text-align:right">Monthly (₹)</th></tr></thead>
      <tbody>
        <tr><td>Basic Salary</td><td style="text-align:right">${fmt(basic)}</td></tr>
        <tr><td class="grn">+ Allowances (HRA, TA, etc.)</td><td style="text-align:right" class="grn">${fmt(allow)}</td></tr>
        <tr><td class="red">− Deductions (PF, TDS, etc.)</td><td style="text-align:right" class="red">${fmt(deduct)}</td></tr>
        <tr class="tot"><td>Net Monthly Salary (Take Home)</td><td style="text-align:right">${fmt(net)}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="terms">
    <h3>Terms & Conditions:</h3>
    <ul>
      <li>Designation: <strong>${ol.designation}</strong>${ol.department ? ` · Department: <strong>${ol.department}</strong>` : ''}</li>
      <li>Date of Joining: <strong>${joining}</strong></li>
      <li>This offer is contingent upon successful background verification.</li>
      <li>Please sign and return this letter within <strong>7 days</strong> to confirm acceptance.</li>
      <li>Failure to join on the stated date may result in withdrawal of this offer.</li>
    </ul>
  </div>
  <div class="sigs">
    <div class="sig"><div class="sig-line"></div><strong>${COMPANY_NAME}</strong><p>Authorized Signatory · HR Department</p></div>
    <div class="sig"><div class="sig-line"></div><strong>${ol.candidate_name}</strong><p>Candidate Signature · Date: _______________</p></div>
  </div>
  <div class="footer">This is an official offer letter issued by ${COMPANY_NAME}. For any queries contact HR.</div>
</div>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Download as PDF</button>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

app.get('/api/auth/admin/exists', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  res.json({ exists: rows.length > 0 });
}));

app.post('/api/auth/register/admin', asyncHandler(async (req, res) => {
  const [existing] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existing.length) return res.status(400).json({ error: 'Admin account already exists' });
  const { email, password, full_name, phone } = req.body;
  if (!email || !password || !full_name) return res.status(400).json({ error: 'Missing required fields' });
  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO users (email, password_hash, full_name, phone, role, is_verified) VALUES (?, ?, ?, ?, 'admin', TRUE)",
    [email, hash, full_name, phone || null]
  );
  const token = signToken({ id: result.insertId, email, role: 'admin' });
  res.status(201).json({ token, message: 'Admin created' });
}));

app.post('/api/auth/register/employee', asyncHandler(async (req, res) => {
  const { email, password, full_name, phone, department, designation } = req.body;
  if (!email || !password || !full_name) return res.status(400).json({ error: 'Missing required fields' });
  const [dup] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (dup.length) return res.status(400).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [u] = await conn.query(
      "INSERT INTO users (email, password_hash, full_name, phone, role, is_verified) VALUES (?, ?, ?, ?, 'employee', TRUE)",
      [email, hash, full_name, phone || null]
    );
    const code = generateEmployeeCode();
    await conn.query(
      'INSERT INTO employees (user_id, employee_code, department, designation, joining_date) VALUES (?, ?, ?, ?, CURDATE())',
      [u.insertId, code, department || null, designation || null]
    );
    await conn.commit();
    res.status(201).json({ message: 'Employee registered', employee_code: code });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

app.post('/api/auth/register/client', asyncHandler(async (req, res) => {
  const { email, password, full_name, phone, company_name } = req.body;
  if (!email || !password || !full_name) return res.status(400).json({ error: 'Missing required fields' });
  const [dup] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (dup.length) return res.status(400).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const trackingId = generateTrackingId();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [u] = await conn.query(
      "INSERT INTO users (email, password_hash, full_name, phone, role, is_verified) VALUES (?, ?, ?, ?, 'client', TRUE)",
      [email, hash, full_name, phone || null]
    );
    await conn.query(
      'INSERT INTO clients (user_id, company_name, tracking_id) VALUES (?, ?, ?)',
      [u.insertId, company_name || null, trackingId]
    );
    await conn.commit();
    res.status(201).json({ message: 'Client registered', tracking_id: trackingId });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password, portal } = req.body;
  if (!email || !password || !portal) return res.status(400).json({ error: 'Email, password, and portal required' });
  const user = await findUserByEmailRole(email, portal);
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id,
    client_id: user.client_id,
  });
  res.json({
    token,
    user: userPayload(user, {
      employee_id: user.employee_id,
      employee_code: user.employee_code,
      client_id: user.client_id,
      tracking_id: user.client_tracking_id,
    }),
  });
}));

app.post('/api/auth/login-otp', asyncHandler(async (req, res) => {
  const { email, otp, portal } = req.body;
  if (!email || !otp || !portal) return res.status(400).json({ error: 'Email, OTP, and portal required' });
  const [otps] = await pool.query(
    'SELECT * FROM otp_verifications WHERE email = ? AND purpose = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [email, 'login']
  );
  if (!otps.length || otps[0].otp_code !== otp) return res.status(401).json({ error: 'Invalid or expired OTP' });
  await pool.query('UPDATE otp_verifications SET is_used = TRUE WHERE id = ?', [otps[0].id]);
  const user = await findUserByEmailRole(email, portal);
  if (!user) return res.status(404).json({ error: 'Account not found' });
  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id,
    client_id: user.client_id,
  });
  res.json({
    token,
    user: userPayload(user, {
      employee_id: user.employee_id,
      employee_code: user.employee_code,
      client_id: user.client_id,
      tracking_id: user.client_tracking_id,
    }),
  });
}));

app.get('/api/auth/me', authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.*, e.id AS employee_id, e.employee_code, e.department, e.designation,
            c.id AS client_id, c.tracking_id AS client_tracking_id, c.company_name
     FROM users u
     LEFT JOIN employees e ON e.user_id = u.id
     LEFT JOIN clients c ON c.user_id = u.id
     WHERE u.id = ?`,
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  const u = rows[0];
  res.json(userPayload(u, {
    employee_id: u.employee_id,
    employee_code: u.employee_code,
    department: u.department,
    designation: u.designation,
    client_id: u.client_id,
    tracking_id: u.client_tracking_id,
    company_name: u.company_name,
  }));
}));

// ─── Public routes ───────────────────────────────────────────────────────────

app.post('/api/public/enquiry', asyncHandler(async (req, res) => {
  const { full_name, email, phone, company_name, project_type, budget_range, description } = req.body;
  if (!full_name || !email || !description) return res.status(400).json({ error: 'Missing required fields' });
  await pool.query(
    `INSERT INTO enquiries (full_name, email, phone, company_name, project_type, budget_range, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [full_name, email, phone || null, company_name || null, project_type || null, budget_range || null, description]
  );
  await notifyAdmins('New Enquiry', `${full_name} submitted a project enquiry`, 'enquiry');
  res.status(201).json({ message: 'Enquiry submitted' });
}));

app.get('/api/public/track/:identifier', asyncHandler(async (req, res) => {
  const id = decodeURIComponent(req.params.identifier).trim();
  let clientIds = [];
  const [byTrack] = await pool.query('SELECT id FROM clients WHERE tracking_id = ?', [id]);
  if (byTrack.length) clientIds = byTrack.map((c) => c.id);
  else {
    const [byEmail] = await pool.query(
      `SELECT c.id FROM clients c JOIN users u ON u.id = c.user_id WHERE u.email = ?`,
      [id]
    );
    clientIds = byEmail.map((c) => c.id);
  }
  if (!clientIds.length) return res.status(404).json({ error: 'Project not found' });
  const placeholders = clientIds.map(() => '?').join(',');
  const [projects] = await pool.query(
    `SELECT p.*, u.full_name AS client_name FROM projects p
     JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id
     WHERE p.client_id IN (${placeholders}) ORDER BY p.updated_at DESC`,
    clientIds
  );
  const result = [];
  for (const p of projects) {
    const full = await trackProjectPayload(p.id);
    if (full) result.push(full);
  }
  if (!result.length) return res.status(404).json({ error: 'Project not found' });
  res.json(result.length === 1 ? result[0] : result);
}));

app.post('/api/public/complaint', asyncHandler(async (req, res) => {
  const { email, subject, description, project_id } = req.body;
  if (!email || !subject || !description) return res.status(400).json({ error: 'Missing required fields' });
  const ticketId = generateTicketId();
  let clientId = null;
  const [clientUser] = await pool.query(
    `SELECT c.id FROM clients c JOIN users u ON u.id = c.user_id WHERE u.email = ?`,
    [email]
  );
  if (clientUser.length) clientId = clientUser[0].id;
  await pool.query(
    `INSERT INTO complaints (ticket_id, client_id, project_id, email, subject, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ticketId, clientId, project_id || null, email, subject, description]
  );
  await notifyAdmins('New Complaint', `${subject} (${ticketId})`, 'complaint');
  res.status(201).json({ message: 'Complaint submitted', ticket_id: ticketId });
}));

app.post('/api/public/feedback', asyncHandler(async (req, res) => {
  const { email, rating, comment, project_id, project_code, client_name, client_email, message, type } = req.body;
  const em = email || client_email;
  if (!em) return res.status(400).json({ error: 'Email required' });
  let clientId = null;
  let projId = project_id || null;
  const [c] = await pool.query(
    `SELECT c.id FROM clients c JOIN users u ON u.id = c.user_id WHERE u.email = ?`,
    [em]
  );
  if (c.length) clientId = c[0].id;
  if (project_code && !projId) {
    const [p] = await pool.query('SELECT id FROM projects WHERE tracking_id = ?', [project_code]);
    if (p.length) projId = p[0].id;
  }
  await pool.query(
    'INSERT INTO feedback (client_id, project_id, email, rating, comment, type) VALUES (?, ?, ?, ?, ?, ?)',
    [clientId, projId, em, rating || null, comment || message || null, type || 'general']
  );
  res.status(201).json({ message: 'Feedback submitted' });
}));

app.post('/api/public/contact', asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  await pool.query(
    `INSERT INTO enquiries (full_name, email, phone, company_name, project_type, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, phone || null, subject || 'Contact', 'General', `${subject || ''}\n\n${message || ''}`]
  );
  res.status(201).json({ message: 'Message sent' });
}));

app.get('/api/public/landing-stats', asyncHandler(async (_req, res) => {
  const [[employees]] = await pool.query("SELECT COUNT(*) AS c FROM employees");
  const [[clients]] = await pool.query('SELECT COUNT(*) AS c FROM clients');
  const [[projects]] = await pool.query('SELECT COUNT(*) AS c FROM projects');
  const [[tasks]] = await pool.query('SELECT COUNT(*) AS c FROM project_assignments');
  const [[completedTasks]] = await pool.query("SELECT COUNT(*) AS c FROM project_assignments WHERE status IN ('approved','submitted')");
  const [projectChart] = await pool.query('SELECT status, COUNT(*) AS count FROM projects GROUP BY status');
  const [taskChart] = await pool.query('SELECT status, COUNT(*) AS count FROM project_assignments GROUP BY status');
  const [recentProjects] = await pool.query(
    `SELECT p.id, p.title, p.status, p.tracking_id AS project_code FROM projects p ORDER BY p.updated_at DESC LIMIT 4`
  );
  const [reviews] = await pool.query(
    `SELECT f.rating, f.comment AS message, u.full_name AS client_name FROM feedback f
     LEFT JOIN clients c ON c.id = f.client_id LEFT JOIN users u ON u.id = c.user_id
     ORDER BY f.created_at DESC LIMIT 6`
  );
  const [[avg]] = await pool.query('SELECT AVG(rating) AS avg, COUNT(*) AS total FROM feedback WHERE rating IS NOT NULL');
  let chats = [];
  try {
    [chats] = await pool.query(
      `SELECT cm.message,
        COALESCE(u.full_name, cm.guest_name, 'Guest') AS sender_name,
        cm.is_guest, cm.created_at
       FROM chat_messages cm
       LEFT JOIN users u ON u.id = cm.sender_id
       ORDER BY cm.created_at DESC LIMIT 12`
    );
  } catch {
    chats = [];
  }
  let meetings = [];
  try {
    [meetings] = await pool.query(
      `SELECT id, title, description, scheduled_at, duration_minutes, meeting_link
       FROM meetings WHERE scheduled_at >= NOW() ORDER BY scheduled_at ASC LIMIT 6`
    );
  } catch {
    meetings = [];
  }
  const completionRate = tasks.c ? Math.round((completedTasks.c / tasks.c) * 100) : 0;
  res.json({
    counts: { employees: employees.c, clients: clients.c, projects: projects.c, tasks: tasks.c, completedTasks: completedTasks.c },
    taskChart,
    projectChart,
    recentProjects,
    chats,
    meetings,
    averageRating: Number(avg?.avg || 0).toFixed(1),
    totalReviews: avg?.total || 0,
    reviews,
    metrics: { completionRate, activeProjects: projects.c, teamSize: employees.c },
    company: COMPANY_NAME,
  });
}));

app.get('/api/public/meetings', asyncHandler(async (_req, res) => {
  let rows = [];
  try {
    [rows] = await pool.query(
      `SELECT id, title, description, scheduled_at, duration_minutes, meeting_link
       FROM meetings WHERE scheduled_at >= NOW() ORDER BY scheduled_at ASC LIMIT 20`
    );
  } catch {
    rows = [];
  }
  res.json(rows);
}));

app.post('/api/public/guest-chat', asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }
  await pool.query(
    'INSERT INTO chat_messages (guest_name, guest_email, message, is_guest) VALUES (?, ?, ?, TRUE)',
    [name.trim(), email.trim(), message.trim()]
  );
  res.status(201).json({ message: 'Message sent to GoalLine team' });
}));

app.get('/api/public/clients', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, u.full_name AS contact_name, u.email, c.company_name,
     GROUP_CONCAT(p.tracking_id) AS project_codes
     FROM clients c JOIN users u ON u.id = c.user_id
     LEFT JOIN projects p ON p.client_id = c.id
     GROUP BY c.id`
  );
  res.json(rows);
}));

app.get('/api/public/projects', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.tracking_id AS project_code, p.status, u.full_name AS contact_name, u.email AS client_email
     FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id
     ORDER BY p.updated_at DESC LIMIT 100`
  );
  res.json(rows);
}));

app.post('/api/public/submit-project', asyncHandler(async (req, res) => {
  const { contact_name, email, title, description, budget } = req.body;
  if (!contact_name || !email || !title) return res.status(400).json({ error: 'Name, email, and title required' });
  let clientId;
  const [existing] = await pool.query(
    `SELECT c.id FROM clients c JOIN users u ON u.id = c.user_id WHERE u.email = ?`,
    [email]
  );
  if (existing.length) {
    clientId = existing[0].id;
  } else {
    const hash = await bcrypt.hash('GoalLine@' + Date.now(), 10);
    const tid = generateTrackingId();
    const [u] = await pool.query(
      "INSERT INTO users (email, password_hash, full_name, role, is_verified) VALUES (?, ?, ?, 'client', TRUE)",
      [email, hash, contact_name]
    );
    const [c] = await pool.query('INSERT INTO clients (user_id, tracking_id) VALUES (?, ?)', [u.insertId, tid]);
    clientId = c.insertId;
  }
  const projectCode = generateTrackingId();
  const [pr] = await pool.query(
    `INSERT INTO projects (client_id, title, description, budget, tracking_id, status)
     VALUES (?, ?, ?, ?, ?, 'enquiry_received')`,
    [clientId, title, description || '', budget || null, projectCode]
  );
  await logProjectStage(pr.insertId, 'enquiry_received', 'Project submitted from landing page');
  await notifyAdmins('New Project', `${title} from ${contact_name}`, 'project');
  res.status(201).json({ message: 'Project registered', project_code: projectCode, tracking_id: projectCode });
}));

app.post('/api/public/pay-milestone', asyncHandler(async (req, res) => {
  const { project_code, amount, reference_no, client_email, milestone, payment_method, upi_id } = req.body;
  const code = String(project_code || '').trim().toUpperCase();
  const [p] = await pool.query('SELECT id FROM projects WHERE UPPER(tracking_id) = ?', [code]);
  if (!p.length) return res.status(404).json({ error: 'Project not found' });
  const payAmount = Number(amount);
  if (!payAmount || payAmount <= 0) return res.status(400).json({ error: 'Valid amount required' });
  const method = payment_method === 'cash' ? 'cash' : 'upi';
  const ref = method === 'upi' ? (upi_id || reference_no || null) : (reference_no || 'CASH');
  const invNum = generateInvoiceNumber();
  const [inv] = await pool.query(
    'INSERT INTO invoices (project_id, invoice_number, amount, status, paid_amount) VALUES (?, ?, ?, ?, ?)',
    [p[0].id, invNum, payAmount, 'paid', payAmount]
  );
  await pool.query(
    'INSERT INTO payments (invoice_id, amount, payment_method, transaction_ref) VALUES (?, ?, ?, ?)',
    [inv.insertId, payAmount, method, ref]
  );
  res.json({ message: 'Payment recorded', invoice_number: invNum });
}));

// Track by project tracking_id directly
app.get('/api/public/track-project/:code', asyncHandler(async (req, res) => {
  const code = decodeURIComponent(req.params.code).trim().toUpperCase();
  const [p] = await pool.query('SELECT id FROM projects WHERE UPPER(tracking_id) = ?', [code]);
  if (!p.length) return res.status(404).json({ error: 'Project not found' });
  const full = await trackProjectPayload(p[0].id);
  const milestones = (full.invoices || []).map((inv) => ({
    milestone: inv.invoice_number,
    amount: inv.amount,
    status: inv.status === 'paid' ? 'paid' : 'pending',
  }));
  res.json({
    title: full.title,
    status: full.status,
    project_code: full.tracking_id,
    client_visible: !!full.domain_name,
    deployed_url: full.domain_name ? `https://${full.domain_name.replace(/^https?:\/\//, '')}` : null,
    live_domain: full.domain_name,
    hosting_details: full.hosting_details,
    milestones,
    status_updates: (full.tracking_log || []).map((l) => ({
      status: l.stage,
      message: l.message,
      created_at: l.created_at,
    })),
    client_approval: full.client_approval,
  });
}));

// ─── Client routes ───────────────────────────────────────────────────────────

app.get('/api/client/projects', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const clientId = req.user.client_id || (await getClientId(req.user.id));
  const [rows] = await pool.query(
    `SELECT p.* FROM projects p WHERE p.client_id = ? ORDER BY p.updated_at DESC`,
    [clientId]
  );
  res.json(rows);
}));

app.post('/api/client/projects', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const clientId = req.user.client_id || (await getClientId(req.user.id));
  const { title, description, purpose, project_type, budget, deadline, company_name } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const trackingId = generateTrackingId();
  const [result] = await pool.query(
    `INSERT INTO projects (client_id, title, description, project_type, budget, deadline, tracking_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'enquiry_received')`,
    [clientId, title, (description ? description + (purpose ? `\n\nPurpose: ${purpose}` : '') + (company_name ? `\nCompany: ${company_name}` : '') : null), project_type || null, budget || null, deadline || null, trackingId]
  );
  await logProjectStage(result.insertId, 'enquiry_received', 'Client submitted project requirement', req.user.id);
  await notifyAdmins('New Client Project', `${title} submitted by ${req.user.full_name}`, 'project');
  // Email notification to admin
  const [admins] = await pool.query("SELECT u.email FROM users u WHERE u.role = 'admin' AND u.is_active = TRUE LIMIT 3");
  for (const a of admins) {
    await sendEmail(a.email, `New Project: ${title}`, `<p><strong>${req.user.full_name}</strong> submitted a new project: <strong>${title}</strong></p><p>Tracking ID: ${trackingId}</p><p>Budget: ${budget || 'Not specified'}</p>`);
  }
  res.status(201).json({ id: result.insertId, tracking_id: trackingId });
}));

app.post('/api/client/projects/:id/approve', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const clientId = req.user.client_id || (await getClientId(req.user.id));
  const projectId = req.params.id;
  const [p] = await pool.query('SELECT * FROM projects WHERE id = ? AND client_id = ?', [projectId, clientId]);
  if (!p.length) return res.status(404).json({ error: 'Project not found' });
  await pool.query(
    "UPDATE projects SET client_approval = 'approved', status = 'project_completed' WHERE id = ?",
    [projectId]
  );
  await logProjectStage(projectId, 'project_completed', 'Client approved delivery', req.user.id);
  res.json({ message: 'Project approved' });
}));

app.post('/api/client/projects/:id/request-changes', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const clientId = req.user.client_id || (await getClientId(req.user.id));
  const { notes } = req.body;
  const projectId = req.params.id;
  const [p] = await pool.query('SELECT * FROM projects WHERE id = ? AND client_id = ?', [projectId, clientId]);
  if (!p.length) return res.status(404).json({ error: 'Project not found' });
  await pool.query(
    `UPDATE projects SET client_approval = 'changes_requested', client_change_request = ?,
     status = 'changes_requested', admin_notes = CONCAT(IFNULL(admin_notes,''), '\nClient: ', ?) WHERE id = ?`,
    [notes || '', notes || 'Changes requested', projectId]
  );
  await logProjectStage(projectId, 'changes_requested', notes || 'Client requested changes', req.user.id);
  await notifyAdmins('Client Change Request', `Project #${projectId} needs review`, 'project');
  res.json({ message: 'Change request submitted' });
}));

app.post('/api/client/invoices/:id/pay', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const clientId = req.user.client_id || (await getClientId(req.user.id));
  const { payment_method, upi_id, amount } = req.body;
  const [inv] = await pool.query(
    `SELECT i.* FROM invoices i JOIN projects p ON p.id = i.project_id WHERE i.id = ? AND p.client_id = ?`,
    [req.params.id, clientId]
  );
  if (!inv.length) return res.status(404).json({ error: 'Invoice not found' });
  const payAmount = Number(amount) || Number(inv[0].amount) - Number(inv[0].paid_amount || 0);
  if (payAmount <= 0) return res.status(400).json({ error: 'Invalid payment amount' });
  const method = payment_method === 'cash' ? 'cash' : 'upi';
  const ref = method === 'upi' ? (upi_id || null) : 'CASH';
  if (method === 'upi' && !upi_id) return res.status(400).json({ error: 'UPI ID or transaction reference required' });
  await pool.query(
    'INSERT INTO payments (invoice_id, amount, payment_method, transaction_ref) VALUES (?, ?, ?, ?)',
    [req.params.id, payAmount, method, ref]
  );
  const newPaid = Number(inv[0].paid_amount || 0) + payAmount;
  const status = newPaid >= Number(inv[0].amount) ? 'paid' : 'partial';
  await pool.query('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?', [newPaid, status, req.params.id]);
  res.json({ message: 'Payment submitted successfully', status });
}));

app.post('/api/client/feedback', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const clientId = req.user.client_id || (await getClientId(req.user.id));
  const { rating, comment, project_id } = req.body;
  const [u] = await pool.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
  await pool.query(
    'INSERT INTO feedback (client_id, project_id, email, rating, comment, type) VALUES (?, ?, ?, ?, ?, ?)',
    [clientId, project_id || null, u[0].email, rating || null, comment || null, 'general']
  );
  res.status(201).json({ message: 'Feedback submitted' });
}));

app.post('/api/client/complaint', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const clientId = req.user.client_id || (await getClientId(req.user.id));
  const { subject, description, project_id } = req.body;
  if (!subject || !description) return res.status(400).json({ error: 'Subject and description required' });
  const [u] = await pool.query('SELECT email FROM users WHERE id = ?', [req.user.id]);
  const ticketId = generateTicketId();
  await pool.query(
    'INSERT INTO complaints (ticket_id, client_id, project_id, email, subject, description) VALUES (?, ?, ?, ?, ?, ?)',
    [ticketId, clientId, project_id || null, u[0].email, subject, description]
  );
  await notifyAdmins('New Complaint', subject, 'complaint');
  res.status(201).json({ message: 'Complaint registered', ticket_id: ticketId });
}));

app.get('/api/client/payments', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const clientId = req.user.client_id || (await getClientId(req.user.id));
  const [rows] = await pool.query(
    `SELECT i.*, p.title AS project_title, p.tracking_id,
            (SELECT COALESCE(SUM(amount),0) FROM payments pay WHERE pay.invoice_id = i.id) AS paid_total
     FROM invoices i
     JOIN projects p ON p.id = i.project_id
     WHERE p.client_id = ?
     ORDER BY i.created_at DESC`,
    [clientId]
  );
  res.json(rows);
}));

// ─── Admin routes ────────────────────────────────────────────────────────────

app.get('/api/admin/dashboard', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [[stats]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM employees) AS employees,
      (SELECT COUNT(*) FROM clients) AS clients,
      (SELECT COUNT(*) FROM leave_requests WHERE status = 'pending') AS pending_leaves,
      (SELECT COUNT(*) FROM complaints WHERE status IN ('open','in_progress')) AS open_complaints,
      (SELECT COUNT(*) FROM projects WHERE status = 'development_in_progress') AS active_projects,
      (SELECT COUNT(*) FROM projects WHERE status = 'project_completed') AS completed_projects,
      (SELECT COUNT(*) FROM payroll WHERE MONTH(processed_at) = MONTH(NOW()) AND YEAR(processed_at) = YEAR(NOW())) AS payroll_this_month
  `);
  const [recent_projects] = await pool.query(`
    SELECT p.id, p.title, p.status, p.updated_at, p.deadline, p.start_date, u.full_name AS client_name
    FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id
    ORDER BY p.updated_at DESC LIMIT 8
  `);
  const [project_chart] = await pool.query(`
    SELECT status, COUNT(*) AS count FROM projects GROUP BY status
  `);
  const [monthly_projects] = await pool.query(`
    SELECT DATE_FORMAT(created_at, '%b %Y') AS month, COUNT(*) AS count
    FROM projects WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY MIN(created_at) ASC
  `);
  const [payroll_chart] = await pool.query(`
    SELECT CONCAT(month,'/',year) AS period, SUM(net_salary) AS total
    FROM payroll WHERE year >= YEAR(NOW())-1 GROUP BY year, month ORDER BY year, month LIMIT 12
  `);
  res.json({ stats, recent_projects, project_chart, monthly_projects, payroll_chart });
}));

app.get('/api/admin/clients', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*, u.email, u.full_name, u.phone FROM clients c JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC`
  );
  res.json(rows);
}));

app.post('/api/admin/clients', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { email, password, full_name, phone, company_name } = req.body;
  if (!email || !full_name) return res.status(400).json({ error: 'Email and name required' });
  const [dup] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (dup.length) return res.status(400).json({ error: 'Email exists' });
  const hash = password ? await bcrypt.hash(password, 10) : null;
  const trackingId = generateTrackingId();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [u] = await conn.query(
      "INSERT INTO users (email, password_hash, full_name, phone, role, is_verified) VALUES (?, ?, ?, ?, 'client', TRUE)",
      [email, hash, full_name, phone || null]
    );
    const [c] = await conn.query(
      'INSERT INTO clients (user_id, company_name, tracking_id) VALUES (?, ?, ?)',
      [u.insertId, company_name || null, trackingId]
    );
    await conn.commit();
    res.status(201).json({ id: c.insertId, tracking_id: trackingId });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// Removed duplicate legacy admin employee route definitions and old non-API employee endpoint.



// ===============================
// OFFER LETTERS API - FULL CODE
// ===============================

app.post(
  '/api/admin/offer-letters',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const {
      employee_id,
      candidate_name,
      candidate_email,
      designation,
      department,

      basic_salary,
      allowances,
      hra,
      pf,
      medical_allowance,
      special_allowance,
      deductions,

      joining_date,
      content,
    } = req.body;

    if (!candidate_name || !designation) {
      return res.status(400).json({
        error: 'candidate_name and designation required',
      });
    }

    const basicVal = parseFloat(basic_salary || 0);
    const allowVal = parseFloat(allowances || 0);
    const hraVal = parseFloat(hra || 0);
    const pfVal = parseFloat(pf || 0);
    const medicalVal = parseFloat(medical_allowance || 0);
    const specialVal = parseFloat(special_allowance || 0);
    const deductVal = parseFloat(deductions || 0);

    const [result] = await pool.query(
      `
      INSERT INTO offer_letters
      (
        employee_id,
        candidate_name,
        candidate_email,
        designation,
        department,

        basic_salary,
        allowances,
        hra,
        pf,
        medical_allowance,
        special_allowance,
        deductions,

        joining_date,
        content,
        status,
        created_by
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `,
      [
        employee_id || null,
        candidate_name,
        candidate_email || null,
        designation,
        department || null,

        basicVal,
        allowVal,
        hraVal,
        pfVal,
        medicalVal,
        specialVal,
        deductVal,

        joining_date || null,

        content ||
          `We are pleased to offer you the position of ${designation} at ${COMPANY_NAME}.`,

        req.user.id,
      ]
    );

    if (employee_id) {
      const [e] = await pool.query(
        'SELECT user_id FROM employees WHERE id = ?',
        [employee_id]
      );

      if (e.length) {
        await notify(
          e[0].user_id,
          'Offer Letter',
          `You have a new offer letter for ${designation} from ${COMPANY_NAME}`,
          'offer'
        );
      }
    }

    res.status(201).json({
      id: result.insertId,
      message: 'Offer letter created successfully',
    });
  })
);



// ===============================
// GET OFFER LETTERS
// ===============================

app.get(
  '/api/admin/offer-letters',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(`
      SELECT
        ol.*,
        u.full_name AS created_by_name
      FROM offer_letters ol
      LEFT JOIN users u ON u.id = ol.created_by
      ORDER BY ol.created_at DESC
    `);

    const formattedRows = rows.map((row) => ({
      ...row,

      basic_salary: parseFloat(row.basic_salary) || 0,
      allowances: parseFloat(row.allowances) || 0,

      hra: parseFloat(row.hra) || 0,
      pf: parseFloat(row.pf) || 0,
      medical_allowance:
        parseFloat(row.medical_allowance) || 0,
      special_allowance:
        parseFloat(row.special_allowance) || 0,

      deductions: parseFloat(row.deductions) || 0,

      company_name: COMPANY_NAME,
    }));

    res.json(formattedRows);
  })
);



// ===============================
// GET SINGLE OFFER LETTER
// ===============================

app.get(
  '/api/offer-letters/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      'SELECT * FROM offer_letters WHERE id = ?',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Not found',
      });
    }

    const ol = rows[0];

    res.json({
      ...ol,

      basic_salary: parseFloat(ol.basic_salary) || 0,
      allowances: parseFloat(ol.allowances) || 0,

      hra: parseFloat(ol.hra) || 0,
      pf: parseFloat(ol.pf) || 0,
      medical_allowance:
        parseFloat(ol.medical_allowance) || 0,
      special_allowance:
        parseFloat(ol.special_allowance) || 0,

      deductions: parseFloat(ol.deductions) || 0,

      company_name: COMPANY_NAME,
    });
  })
);



// ===============================
// EMPLOYEES API
// ===============================

app.get(
  '/api/admin/employees',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(`
      SELECT
        e.*,
        u.email,
        u.full_name,
        u.phone,
        u.is_active,

        (
          e.basic_salary +
          e.hra +
          e.medical_allowance +
          e.special_allowance -
          e.deductions
        ) AS net_salary

      FROM employees e
      JOIN users u ON u.id = e.user_id
      ORDER BY e.created_at DESC
    `);

    res.json(rows);
  })
);



// ===============================
// CREATE EMPLOYEE
// ===============================

app.post(
  '/api/admin/employees',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const {
      email,
      password,
      full_name,
      phone,

      department,
      designation,
      joining_date,

      qualification,
      experience,

      basic_salary,
      allowances,

      hra,
      pf,
      medical_allowance,
      special_allowance,

      deductions,
    } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({
        error: 'Email and name required',
      });
    }

    const [dup] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (dup.length) {
      return res.status(400).json({
        error: 'Email already exists',
      });
    }

    const hash = await bcrypt.hash(
      password || 'Employee@123',
      10
    );

    const code = generateEmployeeCode();

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [u] = await conn.query(
        `
        INSERT INTO users
        (
          email,
          password_hash,
          full_name,
          phone,
          role,
          is_verified
        )
        VALUES
        (?, ?, ?, ?, 'employee', TRUE)
        `,
        [
          email,
          hash,
          full_name,
          phone || null,
        ]
      );

      const [e] = await conn.query(
        `
        INSERT INTO employees
        (
          user_id,
          employee_code,

          department,
          designation,
          joining_date,

          qualification,
          experience,

          basic_salary,
          allowances,

          hra,
          pf,
          medical_allowance,
          special_allowance,

          deductions
        )
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          u.insertId,
          code,

          department || null,
          designation || null,
          joining_date || null,

          qualification || null,
          parseFloat(experience || 0),

          parseFloat(basic_salary || 0),
          parseFloat(allowances || 0),

          parseFloat(hra || 0),
          parseFloat(pf || 0),
          parseFloat(medical_allowance || 0),
          parseFloat(special_allowance || 0),

          parseFloat(deductions || 0),
        ]
      );

      await conn.commit();

      res.status(201).json({
        id: e.insertId,
        employee_code: code,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);



// ===============================
// UPDATE EMPLOYEE
// ===============================

app.put(
  '/api/admin/employees/:id',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const {
      department,
      designation,
      joining_date,

      qualification,
      experience,

      basic_salary,
      allowances,

      hra,
      pf,
      medical_allowance,
      special_allowance,

      deductions,

      full_name,
      phone,
    } = req.body;

    const [emp] = await pool.query(
      'SELECT user_id FROM employees WHERE id = ?',
      [req.params.id]
    );

    if (!emp.length) {
      return res.status(404).json({
        error: 'Employee not found',
      });
    }

    await pool.query(
      `
      UPDATE employees
      SET
        department = ?,
        designation = ?,
        joining_date = ?,

        qualification = ?,
        experience = ?,

        basic_salary = ?,
        allowances = ?,

        hra = ?,
        pf = ?,
        medical_allowance = ?,
        special_allowance = ?,

        deductions = ?

      WHERE id = ?
      `,
      [
        department || null,
        designation || null,
        joining_date || null,

        qualification || null,
        parseFloat(experience || 0),

        parseFloat(basic_salary || 0),
        parseFloat(allowances || 0),

        parseFloat(hra || 0),
        parseFloat(pf || 0),
        parseFloat(medical_allowance || 0),
        parseFloat(special_allowance || 0),

        parseFloat(deductions || 0),

        req.params.id,
      ]
    );

    await pool.query(
      `
      UPDATE users
      SET
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone)
      WHERE id = ?
      `,
      [
        full_name || null,
        phone || null,
        emp[0].user_id,
      ]
    );

    res.json({
      message: 'Employee updated successfully',
    });
  })
);


// Update employee salary & details
app.put('/api/admin/employees/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const {
    department, designation, joining_date, qualification, experience,
    basic_salary, allowances, deductions, full_name, phone,
    basic, salary,
  } = req.body;
  const [emp] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [req.params.id]);
  if (!emp.length) return res.status(404).json({ error: 'Employee not found' });
  const basicVal  = parseFloat(basic_salary ?? basic ?? salary ?? 0);
  const allowVal  = parseFloat(allowances ?? 0);
  const deductVal = parseFloat(deductions ?? 0);
  await pool.query(
    `UPDATE employees SET department=?, designation=?, joining_date=?,
     qualification=?, experience=?, basic_salary=?, allowances=?, deductions=?
     WHERE id=?`,
    [department||null, designation||null, joining_date||null,
     qualification||null, parseFloat(experience??0),
     basicVal, allowVal, deductVal, req.params.id]
  );
  if (full_name || phone !== undefined) {
    await pool.query(
      'UPDATE users SET full_name=COALESCE(?,full_name), phone=COALESCE(?,phone) WHERE id=?',
      [full_name||null, phone!==undefined?phone:null, emp[0].user_id]
    );
  }
  await notify(emp[0].user_id, 'Profile Updated', 'Your employee profile has been updated.', 'info');
  res.json({ message: 'Employee updated', net_salary: basicVal + allowVal - deductVal });
}));

app.get('/api/admin/projects', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.full_name AS client_name, e.full_name AS assigned_employee
     FROM projects p
     JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id
     LEFT JOIN project_assignments pa ON pa.project_id = p.id
     LEFT JOIN employees emp ON emp.id = pa.employee_id
     LEFT JOIN users e ON e.id = emp.user_id
     ORDER BY p.updated_at DESC`
  );
  res.json(rows);
}));

app.post('/api/admin/projects', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { client_id, title, description, project_type, budget, deadline, status } = req.body;
  if (!client_id || !title) return res.status(400).json({ error: 'client_id and title required' });
  const trackingId = generateTrackingId();
  const [result] = await pool.query(
    `INSERT INTO projects (client_id, title, description, project_type, budget, deadline, tracking_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [client_id, title, description || null, project_type || null, budget || null, deadline || null, trackingId, status || 'enquiry_received']
  );
  await logProjectStage(result.insertId, status || 'enquiry_received', 'Project created by admin', req.user.id);
  res.status(201).json({ id: result.insertId, tracking_id: trackingId });
}));

app.put('/api/admin/projects/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { status, admin_notes, domain_name, hosting_details, start_date, deadline } = req.body;
  const fields = [];
  const vals = [];
  if (status) { fields.push('status = ?'); vals.push(status); }
  if (admin_notes !== undefined) { fields.push('admin_notes = ?'); vals.push(admin_notes); }
  if (domain_name !== undefined) { fields.push('domain_name = ?'); vals.push(domain_name); }
  if (hosting_details !== undefined) { fields.push('hosting_details = ?'); vals.push(hosting_details); }
  if (start_date !== undefined) { fields.push('start_date = ?'); vals.push(start_date || null); }
  if (deadline !== undefined) { fields.push('deadline = ?'); vals.push(deadline || null); }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  await pool.query(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, vals);
  if (status) await logProjectStage(req.params.id, status, admin_notes || `Status updated to ${status}`, req.user.id);
  res.json({ message: 'Project updated' });
}));

app.post('/api/admin/projects/:id/assign', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  await pool.query(
    `INSERT INTO project_assignments (project_id, employee_id, assigned_by, status)
     VALUES (?, ?, ?, 'assigned')
     ON DUPLICATE KEY UPDATE employee_id = VALUES(employee_id), assigned_by = VALUES(assigned_by)`,
    [req.params.id, employee_id, req.user.id]
  );
  const [emp] = await pool.query(
    'SELECT u.id AS user_id FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = ?',
    [employee_id]
  );
  if (emp.length) await notify(emp[0].user_id, 'New Assignment', 'You have been assigned to a project', 'assignment');
  res.json({ message: 'Employee assigned' });
}));

app.post('/api/admin/projects/:id/reassign', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { employee_id, notes } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id required' });
  await pool.query(
    `INSERT INTO project_assignments (project_id, employee_id, assigned_by, status)
     VALUES (?, ?, ?, 'revision')
     ON DUPLICATE KEY UPDATE employee_id = VALUES(employee_id), status = 'revision', assigned_by = VALUES(assigned_by)`,
    [req.params.id, employee_id, req.user.id]
  );
  if (notes) {
    await pool.query(
      `UPDATE projects SET admin_notes = CONCAT(IFNULL(admin_notes,''), '\nReassign: ', ?), status = 'changes_requested' WHERE id = ?`,
      [notes, req.params.id]
    );
  } else {
    await pool.query("UPDATE projects SET status = 'changes_requested' WHERE id = ?", [req.params.id]);
  }
  await logProjectStage(req.params.id, 'changes_requested', notes || 'Reassigned to employee for revisions', req.user.id);
  const [emp] = await pool.query(
    'SELECT u.id AS user_id FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = ?',
    [employee_id]
  );
  if (emp.length) await notify(emp[0].user_id, 'Project Reassigned', notes || 'Please review and update the project', 'assignment');
  res.json({ message: 'Project reassigned to employee' });
}));

app.post('/api/admin/projects/:id/send-domain', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { domain_name, hosting_details, use_employee_draft } = req.body;
  let domain = domain_name;
  let hosting = hosting_details;
  if (use_employee_draft) {
    const [p] = await pool.query(
      'SELECT employee_domain_draft, employee_domain_hosting FROM projects WHERE id = ?',
      [req.params.id]
    );
    if (p.length && p[0].employee_domain_draft) {
      domain = p[0].employee_domain_draft;
      hosting = p[0].employee_domain_hosting || hosting;
    }
  }
  if (!domain) return res.status(400).json({ error: 'domain_name required' });
  await pool.query(
    `UPDATE projects SET domain_name = ?, hosting_details = ?, domain_sent_at = NOW(), status = 'domain_connected' WHERE id = ?`,
    [domain, hosting || null, req.params.id]
  );
  await logProjectStage(req.params.id, 'domain_connected', `Domain sent: ${domain_name}`, req.user.id);
  const [proj] = await pool.query(
    `SELECT u.id AS user_id FROM projects p JOIN clients c ON c.id = p.client_id JOIN users u ON u.id = c.user_id WHERE p.id = ?`,
    [req.params.id]
  );
  if (proj.length) await notify(proj[0].user_id, 'Domain Connected', `Your domain ${domain_name} is ready`, 'domain');
  res.json({ message: 'Domain details sent to client' });
}));

app.get('/api/admin/invoices', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT i.*, p.title AS project_title, p.tracking_id FROM invoices i JOIN projects p ON p.id = i.project_id ORDER BY i.created_at DESC`
  );
  res.json(rows);
}));

app.post('/api/admin/invoices', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { project_id, amount, due_date, notes } = req.body;
  if (!project_id || !amount) return res.status(400).json({ error: 'project_id and amount required' });
  const invNum = generateInvoiceNumber();
  const [result] = await pool.query(
    'INSERT INTO invoices (project_id, invoice_number, amount, due_date, notes) VALUES (?, ?, ?, ?, ?)',
    [project_id, invNum, amount, due_date || null, notes || null]
  );
  res.status(201).json({ id: result.insertId, invoice_number: invNum });
}));

app.get('/api/admin/payments', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT pay.*, i.invoice_number, i.amount AS invoice_amount, p.title AS project_title
     FROM payments pay JOIN invoices i ON i.id = pay.invoice_id JOIN projects p ON p.id = i.project_id
     ORDER BY pay.paid_at DESC`
  );
  res.json(rows);
}));

app.post('/api/admin/payments', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { invoice_id, amount, payment_method, transaction_ref } = req.body;
  if (!invoice_id || !amount) return res.status(400).json({ error: 'invoice_id and amount required' });
  await pool.query(
    'INSERT INTO payments (invoice_id, amount, payment_method, transaction_ref) VALUES (?, ?, ?, ?)',
    [invoice_id, amount, payment_method || null, transaction_ref || null]
  );
  const [inv] = await pool.query('SELECT * FROM invoices WHERE id = ?', [invoice_id]);
  if (inv.length) {
    const paid = parseFloat(amount) + parseFloat(inv[0].paid_amount || 0);
    const status = paid >= parseFloat(inv[0].amount) ? 'paid' : 'partial';
    await pool.query('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?', [paid, status, invoice_id]);
  }
  res.status(201).json({ message: 'Payment recorded' });
}));

function getStandardDailyHours() {
  return 8;
}

function getStandardWeeklyHours() {
  return 40;
}

function getHourlyRate(monthlyBasic, hoursPerMonth = 160) {
  const basic = parseFloat(monthlyBasic || 0);
  return basic > 0 ? Number((basic / hoursPerMonth).toFixed(2)) : 0;
}

function getOvertimeRate(hourlyRate, multiplier = 1.5) {
  return Number((hourlyRate * multiplier).toFixed(2));
}

function getOvertimePay(overtimeHours, overtimeRate) {
  return Number((Math.max(0, overtimeHours) * overtimeRate).toFixed(2));
}

function getWeekRange(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { startDate: dateStr, endDate: dateStr };
  }
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = (d) => d.toISOString().slice(0, 10);
  return { startDate: format(monday), endDate: format(sunday) };
}

function calculateAttendanceMetrics(record) {
  if (!record || !record.check_in || !record.check_out) {
    return {
      ...record,
      total_hours: null,
      overtime_hours: 0,
      hourly_rate: 0,
      overtime_rate: 0,
      overtime_pay: 0,
    };
  }
  const [inH, inM, inS] = record.check_in.split(':').map(Number);
  const [outH, outM, outS] = record.check_out.split(':').map(Number);
  const hoursWorked = ((outH * 3600 + outM * 60 + outS) - (inH * 3600 + inM * 60 + inS)) / 3600;
  const totalHours = Math.max(0, hoursWorked);
  const overtimeHours = Math.max(0, totalHours - getStandardDailyHours());
  const hourlyRate = getHourlyRate(record.basic_salary);
  const overtimeRate = getOvertimeRate(hourlyRate);
  const overtimePay = getOvertimePay(overtimeHours, overtimeRate);

  return {
    ...record,
    total_hours: Number(totalHours.toFixed(2)),
    overtime_hours: Number(overtimeHours.toFixed(2)),
    hourly_rate: hourlyRate,
    overtime_rate: overtimeRate,
    overtime_pay: overtimePay,
  };
}

function enrichAttendanceRows(rows) {
  return rows.map(calculateAttendanceMetrics);
}

app.get('/api/admin/attendance', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { date, week_start } = req.query;
  let sql = `SELECT a.*, u.full_name, e.employee_code, e.basic_salary FROM attendance a
             JOIN employees e ON e.id = a.employee_id JOIN users u ON u.id = e.user_id`;
  const params = [];
  if (week_start) {
    const { startDate, endDate } = getWeekRange(week_start);
    sql += ' WHERE a.date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  } else if (date) {
    sql += ' WHERE a.date = ?';
    params.push(date);
  }
  sql += ' ORDER BY a.date DESC LIMIT 200';
  const [rows] = await pool.query(sql, params);
  res.json(enrichAttendanceRows(rows));
}));

app.get('/api/admin/leaves', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT l.*, u.full_name, e.employee_code FROM leave_requests l
     JOIN employees e ON e.id = l.employee_id JOIN users u ON u.id = e.user_id
     ORDER BY l.created_at DESC`
  );
  res.json(rows);
}));

app.put('/api/admin/leaves/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { status, admin_notes } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await pool.query(
    'UPDATE leave_requests SET status = ?, reviewed_by = ?, admin_notes = ? WHERE id = ?',
    [status, req.user.id, admin_notes || null, req.params.id]
  );
  const [lr] = await pool.query(
    'SELECT e.user_id FROM leave_requests l JOIN employees e ON e.id = l.employee_id WHERE l.id = ?',
    [req.params.id]
  );
  if (lr.length) await notify(lr[0].user_id, 'Leave Update', `Your leave request was ${status}`, 'leave');
  res.json({ message: 'Leave updated' });
}));

app.get('/api/admin/payroll', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.full_name, u.email, u.phone, e.department, e.designation, e.employee_code FROM payroll p
     JOIN employees e ON e.id = p.employee_id JOIN users u ON u.id = e.user_id
     ORDER BY p.year DESC, p.month DESC`
  );
  res.json(rows);
}));
app.post(
  '/api/admin/payroll',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {

    const {
      employee_id,
      month,
      year,
      basic_salary,
      hra,
      pf,
      medical_allowance,
      special_allowance,
      allowances,
      deductions,
      net_salary,
      notes
    } = req.body;

    if (!employee_id || !month || !year) {
      return res.status(400).json({
        error: 'Missing payroll fields'
      });
    }

    const basic = parseFloat(basic_salary || 0);
    const hraAmount = parseFloat(hra || 0);
    const pfAmount = parseFloat(pf || 0);
    const medical = parseFloat(medical_allowance || 0);
    const special = parseFloat(special_allowance || 0);
    const allow = parseFloat(allowances || 0);
    const deduct = parseFloat(deductions || 0);

    const net =
      basic +
      hraAmount +
      medical +
      special +
      allow -
      pfAmount -
      deduct;

    const [result] = await pool.query(
      `
      INSERT INTO payroll (
        employee_id,
        month,
        year,
        basic_salary,
        hra,
        pf,
        medical_allowance,
        special_allowance,
        allowances,
        deductions,
        net_salary,
        notes,
        company_name,
        status,
        processed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', NOW())

      ON DUPLICATE KEY UPDATE
        basic_salary = VALUES(basic_salary),
        hra = VALUES(hra),
        pf = VALUES(pf),
        medical_allowance = VALUES(medical_allowance),
        special_allowance = VALUES(special_allowance),
        allowances = VALUES(allowances),
        deductions = VALUES(deductions),
        net_salary = VALUES(net_salary),
        notes = VALUES(notes),
        company_name = VALUES(company_name),
        processed_at = NOW()
      `,
      [
        employee_id,
        month,
        year,
        basic,
        hraAmount,
        pfAmount,
        medical,
        special,
        allow,
        deduct,
        net,
        notes || '',
        COMPANY_NAME
      ]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      net_salary: net
    });

  })
);
// app.post('/api/admin/payroll', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
//   const { employee_id, month, year, basic_salary, allowances, deductions } = req.body;
//   if (!employee_id || !month || !year || basic_salary === undefined) {
//     return res.status(400).json({ error: 'Missing payroll fields' });
//   }
//   const basic = parseFloat(basic_salary);
//   const allow = parseFloat(allowances || 0);
//   const deduct = parseFloat(deductions || 0);
//   const net = basic + allow - deduct;
//   const [result] = await pool.query(
//     `INSERT INTO payroll (employee_id, month, year, basic_salary, allowances, deductions, net_salary, company_name, status, processed_at)
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processed', NOW())
//      ON DUPLICATE KEY UPDATE basic_salary = VALUES(basic_salary), allowances = VALUES(allowances),
//      deductions = VALUES(deductions), net_salary = VALUES(net_salary), company_name = VALUES(company_name), processed_at = NOW()`,
//     [employee_id, month, year, basic, allow, deduct, net, COMPANY_NAME]
//   );
//   const [emp] = await pool.query('SELECT user_id, e.id FROM employees e JOIN users u ON u.id = e.user_id WHERE e.id = ?', [employee_id]);
//   if (emp.length) {
//     await notify(emp[0].user_id, 'Payslip Ready', `${COMPANY_NAME} payroll for ${month}/${year} - Net: ₹${net}`, 'payroll');
//     const [empUser] = await pool.query('SELECT email, full_name FROM users WHERE id = ?', [emp[0].user_id]);
//     if (empUser.length) {
//       await sendEmail(empUser[0].email, `Payslip Ready - ${month}/${year}`, `<p>Dear ${empUser[0].full_name},</p><p>Your payslip for <strong>${month}/${year}</strong> is ready.</p><p>Net Salary: <strong>₹${net}</strong></p><p>Basic: ₹${basic} | Allowances: ₹${allow} | Deductions: ₹${deduct}</p>`);
//     }
//   }
//   res.status(201).json({ id: result.insertId, net_salary: net, company_name: COMPANY_NAME });
// }));

app.get('/api/admin/complaints', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM complaints ORDER BY created_at DESC');
  res.json(rows);
}));

app.put('/api/admin/complaints/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { status, admin_response } = req.body;
  await pool.query(
    'UPDATE complaints SET status = ?, admin_response = ? WHERE id = ?',
    [status || 'in_progress', admin_response || null, req.params.id]
  );
  res.json({ message: 'Complaint updated' });
}));

app.get('/api/admin/notifications', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(rows);
}));

app.get('/api/admin/reports', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [[summary]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM projects WHERE status = 'final_delivery') AS completed_projects,
      (SELECT COUNT(*) FROM projects WHERE status NOT IN ('final_delivery','cancelled')) AS active_projects,
      (SELECT COALESCE(SUM(amount),0) FROM invoices) AS total_invoiced,
      (SELECT COALESCE(SUM(amount),0) FROM payments) AS total_collected,
      (SELECT COUNT(*) FROM employees) AS total_employees,
      (SELECT COUNT(*) FROM clients) AS total_clients,
      (SELECT COUNT(*) FROM enquiries WHERE status = 'pending') AS pending_enquiries
  `);
  const [byStatus] = await pool.query('SELECT status, COUNT(*) AS count FROM projects GROUP BY status');
  const [monthlyRevenue] = await pool.query(
    `SELECT YEAR(paid_at) AS year, MONTH(paid_at) AS month, SUM(amount) AS revenue
     FROM payments GROUP BY YEAR(paid_at), MONTH(paid_at) ORDER BY year DESC, month DESC LIMIT 12`
  );
  res.json({ summary, projects_by_status: byStatus, monthly_revenue: monthlyRevenue });
}));

app.get('/api/admin/meetings', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM meetings ORDER BY scheduled_at DESC');
  res.json(rows);
}));

app.post('/api/admin/meetings', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { title, description, scheduled_at, duration_minutes, meeting_link, attendee_ids } = req.body;
  if (!title || !scheduled_at) return res.status(400).json({ error: 'title and scheduled_at required' });
  const dur = duration_minutes || 60;
  const startTime = new Date(scheduled_at);
  const endTime = new Date(startTime.getTime() + dur * 60000);
  // Check for conflicting meetings at same time
  const [existing] = await pool.query(
    `SELECT id, title, scheduled_at FROM meetings WHERE DATE(scheduled_at) = DATE(?) AND ABS(TIMESTAMPDIFF(MINUTE, scheduled_at, ?)) < ?`,
    [scheduled_at, scheduled_at, dur]
  );
  if (existing.length) {
    return res.status(409).json({
      error: `Time conflict: "${existing[0].title}" is already scheduled at ${new Date(existing[0].scheduled_at).toLocaleString()}. Please choose a different time.`,
      conflict: true,
      conflicting_meeting: existing[0],
    });
  }
  const [result] = await pool.query(
    `INSERT INTO meetings (title, description, scheduled_at, duration_minutes, meeting_link, created_by, attendee_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, scheduled_at, dur, meeting_link || null, req.user.id, JSON.stringify(attendee_ids || [])]
  );
  // Notify all attendees
  const ids = attendee_ids || [];
  for (const uid of ids) {
    await notify(uid, 'Meeting Scheduled', `You have a meeting: "${title}" on ${new Date(scheduled_at).toLocaleString()}`, 'meeting');
  }
  res.status(201).json({ id: result.insertId });
}));

app.delete('/api/admin/meetings/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM meetings WHERE id = ?', [req.params.id]);
  res.json({ message: 'Meeting deleted' });
}));

// ─── Employee routes ─────────────────────────────────────────────────────────

app.get('/api/employee/dashboard', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [[stats]] = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM project_assignments WHERE employee_id = ? AND status IN ('assigned','in_progress','revision')) AS active_tasks,
      (SELECT COUNT(*) FROM project_assignments WHERE employee_id = ? AND status IN ('submitted','approved')) AS completed_tasks,
      (SELECT COUNT(*) FROM leave_requests WHERE employee_id = ? AND status = 'approved') AS approved_leaves,
      (SELECT COUNT(*) FROM attendance WHERE employee_id = ? AND status = 'present' AND MONTH(date) = MONTH(NOW())) AS present_days_this_month`,
    [empId, empId, empId, empId]
  );
  const [assignments] = await pool.query(
    `SELECT pa.id, pa.status, pa.progress_percent, p.title, p.tracking_id, p.deadline, p.start_date
     FROM project_assignments pa JOIN projects p ON p.id = pa.project_id
     WHERE pa.employee_id = ? ORDER BY pa.created_at DESC LIMIT 5`,
    [empId]
  );
  const [upcoming_meetings] = await pool.query(
    `SELECT * FROM meetings WHERE scheduled_at >= NOW() AND (attendee_ids LIKE ? OR JSON_LENGTH(attendee_ids) = 0)
     ORDER BY scheduled_at ASC LIMIT 5`,
    [`%${req.user.id}%`]
  );
  const [progress_chart] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM project_assignments WHERE employee_id = ? GROUP BY status`,
    [empId]
  );
  res.json({ stats, assignments, upcoming_meetings, progress_chart });
}));

app.get('/api/employee/projects', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [rows] = await pool.query(
    `SELECT pa.id, pa.project_id, pa.status, pa.progress_percent, pa.work_notes,
            pa.admin_feedback, pa.admin_rating,
            p.title, p.tracking_id, p.deadline, p.description, p.admin_notes
     FROM project_assignments pa JOIN projects p ON p.id = pa.project_id
     WHERE pa.employee_id = ? ORDER BY pa.created_at DESC`,
    [empId]
  );
  res.json(rows);
}));

app.put('/api/employee/projects/:id/progress', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const { progress_percent, status } = req.body;
  await pool.query(
    'UPDATE project_assignments SET progress_percent = ?, status = ? WHERE id = ? AND employee_id = ?',
    [progress_percent ?? 0, status || 'in_progress', req.params.id, empId]
  );
  res.json({ message: 'Progress updated' });
}));

app.post('/api/employee/projects/:projectId/submit-domain', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const projectId = req.params.projectId;
  const { domain_name, hosting_details } = req.body;
  if (!domain_name) return res.status(400).json({ error: 'Domain name required' });
  const [pa] = await pool.query(
    'SELECT id FROM project_assignments WHERE project_id = ? AND employee_id = ?',
    [projectId, empId]
  );
  if (!pa.length) return res.status(403).json({ error: 'Not assigned to this project' });
  await pool.query(
    `UPDATE projects SET employee_domain_draft = ?, employee_domain_hosting = ? WHERE id = ?`,
    [domain_name, hosting_details || null, projectId]
  );
  await logProjectStage(projectId, 'domain_connected', `Employee submitted domain draft: ${domain_name}`, req.user.id);
  await notifyAdmins('Domain Draft', `Employee submitted domain for project #${projectId}`, 'domain');
  res.json({ message: 'Domain submitted to admin for review' });
}));

app.post('/api/employee/projects/:id/submit', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const projectId = req.params.id;
  const { file_url, notes } = req.body;
  await pool.query(
    `UPDATE project_assignments SET status = 'submitted', work_notes = ?, submitted_at = NOW()
     WHERE project_id = ? AND employee_id = ?`,
    [`${notes || ''} ${file_url || ''}`.trim(), projectId, empId]
  );
  await notifyAdmins('Work Submitted', `Project #${projectId} submitted for review`, 'submission');
  res.json({ message: 'Work submitted' });
}));

app.get('/api/employee/attendance', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [rows] = await pool.query(
    'SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC LIMIT 60',
    [empId]
  );
  res.json(enrichAttendanceRows(rows));
}));

app.get('/api/employee/attendance/today', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const today = new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ? LIMIT 1',
    [empId, today]
  );
  const enriched = enrichAttendanceRows(rows);
  res.json(enriched[0] || null);
}));

app.post('/api/employee/attendance/check-in', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const today = new Date().toISOString().slice(0, 10);
  const now   = new Date().toTimeString().slice(0, 8);
  // Check if already punched in
  const [existing] = await pool.query(
    'SELECT check_in, check_out FROM attendance WHERE employee_id=? AND date=?', [empId, today]
  );
  if (existing.length && existing[0].check_in) {
    return res.status(400).json({
      error: 'Already punched in today',
      check_in: existing[0].check_in,
      check_out: existing[0].check_out,
    });
  }
  await pool.query(
    `INSERT INTO attendance (employee_id, date, check_in, status) VALUES (?, ?, ?, 'present')
     ON DUPLICATE KEY UPDATE check_in = IFNULL(check_in, VALUES(check_in))`,
    [empId, today, now]
  );
  await notifyAdmins('Punch In', `${req.user.full_name} punched in at ${now}`, 'attendance');
  res.json({ message: 'Punched in successfully', date: today, time: now });
}));

app.post('/api/employee/attendance/check-out', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const today = new Date().toISOString().slice(0, 10);
  const now   = new Date().toTimeString().slice(0, 8);
  // Must punch in first
  const [existing] = await pool.query(
    'SELECT check_in, check_out FROM attendance WHERE employee_id=? AND date=?', [empId, today]
  );
  if (!existing.length || !existing[0].check_in) {
    return res.status(400).json({ error: 'You have not punched in today' });
  }
  if (existing[0].check_out) {
    return res.status(400).json({ error: 'Already punched out today', check_out: existing[0].check_out });
  }
  await pool.query(
    'UPDATE attendance SET check_out=? WHERE employee_id=? AND date=?',
    [now, empId, today]
  );
  // Calculate hours worked
  const [inH, inM, inS]   = existing[0].check_in.split(':').map(Number);
  const [outH, outM, outS] = now.split(':').map(Number);
  const hoursWorked = ((outH*3600+outM*60+outS) - (inH*3600+inM*60+inS)) / 3600;
  const totalHours = Math.max(0, hoursWorked);
  res.json({
    message: 'Punched out successfully',
    date: today,
    time: now,
    hours_worked: totalHours.toFixed(2),
    total_hours: totalHours.toFixed(2),
    overtime_hours: Math.max(0, totalHours - 8).toFixed(2),
  });
}));

app.get('/api/employee/leaves', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [rows] = await pool.query('SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY created_at DESC', [empId]);
  res.json(rows);
}));

app.post('/api/employee/leaves', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const { leave_type, start_date, end_date, reason } = req.body;
  const [result] = await pool.query(
    'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)',
    [empId, leave_type, start_date, end_date, reason]
  );
  await notifyAdmins('Leave Request', `New ${leave_type} leave request`, 'leave');
  res.status(201).json({ id: result.insertId });
}));

app.get('/api/employee/early-leave', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [rows] = await pool.query('SELECT * FROM early_leave_requests WHERE employee_id = ? ORDER BY created_at DESC', [empId]);
  res.json(rows);
}));

app.post('/api/employee/early-leave', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const { date, leave_time, reason } = req.body;
  const [result] = await pool.query(
    'INSERT INTO early_leave_requests (employee_id, date, leave_time, reason) VALUES (?, ?, ?, ?)',
    [empId, date, leave_time || null, reason || null]
  );
  res.status(201).json({ id: result.insertId });
}));

app.put('/api/employee/early-leave/:id', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const { date, leave_time, reason } = req.body;
  await pool.query(
    'UPDATE early_leave_requests SET date = ?, leave_time = ?, reason = ? WHERE id = ? AND employee_id = ?',
    [date, leave_time || null, reason || null, req.params.id, empId]
  );
  res.json({ message: 'Updated' });
}));

app.delete('/api/employee/early-leave/:id', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  await pool.query(
    "DELETE FROM early_leave_requests WHERE id = ? AND employee_id = ? AND status = 'pending'",
    [req.params.id, empId]
  );
  res.json({ message: 'Deleted' });
}));

app.get('/api/employee/payroll', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [rows] = await pool.query(
    `SELECT *, company_name AS payslip_company FROM payroll WHERE employee_id = ? ORDER BY year DESC, month DESC`,
    [empId]
  );
  const enriched = rows.map((r) => ({
    ...r,
    company_name: r.company_name || COMPANY_NAME,
    payslip_url: `/api/employee/payroll/${r.id}/payslip`,
  }));
  res.json(enriched);
}));

app.get('/api/employee/payroll/:id/payslip', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [rows] = await pool.query(
    `SELECT p.*, u.full_name, e.employee_code FROM payroll p
     JOIN employees e ON e.id = p.employee_id JOIN users u ON u.id = e.user_id
     WHERE p.id = ? AND p.employee_id = ?`,
    [req.params.id, empId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Payslip not found' });
  const p = rows[0];
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Payslip ${p.month}/${p.year}</title>
<style>
body{font-family:Arial,sans-serif;margin:0;padding:40px;background:#fff;color:#333}
.header{border-bottom:3px solid #f45b8c;padding-bottom:20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
.company{font-size:24px;font-weight:bold;color:#f45b8c}
.subtitle{color:#666;font-size:12px}
.section{margin:20px 0}
.section-title{font-size:14px;font-weight:bold;color:#333;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:10px}
.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f9f9f9;font-size:13px}
.total-row{display:flex;justify-content:space-between;padding:10px 0;font-weight:bold;font-size:16px;color:#f45b8c;border-top:2px solid #f45b8c;margin-top:10px}
.badge{background:#f45b8c;color:#fff;padding:4px 12px;border-radius:12px;font-size:11px;text-transform:uppercase}
.footer{margin-top:40px;text-align:center;color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:20px}
</style></head>
<body>
<div class="header">
  <div>
    <div class="company">${p.company_name || COMPANY_NAME}</div>
    <div class="subtitle">Official Payslip</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:bold">Payslip</div>
    <div class="subtitle">Period: ${p.month}/${p.year}</div>
    <span class="badge">${p.status || 'processed'}</span>
  </div>
</div>
<div class="section">
  <div class="section-title">Employee Information</div>
  <div class="row"><span>Employee Name</span><span>${p.full_name}</span></div>
  <div class="row"><span>Employee Code</span><span>${p.employee_code}</span></div>
  <div class="row"><span>Pay Period</span><span>${p.month}/${p.year}</span></div>
  <div class="row"><span>Processed On</span><span>${new Date(p.processed_at || p.created_at).toLocaleDateString()}</span></div>
</div>
  <div class="section">
    <div class="section-title">Salary Breakdown</div>
    <div class="row"><span>Basic Salary</span><span>₹${Number(p.basic_salary).toLocaleString()}</span></div>
    <div class="row"><span>Allowances</span><span>+ ₹${Number((Number(p.allowances) || 0) + (Number(p.hra) || 0) + (Number(p.medical_allowance) || 0) + (Number(p.special_allowance) || 0)).toLocaleString()}</span></div>
    <div class="row"><span>Gross Salary</span><span>₹${Number((Number(p.basic_salary) || 0) + ((Number(p.allowances) || 0) + (Number(p.hra) || 0) + (Number(p.medical_allowance) || 0) + (Number(p.special_allowance) || 0))).toLocaleString()}</span></div>
    <div class="row"><span>PF</span><span>- ₹${Number(p.pf || 0).toLocaleString()}</span></div>
    <div class="row"><span>Other Deductions</span><span>- ₹${Number(p.deductions || 0).toLocaleString()}</span></div>
    <div class="row"><span>Total Deductions</span><span>- ₹${Number((Number(p.pf) || 0) + (Number(p.deductions) || 0)).toLocaleString()}</span></div>
    <div class="total-row"><span>Net Salary</span><span>₹${Number(p.net_salary).toLocaleString()}</span></div>
  </div>
<div class="footer">This is a computer-generated payslip by ${p.company_name || COMPANY_NAME}. No signature required.</div>
</body></html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

app.get('/api/employee/appraisals', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [rows] = await pool.query('SELECT * FROM appraisals WHERE employee_id = ? ORDER BY created_at DESC', [empId]);
  res.json(rows);
}));

app.get('/api/employee/promotions', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [rows] = await pool.query('SELECT * FROM promotions WHERE employee_id = ? ORDER BY created_at DESC', [empId]);
  res.json(rows);
}));

app.get('/api/employee/performance', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const empId = req.user.employee_id || (await getEmployeeId(req.user.id));
  const [[tasks]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status IN ('submitted','approved') THEN 1 ELSE 0 END) AS completed,
            AVG(progress_percent) AS avg_progress
     FROM project_assignments WHERE employee_id = ?`,
    [empId]
  );
  const [latestAppraisal] = await pool.query(
    'SELECT rating, period, feedback FROM appraisals WHERE employee_id = ? ORDER BY created_at DESC LIMIT 1',
    [empId]
  );
  const [attendanceRate] = await pool.query(
    `SELECT COUNT(*) AS days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_days
     FROM attendance WHERE employee_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
    [empId]
  );
  res.json({
    tasks,
    latest_appraisal: latestAppraisal[0] || null,
    attendance_last_30_days: attendanceRate[0],
    company: COMPANY_NAME,
  });
}));

// ─── Individual Chat ─────────────────────────────────────────────────────────
// Every message is stored with sender_id + recipient_id so conversations are
// truly private between two users.  Admin can chat with any employee or client;
// employees/clients always chat with admin (recipient = first admin user).

async function getAdminId() {
  const [rows] = await pool.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE LIMIT 1");
  return rows[0]?.id || null;
}

// Helper: fetch conversation between two user ids (ordered oldest→newest, last 200)
async function fetchConversation(userA, userB) {
  const [rows] = await pool.query(
    `SELECT cm.id, cm.message, cm.created_at, cm.is_guest, cm.guest_name, cm.guest_email,
            cm.sender_id, cm.recipient_id,
            u.full_name AS sender_name, u.role AS sender_role
     FROM chat_messages cm
     LEFT JOIN users u ON u.id = cm.sender_id
     WHERE (cm.sender_id = ? AND cm.recipient_id = ?)
        OR (cm.sender_id = ? AND cm.recipient_id = ?)
     ORDER BY cm.created_at ASC LIMIT 200`,
    [userA, userB, userB, userA]
  );
  return rows;
}

// GET /api/chat/messages — admin: pass ?with=<userId>; others: gets their convo with admin
app.get('/api/chat/messages', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    const otherId = parseInt(req.query.with);
    if (!otherId) return res.json([]);
    const rows = await fetchConversation(req.user.id, otherId);
    return res.json(rows);
  }
  // Employee / client — always talking to admin
  const adminId = await getAdminId();
  if (!adminId) return res.json([]);
  const rows = await fetchConversation(req.user.id, adminId);
  res.json(rows);
}));

// POST /api/admin/chat — admin sends to a specific user (?to=<userId> or body.recipient_id)
app.post('/api/admin/chat', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { message, recipient_id } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
  if (!recipient_id) return res.status(400).json({ error: 'recipient_id required' });
  await pool.query(
    'INSERT INTO chat_messages (sender_id, recipient_id, message, is_guest) VALUES (?, ?, ?, FALSE)',
    [req.user.id, recipient_id, message.trim()]
  );
  res.status(201).json({ message: 'Posted' });
}));

// POST /api/employee/chat — employee sends to admin
app.post('/api/employee/chat', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
  const adminId = await getAdminId();
  if (!adminId) return res.status(503).json({ error: 'No admin available' });
  await pool.query(
    'INSERT INTO chat_messages (sender_id, recipient_id, message, is_guest) VALUES (?, ?, ?, FALSE)',
    [req.user.id, adminId, message.trim()]
  );
  res.status(201).json({ message: 'Posted' });
}));

// Client chat (authenticated)
app.get('/api/client/chat/messages', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const adminId = await getAdminId();
  if (!adminId) return res.json([]);
  const rows = await fetchConversation(req.user.id, adminId);
  res.json(rows);
}));

app.post('/api/client/chat', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
  const adminId = await getAdminId();
  if (!adminId) return res.status(503).json({ error: 'No admin available' });
  await pool.query(
    'INSERT INTO chat_messages (sender_id, recipient_id, message, is_guest) VALUES (?, ?, ?, FALSE)',
    [req.user.id, adminId, message.trim()]
  );
  res.status(201).json({ message: 'Posted' });
}));

app.get('/api/admin/early-leave', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT el.*, u.full_name, e.employee_code FROM early_leave_requests el
     JOIN employees e ON e.id = el.employee_id JOIN users u ON u.id = e.user_id
     ORDER BY el.created_at DESC`
  );
  res.json(rows);
}));

app.put('/api/admin/early-leave/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE early_leave_requests SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ message: 'Early leave updated' });
}));

app.get('/api/admin/appraisals', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.full_name, e.employee_code FROM appraisals a
     JOIN employees e ON e.id = a.employee_id JOIN users u ON u.id = e.user_id ORDER BY a.created_at DESC`
  );
  res.json(rows);
}));

app.post('/api/admin/appraisals', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { employee_id, period, rating, feedback, goals } = req.body;
  if (!employee_id || !period) return res.status(400).json({ error: 'employee_id and period required' });
  await pool.query(
    'INSERT INTO appraisals (employee_id, period, rating, feedback, goals, reviewed_by) VALUES (?, ?, ?, ?, ?, ?)',
    [employee_id, period, rating || null, feedback || null, goals || null, req.user.id]
  );
  const [e] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [employee_id]);
  if (e.length) await notify(e[0].user_id, 'Appraisal', `New appraisal for ${period}`, 'appraisal');
  res.status(201).json({ message: 'Appraisal added' });
}));

app.get('/api/admin/promotions', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT pr.*, u.full_name, e.employee_code FROM promotions pr
     JOIN employees e ON e.id = pr.employee_id JOIN users u ON u.id = e.user_id ORDER BY pr.created_at DESC`
  );
  res.json(rows);
}));

app.post('/api/admin/promotions', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { employee_id, old_designation, new_designation, effective_date, notes } = req.body;
  if (!employee_id || !new_designation || !effective_date) {
    return res.status(400).json({ error: 'employee_id, new_designation, effective_date required' });
  }
  await pool.query(
    'INSERT INTO promotions (employee_id, old_designation, new_designation, effective_date, notes, approved_by) VALUES (?, ?, ?, ?, ?, ?)',
    [employee_id, old_designation || null, new_designation, effective_date, notes || null, req.user.id]
  );
  await pool.query('UPDATE employees SET designation = ? WHERE id = ?', [new_designation, employee_id]);
  const [e] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [employee_id]);
  if (e.length) await notify(e[0].user_id, 'Promotion', `Promoted to ${new_designation}`, 'promotion');
  res.status(201).json({ message: 'Promotion recorded' });
}));

app.put('/api/admin/employees/:id/salary', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { salary } = req.body;
  await pool.query('UPDATE employees SET salary = ? WHERE id = ?', [salary, req.params.id]);
  res.json({ message: 'Salary updated (hike applied)' });
}));

app.post('/api/admin/system/clear-data', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  if (req.body.confirm !== 'DELETE GOALLINE DATA') {
    return res.status(400).json({ error: 'Type DELETE GOALLINE DATA to confirm' });
  }
  const tables = [
    'payments', 'invoices', 'project_tracking_log', 'project_assignments', 'projects',
    'feedback', 'complaints', 'enquiries', 'chat_messages', 'notifications', 'meetings',
    'payroll', 'leave_requests', 'early_leave_requests', 'attendance', 'appraisals',
    'promotions', 'offer_letters', 'otp_verifications',
  ];
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of tables) {
    try { await pool.query(`DELETE FROM ${t}`); } catch { /* skip */ }
  }
  await pool.query("DELETE FROM users WHERE role != 'admin'");
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  res.json({ message: 'Operational data cleared. Admin account kept.' });
}));

app.get('/api/employee/meetings', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  // Return meetings where this user is in attendee_ids or all-hands meetings
  const [rows] = await pool.query(
    `SELECT * FROM meetings WHERE scheduled_at >= NOW() AND (attendee_ids LIKE ? OR JSON_LENGTH(attendee_ids) = 0) ORDER BY scheduled_at ASC LIMIT 20`,
    [`%${req.user.id}%`]
  );
  res.json(rows);
}));

// ─── EMPLOYEE-TO-EMPLOYEE CHAT WITH ADMIN APPROVAL ─────────────────────────

// Employee: List other employees (for peer chat request modal)
app.get('/api/employee/colleagues', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT e.id, e.employee_code, e.department, e.designation, u.full_name, u.email
     FROM employees e JOIN users u ON u.id = e.user_id
     WHERE u.is_active = TRUE AND e.user_id != ?
     ORDER BY u.full_name ASC`,
    [req.user.id]
  );
  res.json(rows);
}));

// Employee: Request chat with another employee
app.post('/api/employee/chat-request', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const { requested_employee_id, reason } = req.body;
  if (!requested_employee_id) return res.status(400).json({ error: 'requested_employee_id required' });
  
  const requesterEmpId = req.user.employee_id || (await getEmployeeId(req.user.id));
  
  // Validate that requested_employee_id is a valid employee
  const [requestedEmp] = await pool.query(
    'SELECT user_id FROM employees WHERE id = ?',
    [requested_employee_id]
  );
  if (!requestedEmp.length) return res.status(404).json({ error: 'Employee not found' });
  
  // Check if request already exists
  const [existing] = await pool.query(
    `SELECT id FROM employee_chat_requests 
     WHERE (requester_id = ? AND requested_id = ?) OR (requester_id = ? AND requested_id = ?)
     ORDER BY created_at DESC LIMIT 1`,
    [req.user.id, requestedEmp[0].user_id, requestedEmp[0].user_id, req.user.id]
  );
  
  if (existing.length && existing[0]) {
    return res.status(400).json({ error: 'Chat request already exists' });
  }
  
  // Create chat request
  const [result] = await pool.query(
    `INSERT INTO employee_chat_requests (requester_id, requested_id, reason, status)
     VALUES (?, ?, ?, 'pending')`,
    [req.user.id, requestedEmp[0].user_id, reason || 'Would like to discuss a project']
  );
  
  // Notify admin and requested employee
  await notifyAdmins(
    'Employee Chat Request',
    `${req.user.full_name} requested to chat with another employee. Reason: ${reason || 'Not specified'}`,
    'chat_request'
  );
  
  await notify(
    requestedEmp[0].user_id,
    'Chat Request Received',
    `${req.user.full_name} wants to chat with you. Admin approval pending.`,
    'chat_request'
  );
  
  res.status(201).json({ id: result.insertId, message: 'Chat request sent. Awaiting admin approval.' });
}));

// Employee: Get pending and approved chat requests
app.get('/api/employee/chat-requests', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const [requests] = await pool.query(
    `SELECT ecr.*, 
            u1.full_name AS requester_name, u1.id as requester_user_id,
            u2.full_name AS requested_name, u2.id as requested_user_id,
            u3.full_name AS approved_by_name
     FROM employee_chat_requests ecr
     LEFT JOIN users u1 ON u1.id = ecr.requester_id
     LEFT JOIN users u2 ON u2.id = ecr.requested_id
     LEFT JOIN users u3 ON u3.id = ecr.approved_by
     WHERE ecr.requester_id = ? OR ecr.requested_id = ?
     ORDER BY ecr.created_at DESC`,
    [req.user.id, req.user.id]
  );
  res.json(requests);
}));

// Employee: Send message in approved peer-to-peer chat
app.post('/api/employee/peer-chat/message', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const { chat_request_id, recipient_id, message } = req.body;
  if (!chat_request_id || !recipient_id || !message?.trim()) {
    return res.status(400).json({ error: 'chat_request_id, recipient_id, and message required' });
  }
  
  // Verify the chat request exists and is approved
  const [chatRequest] = await pool.query(
    `SELECT * FROM employee_chat_requests WHERE id = ? AND status = 'approved'
     AND ((requester_id = ? AND requested_id = ?) OR (requester_id = ? AND requested_id = ?))`,
    [chat_request_id, req.user.id, recipient_id, recipient_id, req.user.id]
  );
  
  if (!chatRequest.length) {
    return res.status(403).json({ error: 'Chat not approved or unauthorized' });
  }
  
  // Send message
  await pool.query(
    `INSERT INTO employee_peer_chat (chat_request_id, sender_id, recipient_id, message, is_read)
     VALUES (?, ?, ?, ?, FALSE)`,
    [chat_request_id, req.user.id, recipient_id, message.trim()]
  );
  
  res.status(201).json({ message: 'Message sent' });
}));

// Employee: Get messages from a peer chat
app.get('/api/employee/peer-chat/:chatRequestId', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const chatRequestId = req.params.chatRequestId;
  
  // Verify access
  const [chatRequest] = await pool.query(
    `SELECT * FROM employee_chat_requests WHERE id = ? AND status = 'approved'
     AND (requester_id = ? OR requested_id = ?)`,
    [chatRequestId, req.user.id, req.user.id]
  );
  
  if (!chatRequest.length) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Fetch messages
  const [messages] = await pool.query(
    `SELECT epc.*, u.full_name AS sender_name
     FROM employee_peer_chat epc
     JOIN users u ON u.id = epc.sender_id
     WHERE epc.chat_request_id = ?
     ORDER BY epc.created_at ASC`,
    [chatRequestId]
  );
  
  // Mark as read
  await pool.query(
    `UPDATE employee_peer_chat SET is_read = TRUE 
     WHERE chat_request_id = ? AND recipient_id = ? AND is_read = FALSE`,
    [chatRequestId, req.user.id]
  );
  
  res.json(messages);
}));

// Admin: Get all pending chat requests
app.get('/api/admin/chat-requests/pending', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [requests] = await pool.query(
    `SELECT ecr.*, 
            u1.full_name AS requester_name, e1.employee_code as requester_code,
            u2.full_name AS requested_name, e2.employee_code as requested_code
     FROM employee_chat_requests ecr
     JOIN users u1 ON u1.id = ecr.requester_id
     JOIN employees e1 ON e1.user_id = u1.id
     JOIN users u2 ON u2.id = ecr.requested_id
     JOIN employees e2 ON e2.user_id = u2.id
     WHERE ecr.status = 'pending'
     ORDER BY ecr.created_at ASC`
  );
  res.json(requests);
}));

// Admin: Approve employee chat request
app.post('/api/admin/chat-request/:id/approve', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const { notes } = req.body;
  
  const [chatRequest] = await pool.query(
    `SELECT * FROM employee_chat_requests WHERE id = ?`,
    [requestId]
  );
  
  if (!chatRequest.length) return res.status(404).json({ error: 'Request not found' });
  
  // Approve
  await pool.query(
    `UPDATE employee_chat_requests SET status = 'approved', approved_by = ? WHERE id = ?`,
    [req.user.id, requestId]
  );
  
  // Notify both employees
  await notify(
    chatRequest[0].requester_id,
    'Chat Approved',
    `Your chat request has been approved by admin. You can now chat with the employee.`,
    'chat_approved'
  );
  
  await notify(
    chatRequest[0].requested_id,
    'Chat Approved',
    `A chat request has been approved. You can now chat with the employee.`,
    'chat_approved'
  );
  
  res.json({ message: 'Chat request approved' });
}));

// Admin: Reject employee chat request
app.post('/api/admin/chat-request/:id/reject', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const { reason } = req.body;
  
  const [chatRequest] = await pool.query(
    `SELECT * FROM employee_chat_requests WHERE id = ?`,
    [requestId]
  );
  
  if (!chatRequest.length) return res.status(404).json({ error: 'Request not found' });
  
  // Reject
  await pool.query(
    `UPDATE employee_chat_requests SET status = 'rejected', approved_by = ? WHERE id = ?`,
    [req.user.id, requestId]
  );
  
  // Notify both employees
  await notify(
    chatRequest[0].requester_id,
    'Chat Rejected',
    `Your chat request has been rejected by admin. Reason: ${reason || 'Not specified'}`,
    'chat_rejected'
  );
  
  await notify(
    chatRequest[0].requested_id,
    'Chat Request Rejected',
    `A chat request involving you has been rejected by admin.`,
    'chat_rejected'
  );
  
  res.json({ message: 'Chat request rejected' });
}));

// Admin: View all peer chats
app.get('/api/admin/peer-chats', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  const [chats] = await pool.query(
    `SELECT ecr.id, ecr.reason, ecr.status, ecr.created_at,
            u1.full_name AS emp1_name, e1.employee_code as emp1_code, u1.id as emp1_id,
            u2.full_name AS emp2_name, e2.employee_code as emp2_code, u2.id as emp2_id,
            COUNT(epc.id) AS message_count
     FROM employee_chat_requests ecr
     JOIN users u1 ON u1.id = ecr.requester_id
     JOIN employees e1 ON e1.user_id = u1.id
     JOIN users u2 ON u2.id = ecr.requested_id
     JOIN employees e2 ON e2.user_id = u2.id
     LEFT JOIN employee_peer_chat epc ON epc.chat_request_id = ecr.id
     GROUP BY ecr.id
     ORDER BY ecr.created_at DESC`
  );
  res.json(chats);
}));

// Admin: View messages in a peer chat
app.get('/api/admin/peer-chat/:chatRequestId/messages', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const chatRequestId = req.params.chatRequestId;
  
  const [messages] = await pool.query(
    `SELECT epc.*, u.full_name AS sender_name
     FROM employee_peer_chat epc
     JOIN users u ON u.id = epc.sender_id
     WHERE epc.chat_request_id = ?
     ORDER BY epc.created_at ASC`,
    [chatRequestId]
  );
  
  res.json(messages);
}));

// ─── Schema helper (meetings table) ──────────────────────────────────────────

async function ensureProjectDomainColumns() {
  const alters = [
    'ALTER TABLE projects ADD COLUMN employee_domain_draft VARCHAR(255) NULL',
    'ALTER TABLE projects ADD COLUMN employee_domain_hosting TEXT NULL',
    'ALTER TABLE projects ADD COLUMN start_date DATE NULL',
    'ALTER TABLE projects ADD COLUMN purpose TEXT NULL',
    'ALTER TABLE projects ADD COLUMN company_name VARCHAR(255) NULL',
  ];
  for (const sql of alters) {
    try { await pool.query(sql); } catch { /* exists */ }
  }
}

async function ensureChatTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sender_id INT NULL,
      recipient_id INT NULL,
      guest_name VARCHAR(255) NULL,
      guest_email VARCHAR(255) NULL,
      message TEXT NOT NULL,
      is_guest BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  // Add recipient_id column to existing tables (idempotent)
  try {
    await pool.query('ALTER TABLE chat_messages ADD COLUMN recipient_id INT NULL');
    await pool.query('ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL');
  } catch { /* already exists */ }
}

async function ensureMeetingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      scheduled_at DATETIME NOT NULL,
      duration_minutes INT DEFAULT 60,
      meeting_link VARCHAR(500),
      created_by INT,
      attendee_ids JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Fix project_assignments updated_at if missing
async function ensureAssignmentTimestamp() {
  const alters = [
    'ALTER TABLE project_assignments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'ALTER TABLE project_assignments ADD COLUMN admin_feedback TEXT NULL',
    'ALTER TABLE project_assignments ADD COLUMN admin_rating TINYINT NULL',
  ];
  for (const sql of alters) {
    try { await pool.query(sql); } catch { /* column may exist */ }
  }
}

// ─── Error handling ──────────────────────────────────────────────────────────

// ─── CONVERSATIONS LIST (for DashboardChat sidebar) ──────────────────────────

// Admin: Get list of all conversations (one entry per user who has chatted)
app.get('/api/admin/conversations', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT 
      u.id AS user_id,
      u.full_name AS participant_name,
      u.role AS participant_type,
      (SELECT cm2.message
       FROM chat_messages cm2
       WHERE (cm2.sender_id = u.id AND cm2.recipient_id = ?) OR (cm2.sender_id = ? AND cm2.recipient_id = u.id)
       ORDER BY cm2.created_at DESC LIMIT 1
      ) AS last_message,
      (SELECT cm2.created_at
       FROM chat_messages cm2
       WHERE (cm2.sender_id = u.id AND cm2.recipient_id = ?) OR (cm2.sender_id = ? AND cm2.recipient_id = u.id)
       ORDER BY cm2.created_at DESC LIMIT 1
      ) AS last_message_time,
      COALESCE((SELECT SUM(CASE WHEN cm3.recipient_id = ? AND cm3.is_read = FALSE THEN 1 ELSE 0 END)
                FROM chat_messages cm3
                WHERE (cm3.sender_id = u.id AND cm3.recipient_id = ?) OR (cm3.sender_id = ? AND cm3.recipient_id = u.id)
               ), 0) AS unread_count
    FROM users u
    WHERE u.role IN ('employee','client') AND u.is_active = TRUE
      AND EXISTS (
        SELECT 1 FROM chat_messages cm4
        WHERE (cm4.sender_id = u.id AND cm4.recipient_id = ?) OR (cm4.sender_id = ? AND cm4.recipient_id = u.id)
      )
    ORDER BY last_message_time DESC
  `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);
  res.json(rows);
}));

// Employee: list of conversations (only admin for now + approved peers)
app.get('/api/employee/conversations', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
  const adminId = await getAdminId();
  const convos = [];
  if (adminId) {
    const [[latestMsg]] = await pool.query(`
      SELECT cm.message AS last_message, cm.created_at AS last_message_time
      FROM chat_messages cm
      WHERE (cm.sender_id = ? AND cm.recipient_id = ?) OR (cm.sender_id = ? AND cm.recipient_id = ?)
      ORDER BY cm.created_at DESC LIMIT 1
    `, [req.user.id, adminId, adminId, req.user.id]);
    const [[{ unread_count = 0 }]] = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN cm.recipient_id = ? AND (cm.is_read IS NULL OR cm.is_read = FALSE) THEN 1 ELSE 0 END), 0) AS unread_count
      FROM chat_messages cm
      WHERE (cm.sender_id = ? AND cm.recipient_id = ?) OR (cm.sender_id = ? AND cm.recipient_id = ?)
    `, [req.user.id, req.user.id, adminId, adminId, req.user.id]);
    convos.push({
      user_id: adminId,
      participant_name: 'Admin',
      participant_type: 'admin',
      last_message: latestMsg?.last_message || 'Start conversation',
      last_message_time: latestMsg?.last_message_time || new Date(),
      unread_count,
    });
  }
  // Approved peer chats
  const [peerRequests] = await pool.query(`
    SELECT ecr.id as chat_request_id, ecr.requester_id, ecr.requested_id,
           u1.full_name AS requester_name, u2.full_name AS requested_name,
           (SELECT epc2.message
            FROM employee_peer_chat epc2
            WHERE epc2.chat_request_id = ecr.id
            ORDER BY epc2.created_at DESC LIMIT 1
           ) AS last_message,
           (SELECT epc2.created_at
            FROM employee_peer_chat epc2
            WHERE epc2.chat_request_id = ecr.id
            ORDER BY epc2.created_at DESC LIMIT 1
           ) AS last_message_time,
           COALESCE((SELECT SUM(CASE WHEN epc3.recipient_id = ? AND epc3.is_read = FALSE THEN 1 ELSE 0 END)
                     FROM employee_peer_chat epc3
                     WHERE epc3.chat_request_id = ecr.id
                    ), 0) AS unread_count
    FROM employee_chat_requests ecr
    LEFT JOIN users u1 ON u1.id = ecr.requester_id
    LEFT JOIN users u2 ON u2.id = ecr.requested_id
    WHERE ecr.status = 'approved' AND (ecr.requester_id = ? OR ecr.requested_id = ?)
    ORDER BY last_message_time DESC
  `, [req.user.id, req.user.id, req.user.id]);
  for (const pr of peerRequests) {
    const peerUserId = pr.requester_id === req.user.id ? pr.requested_id : pr.requester_id;
    const peerName = pr.requester_id === req.user.id ? pr.requested_name : pr.requester_name;
    convos.push({
      user_id: peerUserId,
      chat_request_id: pr.chat_request_id,
      participant_name: peerName,
      participant_type: 'employee',
      last_message: pr.last_message || 'Chat approved',
      last_message_time: pr.last_message_time || new Date(),
      unread_count: pr.unread_count || 0,
    });
  }
  res.json(convos);
}));

// Client: conversations (only with admin)
app.get('/api/client/conversations', authenticate, requireRole('client'), asyncHandler(async (req, res) => {
  const adminId = await getAdminId();
  if (!adminId) return res.json([]);
  const [msgs] = await pool.query(`
    SELECT cm.message AS last_message, cm.created_at AS last_message_time
    FROM chat_messages cm
    WHERE (cm.sender_id = ? AND cm.recipient_id = ?) OR (cm.sender_id = ? AND cm.recipient_id = ?)
    ORDER BY cm.created_at DESC LIMIT 1
  `, [req.user.id, adminId, adminId, req.user.id]);
  res.json([{
    user_id: adminId,
    participant_name: 'Admin Support',
    participant_type: 'admin',
    last_message: msgs[0]?.last_message || 'Start conversation',
    last_message_time: msgs[0]?.last_message_time || new Date(),
    unread_count: 0,
  }]);
}));

// Mark messages as read
app.post('/api/chat/mark-read', authenticate, asyncHandler(async (req, res) => {
  const { sender_id } = req.body;
  if (!sender_id) return res.json({ ok: true });
  await pool.query(
    `UPDATE chat_messages SET is_read = TRUE WHERE sender_id = ? AND recipient_id = ? AND (is_read IS NULL OR is_read = FALSE)`,
    [sender_id, req.user.id]
  );
  res.json({ ok: true });
}));

// ─── SYSTEM SETTINGS / FREEZE CONTROLS ───────────────────────────────────────

// Admin: Get all system settings
app.get('/api/admin/system-settings', authenticate, requireRole('admin'), asyncHandler(async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM system_settings ORDER BY id');
    return res.json(rows);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      await ensureSystemSettings();
      const [rows] = await pool.query('SELECT * FROM system_settings ORDER BY id');
      return res.json(rows);
    }
    throw err;
  }
}));

// Admin: Update a system setting
app.put('/api/admin/system-settings/:key', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { value } = req.body;
  try {
    await pool.query(
      'UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
      [String(value), req.user.id, req.params.key]
    );
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      await ensureSystemSettings();
      await pool.query(
        'UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
        [String(value), req.user.id, req.params.key]
      );
    } else {
      throw err;
    }
  }
  res.json({ message: 'Setting updated' });
}));

// Admin: Bulk update multiple settings
app.post('/api/admin/system-settings/bulk', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { settings } = req.body; // { key: value, ... }
  try {
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO system_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)',
        [key, String(value), req.user.id]
      );
    }
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      await ensureSystemSettings();
      for (const [key, value] of Object.entries(settings)) {
        await pool.query(
          'INSERT INTO system_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)',
          [key, String(value), req.user.id]
        );
      }
    } else {
      throw err;
    }
  }
  res.json({ message: 'Settings updated' });
}));

// Public (authenticated): Check a specific freeze setting
app.get('/api/system-settings/check', authenticate, asyncHandler(async (req, res) => {
  const { key } = req.query;
  if (!key) return res.json({ value: '0' });
  try {
    const [rows] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', [key]);
    return res.json({ value: rows[0]?.setting_value || '0' });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      await ensureSystemSettings();
      return res.json({ value: '0' });
    }
    throw err;
  }
}));

// ─── ENSURE SYSTEM SETTINGS TABLE ────────────────────────────────────────────

async function ensureSystemSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT NOT NULL DEFAULT '0',
      label VARCHAR(255),
      description TEXT,
      updated_by INT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  const defaults = [
    ['freeze_employee_dashboard',    '0', 'Freeze Employee Dashboard',     'Prevents employees from accessing their dashboard'],
    ['freeze_client_portal',         '0', 'Freeze Client Portal',          'Prevents clients from accessing their portal'],
    ['freeze_attendance',            '0', 'Freeze Attendance',             'Locks attendance marking for all employees'],
    ['freeze_leave_requests',        '0', 'Freeze Leave Requests',         'Prevents employees from submitting leave requests'],
    ['freeze_early_leave',           '0', 'Freeze Early Leave Requests',   'Prevents early leave request submissions'],
    ['freeze_payroll',               '0', 'Freeze Payroll Section',        'Locks payroll view for employees'],
    ['freeze_employee_chat',         '0', 'Freeze Employee Chat',          'Disables chat for all employees'],
    ['freeze_client_chat',           '0', 'Freeze Client Chat',            'Disables chat for all clients'],
    ['freeze_project_tracking',      '0', 'Freeze Project Tracking',       'Prevents clients from viewing project tracking'],
    ['freeze_employee_profile_edit', '0', 'Freeze Employee Profile Edit',  'Prevents employees from editing their profile'],
    ['freeze_complaints',            '0', 'Freeze Complaints Section',     'Disables complaint submissions'],
  ];
  for (const [key, val, label, desc] of defaults) {
    await pool.query(
      'INSERT IGNORE INTO system_settings (setting_key, setting_value, label, description) VALUES (?, ?, ?, ?)',
      [key, val, label, desc]
    );
  }
}

async function ensurePeerChatTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_chat_requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      requester_id INT NOT NULL,
      requested_id INT NOT NULL,
      reason TEXT,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      approved_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (requested_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_peer_chat (
      id INT PRIMARY KEY AUTO_INCREMENT,
      chat_request_id INT NOT NULL,
      sender_id INT NOT NULL,
      recipient_id INT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_request_id) REFERENCES employee_chat_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  // Add is_read to chat_messages if missing
  try { await pool.query('ALTER TABLE chat_messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE'); } catch { /* exists */ }
  // Add approved_by to employee_chat_requests if missing
  try { await pool.query('ALTER TABLE employee_chat_requests ADD COLUMN approved_by INT NULL'); } catch { /* exists */ }
  // Add offer letter columns if missing
  try { await pool.query('ALTER TABLE offer_letters ADD COLUMN department VARCHAR(100) NULL'); } catch { /* exists */ }
  try { await pool.query('ALTER TABLE offer_letters ADD COLUMN basic_salary DECIMAL(12,2) DEFAULT 0'); } catch { /* exists */ }
  try { await pool.query('ALTER TABLE offer_letters ADD COLUMN allowances DECIMAL(12,2) DEFAULT 0'); } catch { /* exists */ }
  try { await pool.query('ALTER TABLE offer_letters ADD COLUMN deductions DECIMAL(12,2) DEFAULT 0'); } catch { /* exists */ }
}

// ─── Chat Reports (ended peer chats sent to admin) ───────────────────────────
// NOTE: schema.sql historically defined a `chat_reports` table for an unrelated
// legacy "guest chat" feature (session_id, name, email, summary). That table
// shape did not match what this route actually needs, so every INSERT/SELECT
// against chat_reports was silently failing against a real database and the
// admin "Chat History" screen always rendered empty. This function checks the
// table's real columns via information_schema and adds only what's missing —
// no DROP TABLE (which some DB users/hosts don't have permission for), and no
// swallowed errors.
async function ensureChatReportsTable() {
  // Bare-minimum table if it doesn't exist at all yet.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_reports (
      id INT AUTO_INCREMENT PRIMARY KEY
    )
  `);

  const [existingCols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_reports'`
  );
  const have = new Set(existingCols.map(c => c.COLUMN_NAME));

  const requiredColumns = [
    ['chat_request_id', 'INT NULL'],
    ['ended_by', 'VARCHAR(150) NULL'],
    ['ended_by_id', 'INT NULL'],
    ['ended_by_role', 'VARCHAR(20) NULL'],
    ['reason', 'TEXT NULL'],
    ['chat_history', 'JSON NULL'],
    ['total_messages', 'INT DEFAULT 0'],
    ['reported_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
  ];

  for (const [name, definition] of requiredColumns) {
    if (have.has(name)) continue; // column already present — nothing to do
    await pool.query(`ALTER TABLE chat_reports ADD COLUMN ${name} ${definition}`);
    console.log(`[migration] chat_reports: added missing column '${name}'`);
  }
}

// Admin: Get all chat reports (ended peer chats)
app.get('/api/admin/chat-reports', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
    const [reports] = await pool.query(`
        SELECT cr.*, 
               ecr.requester_id, ecr.requested_id,
               u1.full_name AS requester_name,
               u2.full_name AS requested_name
        FROM chat_reports cr
        JOIN employee_chat_requests ecr ON ecr.id = cr.chat_request_id
        LEFT JOIN users u1 ON u1.id = ecr.requester_id
        LEFT JOIN users u2 ON u2.id = ecr.requested_id
        ORDER BY cr.reported_at DESC
    `);
    res.json(reports);
}));



app.delete('/api/employee/peer-chat/:chatRequestId', authenticate, requireRole('employee'), asyncHandler(async (req, res) => {
    const chatRequestId = req.params.chatRequestId;

    // Verify employee is part of this approved chat
    const [request] = await pool.query(
        `SELECT * FROM employee_chat_requests 
         WHERE id = ? AND status = 'approved' 
         AND (requester_id = ? OR requested_id = ?)`,
        [chatRequestId, req.user.id, req.user.id]
    );
    if (!request.length) {
        return res.status(403).json({ error: 'Unauthorized or chat not approved' });
    }

    // Mark as ended and delete messages
    await pool.query(
        `UPDATE employee_chat_requests SET status = 'ended' WHERE id = ?`,
        [chatRequestId]
    );
    await pool.query(
        `DELETE FROM employee_peer_chat WHERE chat_request_id = ?`,
        [chatRequestId]
    );

    res.json({ message: 'Chat ended successfully' });
}));
app.post('/api/admin/peer-chat-report', authenticate, asyncHandler(async (req, res) => {
    const {
        chat_request_id,
        ended_by,
        ended_by_id,
        ended_by_role,
        reason,
        chat_history,
        total_messages
    } = req.body;

    if (!chat_request_id) {
        return res.status(400).json({ error: 'chat_request_id required' });
    }

    // Allow both admin and employee, but verify employee is a participant
    if (req.user.role !== 'admin') {
        const [participant] = await pool.query(
            `SELECT * FROM employee_chat_requests 
             WHERE id = ? AND status = 'approved' 
             AND (requester_id = ? OR requested_id = ?)`,
            [chat_request_id, req.user.id, req.user.id]
        );
        if (!participant.length) {
            return res.status(403).json({ error: 'You are not part of this chat' });
        }
    }

    await pool.query(
        `INSERT INTO chat_reports 
         (chat_request_id, ended_by, ended_by_id, ended_by_role, reason, chat_history, total_messages)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            chat_request_id,
            ended_by,
            ended_by_id,
            ended_by_role,
            reason || '',
            JSON.stringify(chat_history || []),
            total_messages || 0
        ]
    );

    res.status(201).json({ message: 'Chat report saved' });
}));
// Admin: Revoke/stop an approved peer chat
app.post('/api/admin/chat-request/:id/revoke', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const { reason } = req.body;

  const [chatRequest] = await pool.query(
    'SELECT * FROM employee_chat_requests WHERE id = ? AND status = ?',
    [requestId, 'approved']
  );

  if (!chatRequest.length) return res.status(404).json({ error: 'Approved chat not found' });

  await pool.query(
    'UPDATE employee_chat_requests SET status = ?, approved_by = ? WHERE id = ?',
    ['revoked', req.user.id, requestId]
  );

  await notify(
    chatRequest[0].requester_id,
    'Chat Access Revoked',
    `Your peer chat has been stopped by admin. ${reason ? 'Reason: ' + reason : ''}`,
    'chat_revoked'
  );

  await notify(
    chatRequest[0].requested_id,
    'Chat Access Revoked',
    `Your peer chat has been stopped by admin. ${reason ? 'Reason: ' + reason : ''}`,
    'chat_revoked'
  );

  res.json({ message: 'Peer chat revoked successfully' });
}));
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Duplicate entry' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Invalid reference' });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Start server ──────────────────────────────────────────────────────────────

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.error('Run: mysql -u root -p < database/schema.sql');
  }

  try {
    await ensureProjectDomainColumns();
    await ensureChatTable();
    await ensureMeetingsTable();
    await ensureAssignmentTimestamp();
    await ensureSystemSettings();
    await ensurePeerChatTables();
    await ensureChatReportsTable();
    console.log('Table migrations completed');
  } catch (err) {
    console.error('!!! A startup table migration failed:', err.message);
    console.error('!!! Some features (e.g. admin Chat History) may not work until this is fixed and the server is restarted.');
  }

  const server = app.listen(PORT, () => {
    console.log(`GoalLine API running on http://192.168.1.66:${PORT}`);
    if (!smtpConfigured) console.log('SMTP not configured — OTPs logged to console with dev_otp in responses');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Set PORT in .env or stop the other process.`);
      process.exit(1);
    }
    throw err;
  });
}

start();