-- ============================================================
-- GoalLine Enterprise Workflow Management System
-- MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS goalline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE goalline;

-- ─── Users (all roles: admin, employee, client) ───────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(150)  NOT NULL,
  email           VARCHAR(191)  NOT NULL UNIQUE,
  phone           VARCHAR(20)   DEFAULT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  role            ENUM('admin','employee','client') NOT NULL DEFAULT 'client',
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_email_role (email, role)
) ENGINE=InnoDB;

-- ─── Employees ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED NOT NULL UNIQUE,
  employee_code       VARCHAR(30)  NOT NULL UNIQUE,
  department          VARCHAR(100) DEFAULT NULL,
  designation         VARCHAR(100) DEFAULT NULL,
  joining_date        DATE         DEFAULT NULL,
  qualification       VARCHAR(200) DEFAULT NULL,
  experience          DECIMAL(4,1) DEFAULT 0,
  -- Salary breakdown
  ctc                 DECIMAL(12,2) DEFAULT 0,
  basic_salary        DECIMAL(12,2) DEFAULT 0,
  allowances          DECIMAL(12,2) DEFAULT 0,
  deductions          DECIMAL(12,2) DEFAULT 0,
  hra                 DECIMAL(12,2) DEFAULT 0,
  pf                  DECIMAL(12,2) DEFAULT 0,
  medical_allowance   DECIMAL(12,2) DEFAULT 0,
  special_allowance   DECIMAL(12,2) DEFAULT 0,
  salary              DECIMAL(12,2) DEFAULT 0,
  manual_breakdown    TINYINT(1)   DEFAULT 0,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_emp_dept (department)
) ENGINE=InnoDB;

-- ─── Clients ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL UNIQUE,
  tracking_id VARCHAR(20)  NOT NULL UNIQUE,
  company     VARCHAR(200) DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_clients_tracking (tracking_id)
) ENGINE=InnoDB;

-- ─── Projects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id               INT UNSIGNED NOT NULL,
  title                   VARCHAR(255) NOT NULL,
  description             TEXT         DEFAULT NULL,
  tracking_id             VARCHAR(20)  NOT NULL UNIQUE,
  status                  VARCHAR(60)  NOT NULL DEFAULT 'requirement_gathering',
  deadline                DATE         DEFAULT NULL,
  start_date              DATE         DEFAULT NULL,
  budget                  DECIMAL(14,2) DEFAULT NULL,
  domain                  VARCHAR(255) DEFAULT NULL,
  hosting_details         TEXT         DEFAULT NULL,
  admin_notes             TEXT         DEFAULT NULL,
  admin_feedback          TEXT         DEFAULT NULL,
  admin_rating            TINYINT      DEFAULT NULL,
  completed_at            DATETIME     DEFAULT NULL,
  purpose                 TEXT         DEFAULT NULL,
  company_name            VARCHAR(255) DEFAULT NULL,
  employee_domain_draft   VARCHAR(255) DEFAULT NULL,
  employee_domain_hosting TEXT         DEFAULT NULL,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  INDEX idx_projects_status (status),
  INDEX idx_projects_client (client_id),
  INDEX idx_projects_tracking (tracking_id)
) ENGINE=InnoDB;

-- ─── Project Assignments ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_assignments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id       INT UNSIGNED NOT NULL,
  employee_id      INT UNSIGNED NOT NULL,
  status           VARCHAR(40)  NOT NULL DEFAULT 'pending',
  work_notes       TEXT         DEFAULT NULL,
  admin_feedback   TEXT         DEFAULT NULL,
  progress_percent TINYINT      NOT NULL DEFAULT 0,
  submitted_at     DATETIME     DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_pa_project (project_id),
  INDEX idx_pa_employee (employee_id),
  INDEX idx_pa_status (status)
) ENGINE=InnoDB;

-- ─── Project Tracking Log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_tracking_log (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  stage      VARCHAR(80)  NOT NULL,
  message    TEXT         DEFAULT NULL,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Invoices ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id     INT UNSIGNED NOT NULL,
  invoice_number VARCHAR(40)  NOT NULL UNIQUE,
  amount         DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,
  status         ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
  due_date       DATE          DEFAULT NULL,
  description    TEXT          DEFAULT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Payments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id     INT UNSIGNED  DEFAULT NULL,
  project_id     INT UNSIGNED  DEFAULT NULL,
  amount         DECIMAL(14,2) NOT NULL,
  payment_method VARCHAR(60)   DEFAULT 'online',
  transaction_id VARCHAR(100)  DEFAULT NULL,
  notes          TEXT          DEFAULT NULL,
  paid_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Attendance ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  date        DATE         NOT NULL,
  check_in    DATETIME     DEFAULT NULL,
  check_out   DATETIME     DEFAULT NULL,
  status      ENUM('present','absent','half_day','late') NOT NULL DEFAULT 'present',
  notes       TEXT         DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY uq_attendance_emp_date (employee_id, date),
  INDEX idx_attendance_date (date)
) ENGINE=InnoDB;

