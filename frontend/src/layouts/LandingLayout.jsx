import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Target } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/track', label: 'Track' },
  { to: '/contact', label: 'Contact' },
];

export default function LandingLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'employee' ? '/employee' : user?.role === 'client' ? '/client/portal' : null;

  const linkClass = (to) =>
    `text-sm font-medium ${location.pathname === to ? 'text-brand-600' : 'text-slate-600 hover:text-brand-600'}`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-brand-700">
              <Target className="w-8 h-8" />
              GoalLine
            </Link>

            <nav className="hidden lg:flex items-center gap-5">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} className={linkClass(l.to)}>
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-2">
              {dashboardPath ? (
                <>
                  <Link to={dashboardPath} className="btn-primary text-sm py-2">Dashboard</Link>
                  <button type="button" onClick={logout} className="btn-secondary text-sm py-2">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/client/login" className="text-sm font-medium text-slate-600 hover:text-brand-600">Client Login</Link>
                  <Link to="/client/register" className="text-sm font-medium text-slate-600 hover:text-brand-600">Client Register</Link>
                  <Link to="/staff/login" className="btn-primary text-sm py-2">Staff Login</Link>
                </>
              )}
            </div>

            <button type="button" className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t bg-white px-4 py-4 space-y-3">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className="block py-2" onClick={() => setMobileOpen(false)}>{l.label}</Link>
            ))}
            {dashboardPath ? (
              <>
                <Link to={dashboardPath} className="block py-2" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <button type="button" className="block py-2 text-left w-full" onClick={() => { logout(); setMobileOpen(false); }}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/client/login" className="block py-2" onClick={() => setMobileOpen(false)}>Client Login</Link>
                <Link to="/client/register" className="block py-2" onClick={() => setMobileOpen(false)}>Client Register</Link>
                <Link to="/staff/login" className="block py-2" onClick={() => setMobileOpen(false)}>Staff Login</Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p className="font-semibold text-white text-lg mb-2">GoalLine</p>
          <p>Enterprise workflow management — projects, HR, payroll, and client services.</p>
          <p className="mt-4">&copy; {new Date().getFullYear()} GoalLine. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
