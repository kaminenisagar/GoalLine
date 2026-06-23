# GoalLine — Enterprise Workflow Management System

A full-stack web application for managing employees, clients, projects, payroll, attendance, HR, and more.

**Stack:** React + Vite (frontend) · Node.js + Express (backend) · MySQL (database)

---

## Folder Structure

```
goalline/
├── backend/
│   ├── server.js          ← All Express routes + business logic
│   ├── schema.sql         ← MySQL database schema
│   ├── package.json
│   ├── .env.example       ← Copy to .env and fill in values
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── api/index.js                      ← Axios instance + API helpers
│   │   ├── context/AuthContext.jsx           ← JWT auth context
│   │   ├── layouts/
│   │   │   ├── DashboardLayout.jsx           ← Admin/Employee dashboard shell
│   │   │   └── LandingLayout.jsx             ← Public pages shell
│   │   ├── components/
│   │   │   ├── Navbar/                       ← Public navbar
│   │   │   └── shared/                       ← Reusable UI components
│   │   └── pages/
│   │       ├── admin/       ← Admin dashboard pages
│   │       ├── employee/    ← Employee dashboard pages
│   │       ├── landing/     ← Public pages (home, auth, etc.)
│   │       └── shared/      ← Chat shared between roles
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json          ← SPA rewrites for Vercel
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## Roles & Access

| Role     | Login URL          | Dashboard   |
|----------|--------------------|-------------|
| Admin    | `/staff/login`     | `/admin`    |
| Employee | `/staff/login`     | `/employee` |
| Client   | `/client/login`    | `/client/portal` |

---

## Running Locally

### Prerequisites

- Node.js v18+
- MySQL 8.0+ (running locally or via Docker)
- npm

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/goalline.git
cd goalline
```

### 2. Set up the database

Open MySQL and run:

```sql
CREATE DATABASE goalline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then import the schema:

```bash
mysql -u root -p goalline < backend/schema.sql
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```
PORT=5005
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=goalline
JWT_SECRET=any-long-random-string
FRONTEND_URL=http://localhost:5173
```

SMTP fields are optional — if omitted, OTPs are printed to the console.

### 4. Install backend dependencies and start

```bash
cd backend
npm install
npm run dev      # or: npm start
```

Server starts at `http://localhost:5005`.

### 5. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

Leave `VITE_API_URL` empty for local dev. Vite proxies `/api` → `localhost:5005`.

### 6. Install frontend dependencies and start

```bash
cd frontend
npm install
npm run dev
```

App opens at `http://localhost:5173`.

### 7. Create first admin account

Navigate to `http://localhost:5173/staff/register` and register with role **Admin**.
Only one admin can be registered this way (subsequent registrations are blocked).

---

## API Routes Reference

### Auth (public)
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/auth/admin/exists` | Check if admin account exists |
| POST   | `/api/auth/register/admin` | Register admin (once only) |
| POST   | `/api/auth/register/employee` | Register employee |
| POST   | `/api/auth/register/client` | Register client |
| POST   | `/api/auth/login` | Password login |
| POST   | `/api/auth/send-otp` | Send OTP for OTP login |
| POST   | `/api/auth/login-otp` | Verify OTP and get JWT |
| POST   | `/api/auth/forgot-password/verify-email` | Send reset OTP |
| POST   | `/api/auth/forgot-password/reset` | Reset password with OTP |
| GET    | `/api/auth/me` | Get current user (JWT) |

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/public/landing-stats` | Home page stats |
| POST   | `/api/public/enquiry` | Submit enquiry |
| POST   | `/api/public/complaint` | Submit complaint |
| POST   | `/api/public/contact` | Submit contact form |
| POST   | `/api/public/feedback` | Submit feedback/review |
| GET    | `/api/public/meetings` | Public meetings |
| POST   | `/api/public/guest-chat` | Guest chat message |
| GET    | `/api/public/clients` | Public client list |
| GET    | `/api/public/projects` | Public project list |
| POST   | `/api/public/submit-project` | Guest project submission |
| POST   | `/api/public/pay-milestone` | Guest milestone payment |
| GET    | `/api/public/track-project/:code` | Track project by code |
| GET    | `/api/public/track/:identifier` | Track by email/tracking ID |