-- ─── Leave Requests ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id  INT UNSIGNED NOT NULL,
  leave_type   VARCHAR(60)  NOT NULL,
  from_date    DATE         NOT NULL,
  to_date      DATE         NOT NULL,
  reason       TEXT         DEFAULT NULL,
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_remark TEXT         DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Early Leave Requests ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS early_leave_requests (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  date        DATE         NOT NULL,
  reason      TEXT         DEFAULT NULL,
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Payroll ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id       INT UNSIGNED  NOT NULL,
  month             TINYINT       NOT NULL,
  year              SMALLINT      NOT NULL,
  basic_salary      DECIMAL(12,2) NOT NULL DEFAULT 0,
  allowances        DECIMAL(12,2) NOT NULL DEFAULT 0,
  deductions        DECIMAL(12,2) NOT NULL DEFAULT 0,
  hra               DECIMAL(12,2) NOT NULL DEFAULT 0,
  pf                DECIMAL(12,2) NOT NULL DEFAULT 0,
  medical_allowance DECIMAL(12,2) NOT NULL DEFAULT 0,
  special_allowance DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_salary        DECIMAL(12,2) NOT NULL DEFAULT 0,
  status            ENUM('pending','processed','paid') NOT NULL DEFAULT 'processed',
  notes             TEXT          DEFAULT NULL,
  processed_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY uq_payroll_emp_month (employee_id, month, year)
) ENGINE=InnoDB;

-- ─── Offer Letters ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offer_letters (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id    INT UNSIGNED  DEFAULT NULL,
  recipient_name VARCHAR(150)  NOT NULL,
  recipient_email VARCHAR(191) NOT NULL,
  position       VARCHAR(150)  NOT NULL,
  department     VARCHAR(100)  DEFAULT NULL,
  salary         DECIMAL(12,2) DEFAULT NULL,
  joining_date   DATE          DEFAULT NULL,
  content        LONGTEXT      DEFAULT NULL,
  status         ENUM('draft','sent','accepted','rejected') NOT NULL DEFAULT 'draft',
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Complaints ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id   VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(150) DEFAULT NULL,
  email       VARCHAR(191) DEFAULT NULL,
  subject     VARCHAR(255) DEFAULT NULL,
  description TEXT         DEFAULT NULL,
  status      ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  admin_reply TEXT         DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── Enquiries ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(191) NOT NULL,
  phone       VARCHAR(20)  DEFAULT NULL,
  subject     VARCHAR(255) DEFAULT NULL,
  message     TEXT         DEFAULT NULL,
  status      ENUM('new','read','replied') NOT NULL DEFAULT 'new',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── Feedback ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) DEFAULT NULL,
  email        VARCHAR(191) DEFAULT NULL,
  project_code VARCHAR(30)  DEFAULT NULL,
  project_id   INT UNSIGNED DEFAULT NULL,
  rating       TINYINT      DEFAULT NULL,
  message      TEXT         DEFAULT NULL,
  is_public    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         DEFAULT NULL,
  type       VARCHAR(40)  NOT NULL DEFAULT 'info',
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- ─── Meetings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT         DEFAULT NULL,
  scheduled_at DATETIME     NOT NULL,
  duration_min INT          DEFAULT 60,
  location     VARCHAR(255) DEFAULT NULL,
  meet_link    VARCHAR(500) DEFAULT NULL,
  attendee_ids JSON         DEFAULT NULL,
  created_by   INT UNSIGNED DEFAULT NULL,
  is_public    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Chat Messages (admin ↔ employee/client) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id    INT UNSIGNED DEFAULT NULL,
  recipient_id INT UNSIGNED DEFAULT NULL,
  message      TEXT         NOT NULL,
  is_guest     TINYINT(1)   NOT NULL DEFAULT 0,
  guest_name   VARCHAR(150) DEFAULT NULL,
  guest_email  VARCHAR(191) DEFAULT NULL,
  is_read      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)    REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_chat_sender_recipient (sender_id, recipient_id)
) ENGINE=InnoDB;

