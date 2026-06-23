import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LayoutDashboard, Users, FolderKanban, Building2, Wallet, Globe,
  CalendarOff, MessageSquareWarning, BarChart3, Bell, LogOut, Target, Settings,
  ClipboardList, Clock, Banknote, Star, TrendingUp, Activity, FileText,
  MessageSquare, Calendar, ChevronRight, Menu, X,
} from 'lucide-react';

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/clients', icon: Building2, label: 'Clients' },
  { to: '/admin/employees', icon: Users, label: 'Employees' },
  { to: '/admin/attendance', icon: Clock, label: 'Attendance' },
  { to: '/admin/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/admin/domains', icon: Globe, label: 'Domains' },
  { to: '/admin/payments', icon: Wallet, label: 'Payments' },
  { to: '/admin/payroll', icon: Banknote, label: 'Payroll' },
  { to: '/admin/hr', icon: Users, label: 'HR Management' },
  { to: '/admin/meetings', icon: Calendar, label: 'Meetings' },
  { to: '/admin/chat', icon: MessageSquare, label: 'Individual Chat' },
  { to: '/admin/offer-letters', icon: FileText, label: 'Offer Letters' },
  { to: '/admin/complaints', icon: MessageSquareWarning, label: 'Complaints' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

const employeeNav = [
  { to: '/employee', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/employee/projects', icon: ClipboardList, label: 'Projects' },
  { to: '/employee/attendance', icon: Clock, label: 'Attendance' },
  { to: '/employee/meetings', icon: Calendar, label: 'Meetings' },
  { to: '/employee/chat', icon: MessageSquare, label: 'Individual Chat' },
  { to: '/employee/leaves', icon: CalendarOff, label: 'Leaves' },
  { to: '/employee/early-leave', icon: FileText, label: 'Early Leave' },
  { to: '/employee/payroll', icon: Banknote, label: 'Salary & Payslips' },
  { to: '/employee/appraisals', icon: Star, label: 'Appraisals' },
  { to: '/employee/promotions', icon: TrendingUp, label: 'Promotions' },
  { to: '/employee/performance', icon: Activity, label: 'Performance' },
  { to: '/employee/offer-letters', icon: FileText, label: 'Offer Letters' },
  { to: '/employee/settings', icon: Settings, label: 'Settings' },
];

function NavLinks({ nav, location, onClose, disabledMap, onShowModal }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
      {nav.map(({ to, icon: Icon, label, end }) => {
        const active = end ? location.pathname === to : location.pathname.startsWith(to);
        const disabled = disabledMap && disabledMap[to];

        if (disabled) {
          return (
            <button
              key={to}
              type="button"
              onClick={() => onShowModal(label)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group text-slate-500 bg-slate-800/30 cursor-not-allowed`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
            </button>
          );
        }

        return (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
              active
                ? 'bg-brand-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {active && <ChevronRight className="w-3 h-3 opacity-60" />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ type }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const nav = type === 'admin' ? adminNav : employeeNav;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [disabledMap, setDisabledMap] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalText, setModalText] = useState('');

  useEffect(() => {
    if (type !== 'employee') return;

    // map routes to system-setting keys that control freezing
    const routeKeyMap = {
      '/employee': 'freeze_employee_dashboard',
      '/employee/chat': 'freeze_employee_chat',
      '/employee/attendance': 'freeze_attendance',
      '/employee/leaves': 'freeze_leave_requests',
      '/employee/payroll': 'freeze_payroll',
      '/employee/offer-letters': 'freeze_payroll',
      '/employee/settings': 'freeze_employee_profile_edit',
    };

    const keys = Array.from(new Set(Object.values(routeKeyMap)));

    Promise.all(keys.map((k) => api.get(`/system-settings/check?key=${k}`).then(r => ({ key: k, value: r.data.value === '1' })).catch(() => ({ key: k, value: false }))))
      .then((results) => {
        const state = {};
        Object.entries(routeKeyMap).forEach(([route, key]) => {
          const res = results.find(r => r.key === key);
          state[route] = res ? res.value : false;
        });
        setDisabledMap(state);
      });
  }, [type]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarContent = (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-700 shrink-0">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Target className="w-6 h-6 text-brand-400 shrink-0" />
          <span>GoalLine</span>
        </Link>
        <p className="text-xs text-slate-400 mt-0.5 capitalize">{type} Portal</p>
      </div>

      <NavLinks nav={nav} location={location} onClose={() => setSidebarOpen(false)} disabledMap={disabledMap} onShowModal={(label) => { setModalText(`${label} is currently disabled by the admin.`); setModalOpen(true); }} />

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-700 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1.5 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Desktop Sidebar — fixed */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white fixed top-0 left-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 max-w-[80vw] h-full z-10">
            <button
              className="absolute top-3 right-3 text-slate-400 hover:text-white z-20"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-1 rounded-md text-slate-500 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="capitalize font-medium text-slate-700 hidden sm:inline">{type}</span>
              <ChevronRight className="w-3 h-3 hidden sm:inline" />
              <span className="capitalize text-xs sm:text-sm">
                {location.pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Dashboard'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm text-slate-600 font-medium hidden sm:inline">{user?.full_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
              type === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>{type}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="bg-white p-6 rounded-lg z-10 max-w-sm shadow-lg">
            <h3 className="font-semibold mb-2">Access Restricted</h3>
            <p className="text-sm text-slate-600 mb-4">{modalText}</p>
            <div className="text-right">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