### Admin (JWT required, role=admin)
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/admin/dashboard` | Dashboard stats + charts |
| GET/POST | `/api/admin/clients` | List / create clients |
| GET/POST | `/api/admin/employees` | List / create employees |
| GET/PUT/DELETE | `/api/admin/employees/:id` | Get / update / delete employee |
| PATCH  | `/api/admin/employees/:id/toggle` | Activate/deactivate employee |
| PUT    | `/api/admin/employees/:id/salary` | Update salary |
| GET/POST/DELETE | `/api/admin/offer-letters` | Manage offer letters |
| PATCH  | `/api/admin/offer-letters/:id` | Update offer letter status |
| GET    | `/api/admin/offer-letters/:id/download` | Download offer letter HTML |
| GET/POST | `/api/admin/projects` | List / create projects |
| GET/PUT | `/api/admin/projects/:id` | Get / update project |
| POST   | `/api/admin/projects/:id/assign` | Assign project to employee |
| POST   | `/api/admin/projects/:id/reassign` | Reassign project |
| POST   | `/api/admin/projects/:id/send-domain` | Send domain to client |
| POST   | `/api/admin/projects/:projectId/review` | Review submitted work |
| POST   | `/api/admin/projects/:projectId/review-domain` | Review domain |
| POST   | `/api/admin/projects/:projectId/final-feedback` | Final delivery feedback |
| GET    | `/api/admin/projects/pending-review` | Projects awaiting review |
| GET    | `/api/admin/projects/ready-for-domain` | Projects ready for domain |
| GET/POST | `/api/admin/meetings` | List / create meetings |
| PUT/DELETE | `/api/admin/meetings/:id` | Update / delete meeting |
| GET    | `/api/admin/attendance` | All attendance records |
| GET    | `/api/admin/leaves` | All leave requests |
| PUT    | `/api/admin/leaves/:id` | Approve/reject leave |
| GET    | `/api/admin/early-leave` | Early leave requests |
| PUT    | `/api/admin/early-leave/:id` | Approve/reject early leave |
| GET/POST | `/api/admin/payroll` | List / process payroll |
| GET    | `/api/admin/payments` | All payments |
| GET    | `/api/admin/invoices` | All invoices |
| GET    | `/api/admin/complaints` | All complaints |
| PUT    | `/api/admin/complaints/:id` | Update complaint |
| GET/POST | `/api/admin/appraisals` | List / add appraisals |
| GET/POST | `/api/admin/promotions` | List / add promotions |
| GET    | `/api/admin/reports` | Analytics reports |
| GET    | `/api/admin/notifications` | Admin notifications |
| GET/PUT | `/api/admin/settings/profile` | Admin profile |
| PUT    | `/api/admin/settings/password` | Change password |
| GET/PUT | `/api/admin/system-settings` | System settings |
| POST   | `/api/admin/system/clear-data` | Clear operational data |
| POST   | `/api/admin/chat` | Send chat message |
| GET    | `/api/admin/chat-requests/pending` | Pending peer chat requests |
| POST   | `/api/admin/chat-request/:id/approve` | Approve peer chat |
| POST   | `/api/admin/chat-request/:id/reject` | Reject peer chat |
| POST   | `/api/admin/chat-request/:id/revoke` | Revoke peer chat |
| GET    | `/api/admin/peer-chats` | All peer chats |
| GET    | `/api/admin/peer-chat/:chatRequestId/messages` | Peer chat messages |
| GET    | `/api/admin/chat-reports` | Chat reports |

### Employee (JWT required, role=employee)
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/employee/dashboard` | Employee dashboard |
| GET    | `/api/employee/projects` | Assigned projects |
| PUT    | `/api/employee/projects/:assignmentId/status` | Update project status |
| PUT    | `/api/employee/projects/:id/progress` | Update progress % |
| POST   | `/api/employee/projects/:id/submit` | Submit work |
| POST   | `/api/employee/projects/:projectId/submit-domain` | Submit domain |
| GET    | `/api/employee/attendance` | Attendance history |
| GET    | `/api/employee/attendance/today` | Today's attendance |
| POST   | `/api/employee/attendance/check-in` | Check in |
| POST   | `/api/employee/attendance/check-out` | Check out |
| GET/POST | `/api/employee/leaves` | Leave requests |
| GET/POST | `/api/employee/early-leave` | Early leave requests |
| DELETE | `/api/employee/early-leave/:id` | Cancel early leave |
| GET    | `/api/employee/payroll` | Payroll history |
| GET    | `/api/employee/payroll/:id/payslip` | Download payslip HTML |
| GET    | `/api/employee/offer-letters` | Offer letters |
| GET    | `/api/employee/meetings` | Upcoming meetings |
| GET    | `/api/employee/appraisals` | Appraisals |
| GET    | `/api/employee/promotions` | Promotions |
| GET    | `/api/employee/performance` | Performance summary |
| GET/PUT | `/api/employee/settings/profile` | Profile |
| PUT    | `/api/employee/settings/password` | Change password |
| POST   | `/api/employee/chat` | Send chat to admin |
| GET/POST | `/api/employee/chat-request` | Peer chat requests |
| GET    | `/api/employee/chat-requests` | List chat requests |
| GET    | `/api/employee/colleagues` | List colleagues |
| POST   | `/api/employee/peer-chat/message` | Send peer message |
| GET    | `/api/employee/peer-chat/:chatRequestId` | Get peer chat |