-- ─── Employee Peer Chat Requests ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_chat_requests (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester_id INT UNSIGNED NOT NULL,
  requested_id INT UNSIGNED NOT NULL,
  reason       TEXT         DEFAULT NULL,
  status       ENUM('pending','approved','rejected','revoked') NOT NULL DEFAULT 'pending',
  approved_by  INT UNSIGNED DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Employee Peer Chat Messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_peer_chat (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chat_request_id INT UNSIGNED NOT NULL,
  sender_id       INT UNSIGNED NOT NULL,
  recipient_id    INT UNSIGNED NOT NULL,
  message         TEXT         NOT NULL,
  is_read         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_request_id) REFERENCES employee_chat_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id)       REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id)    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Appraisals ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appraisals (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  period      VARCHAR(20)  NOT NULL,
  rating      DECIMAL(3,1) DEFAULT NULL,
  feedback    TEXT         DEFAULT NULL,
  goals       TEXT         DEFAULT NULL,
  reviewed_by INT UNSIGNED DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Promotions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id      INT UNSIGNED NOT NULL,
  old_designation  VARCHAR(100) DEFAULT NULL,
  new_designation  VARCHAR(100) NOT NULL,
  effective_date   DATE         NOT NULL,
  notes            TEXT         DEFAULT NULL,
  approved_by      INT UNSIGNED DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── OTP Verifications ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_verifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(191) NOT NULL,
  otp_code   VARCHAR(10)  NOT NULL,
  purpose    VARCHAR(40)  NOT NULL DEFAULT 'login',
  is_used    TINYINT(1)   NOT NULL DEFAULT 0,
  expires_at DATETIME     NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_email_purpose (email, purpose, is_used)
) ENGINE=InnoDB;

-- ─── System Settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT         DEFAULT NULL,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── Chat Reports (ended peer chats sent to admin) ───────────────────────────
-- Previously this table had an unrelated shape (session_id/name/email/summary)
-- left over from an old guest-chat idea, which did not match the columns the
-- server actually reads/writes (chat_request_id, ended_by, chat_history, ...).
-- That mismatch is why the admin "Chat History" screen always appeared empty.
CREATE TABLE IF NOT EXISTS chat_reports (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  chat_request_id INT NOT NULL,
  ended_by        VARCHAR(150) DEFAULT NULL,
  ended_by_id     INT DEFAULT NULL,
  ended_by_role   VARCHAR(20)  DEFAULT NULL,
  reason          TEXT         DEFAULT NULL,
  chat_history    JSON         DEFAULT NULL,
  total_messages  INT          DEFAULT 0,
  reported_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_request_id) REFERENCES employee_chat_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Default system settings ─────────────────────────────────────────────────
INSERT IGNORE INTO system_settings (setting_key, value) VALUES
  ('company_name',    'GoalLine'),
  ('company_email',   'contact@goalline.com'),
  ('company_phone',   ''),
  ('company_address', ''),
  ('company_website', ''),
  ('smtp_host',       ''),
  ('smtp_port',       '587'),
  ('smtp_user',       ''),
  ('allow_client_register', 'true'),
  ('maintenance_mode', 'false');


-- ─── system_settings ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_settings (
  id            INT          PRIMARY KEY AUTO_INCREMENT,
  setting_key   VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT         NOT NULL,   -- DEFAULT removed (not allowed for TEXT)
  label         VARCHAR(255) NULL,
  description   TEXT         NULL,
  updated_by    INT          NULL,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings (these are the "values above modal" you asked for)
INSERT IGNORE INTO system_settings (setting_key, setting_value, label, description) VALUES
  ('freeze_employee_dashboard',    '0', 'Freeze Employee Dashboard',    'Prevents employees from accessing their dashboard'),
  ('freeze_client_portal',         '0', 'Freeze Client Portal',         'Prevents clients from accessing their portal'),
  ('freeze_attendance',            '0', 'Freeze Attendance',            'Locks attendance marking for all employees'),
  ('freeze_leave_requests',        '0', 'Freeze Leave Requests',        'Prevents employees from submitting leave requests'),
  ('freeze_early_leave',           '0', 'Freeze Early Leave Requests',  'Prevents early leave request submissions'),
  ('freeze_payroll',               '0', 'Freeze Payroll Section',       'Locks payroll view for employees'),
  ('freeze_employee_chat',         '0', 'Freeze Employee Chat',         'Disables chat for all employees'),
  ('freeze_client_chat',           '0', 'Freeze Client Chat',           'Disables chat for all clients'),
  ('freeze_project_tracking',      '0', 'Freeze Project Tracking',      'Prevents clients from viewing project tracking'),
  ('freeze_employee_profile_edit', '0', 'Freeze Employee Profile Edit', 'Prevents employees from editing their profile'),
  ('freeze_complaints',            '0', 'Freeze Complaints Section',    'Disables complaint submissions');