import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [portal, setPortal] = useState('admin');
  const [mode, setMode] = useState('password');
  const [form, setForm] = useState({ email: '', password: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [adminExists, setAdminExists] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/admin/exists').then((r) => setAdminExists(r.data.exists)).catch(() => {});
  }, []);

  useEffect(() => {
    setOtpSent(false);
    setDevOtp('');
    setError('');
  }, [portal, mode]);

  const sendOtp = async () => {
    if (!form.email) return setError('Enter email first');
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/send-otp', { email: form.email, portal });
      setOtpSent(true);
      if (res.data.dev_otp) setDevOtp(res.data.dev_otp);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = mode === 'otp'
        ? await api.post('/auth/login-otp', { email: form.email, otp: form.otp, portal })
        : await api.post('/auth/login', { email: form.email, password: form.password, portal });
      login(res.data.token, res.data.user);
      navigate(portal === 'admin' ? '/admin' : '/employee');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-2">Staff Login</h1>
      <p className="text-slate-600 text-center mb-6">Admin (one account) and Employees</p>

      <div className="flex gap-2 mb-4">
        {['admin', 'employee'].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPortal(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize ${
              portal === p ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {portal === 'admin' && !adminExists && (
        <p className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-center">
          No admin yet. <Link to="/admin/register" className="text-brand-600 font-semibold">Create admin account</Link>
        </p>
      )}

      {portal === 'employee' && (
        <p className="text-sm text-center text-slate-500 mb-4">
          New employee? <Link to="/employee/register" className="text-brand-600 font-semibold">Register here</Link>
        </p>
      )}

      <div className="flex gap-2 mb-6">
        <button type="button" onClick={() => setMode('password')} className={`flex-1 py-2 text-sm ${mode === 'password' ? 'text-brand-600 font-semibold border-b-2 border-brand-600' : ''}`}>
          Password
        </button>
        <button type="button" onClick={() => setMode('otp')} className={`flex-1 py-2 text-sm ${mode === 'otp' ? 'text-brand-600 font-semibold border-b-2 border-brand-600' : ''}`}>
          OTP Login
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <input className="input-field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        {mode === 'password' ? (
          <input className="input-field" type="password" placeholder="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        ) : !otpSent ? (
          <button type="button" onClick={sendOtp} className="btn-secondary w-full" disabled={loading}>Send Login OTP</button>
        ) : (
          <>
            <input className="input-field" placeholder="6-digit OTP" required maxLength={6} value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} />
            {devOtp && (
              <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">
                Dev OTP: <strong className="tracking-widest">{devOtp}</strong>
              </p>
            )}
          </>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading || (mode === 'otp' && !otpSent)}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-slate-500">
        Clients: use <Link to="/track" className="text-brand-600">Track Project</Link> on the website (no login).
      </p>
    </div>
  );
}