### Client (JWT required, role=client)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/client/projects` | List / submit projects |
| POST   | `/api/client/projects/:id/approve` | Approve completed project |
| POST   | `/api/client/projects/:id/request-changes` | Request changes |
| POST   | `/api/client/invoices/:id/pay` | Pay invoice milestone |
| GET    | `/api/client/payments` | Payment history |
| POST   | `/api/client/feedback` | Submit feedback |
| POST   | `/api/client/complaint` | Submit complaint |
| GET    | `/api/client/chat/messages` | Chat with admin |
| POST   | `/api/client/chat` | Send message to admin |

---

## JWT Authentication

The frontend stores the JWT in `localStorage` under key `goalline_token`.

Every protected request includes:
```
Authorization: Bearer <token>
```

The Axios interceptor in `src/api/index.js` attaches the token automatically.
On a 401 response it clears the token and fires a `goalline:unauthorized` event.

---

## Deploying on Vercel (Frontend)

1. Push your project to GitHub.

2. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo.

3. Set **Root Directory** to `frontend`.

4. Add an environment variable:
   ```
   VITE_API_URL = https://your-backend.onrender.com/api
   ```

5. Click **Deploy**. Vercel auto-detects Vite.

6. `vercel.json` ensures all routes serve `index.html` (SPA rewrites).

---

## Deploying Backend on Render

1. Go to [render.com](https://render.com) → **New Web Service** → connect your GitHub repo.

2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node version:** 18

3. Add environment variables (same as `.env.example`):
   - `DB_HOST` → your PlanetScale / Aiven / Railway MySQL host
   - `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `JWT_SECRET` → random 64-char string
   - `FRONTEND_URL` → your Vercel app URL (e.g. `https://goalline.vercel.app`)
   - SMTP variables (optional)

4. Click **Create Web Service**. Render builds and starts your Node.js server.

---

## Connecting MySQL Database

### Option A — PlanetScale (recommended, free tier)

1. Create account at [planetscale.com](https://planetscale.com).
2. Create database `goalline`.
3. Go to **Connect** → copy the connection string.
4. Set env vars in Render:
   ```
   DB_HOST=aws.connect.psdb.cloud
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=goalline
   DB_PORT=3306
   ```
5. Import schema: use PlanetScale CLI or paste `schema.sql` content in their console.

### Option B — Railway

1. Create account at [railway.app](https://railway.app).
2. Add a **MySQL** plugin to your project.
3. Copy the connection variables from the dashboard.
4. Run `schema.sql` via the Railway database shell.

### Option C — Aiven (free tier)

1. Create a MySQL service at [aiven.io](https://aiven.io).
2. Copy the SSL connection details.
3. Add `ssl: { rejectUnauthorized: false }` to the pool config in `server.js` if required.

---

## Uploading to GitHub

```bash
# From the project root
git init
git add .
git commit -m "Initial commit — GoalLine full-stack app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/goalline.git
git push -u origin main
```

---

## Full Localhost → Production Deployment Checklist

| Step | Action |
|------|--------|
| 1 | Create MySQL database and run `schema.sql` |
| 2 | `cd backend && cp .env.example .env` → fill values |
| 3 | `npm install && npm run dev` — verify API at localhost:5005 |
| 4 | `cd frontend && cp .env.example .env` → leave `VITE_API_URL` empty |
| 5 | `npm install && npm run dev` — verify app at localhost:5173 |
| 6 | Register admin at `/staff/register` |
| 7 | Push code to GitHub |
| 8 | Deploy frontend to Vercel → set `VITE_API_URL` env var |
| 9 | Deploy backend to Render → set all env vars |
| 10 | Update `FRONTEND_URL` on Render to your Vercel URL |
| 11 | Test admin login, create employees, create projects end-to-end |

---

## Default Credentials

No defaults — you create the first admin via `/staff/register` on first run.

Employee and client accounts are created by the admin or via registration pages.

---

## Key Features

- **Admin Dashboard** — stats, charts, recent projects
- **Employee Management** — CRUD, salary breakdown, offer letters
- **Project Workflow** — assignment → development → review → delivery
- **Client Portal** — project tracking, invoice payments, feedback
- **Attendance** — check-in/out, leave requests, early leave
- **Payroll** — salary processing, payslip download
- **HR** — appraisals, promotions
- **Chat** — admin↔employee, admin↔client, guest chat, peer-to-peer (admin-approved)
- **Notifications** — real-time in-app notifications per user
- **OTP Login** — email OTP support (prints to console in dev mode)
- **Reports** — analytics and export
- **Role-Based Access** — admin / employee / client, fully enforced on API
