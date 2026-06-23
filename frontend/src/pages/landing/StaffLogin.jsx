import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdVerified, MdOutlineBadge, MdSecurity } from 'react-icons/md';
import { TbProgressCheck } from 'react-icons/tb';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './auth-split.css';

export default function StaffLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [portal, setPortal] = useState('employee');
  const [authMode, setAuthMode] = useState('otp');
  const [form, setForm] = useState({ email: '', password: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/admin/exists').then((r) => setAdminExists(r.data.exists)).catch(() => {});
  }, []);

  useEffect(() => {
    setOtpSent(false);
    setDevOtp('');
    setForm((f) => ({ ...f, otp: '' }));
    setError('');
  }, [portal, authMode]);

  const sendOtp = async () => {
    if (!form.email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/send-otp', { email: form.email.trim(), portal });
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
      if (authMode === 'password') {
        const res = await api.post('/auth/login', {
          email: form.email.trim(),
          password: form.password,
          portal,
        });
        login(res.data.token, res.data.user);
        navigate(portal === 'admin' ? '/admin' : '/employee');
        return;
      }
      if (!otpSent) {
        await sendOtp();
        return;
      }
      const res = await api.post('/auth/login-otp', {
        email: form.email.trim(),
        otp: form.otp.trim(),
        portal,
      });
      login(res.data.token, res.data.user);
      navigate(portal === 'admin' ? '/admin' : '/employee');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-container">
      <div className="split-left">
        <div className="info-card">
          <div className="info-logo">Goal<span>Line</span></div>
          <h2>Staff Portal Login</h2>
          <div className="info-features">
            <div className="info-feature">
              <span className="feature-icon"><MdSecurity /></span>
              <span>Email + password or OTP login</span>
            </div>
            <div className="info-feature">
              <span className="feature-icon"><TbProgressCheck /></span>
              <span>One admin · many employees</span>
            </div>
            <div className="info-feature">
              <span className="feature-icon"><MdVerified /></span>
              <span>Clients use landing page & client portal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="split-right">
        <div className="form-card">
          <div className="form-header">
            <h2>Sign In</h2>
            <p>Use email & password, or verify with OTP</p>
          </div>

          <div className="auth-mode-tabs">
            <button 
              type="button" 
              className={`auth-mode-btn ${authMode === 'otp' ? 'active' : ''}`} 
              onClick={() => setAuthMode('otp')}
            >
              OTP Login
            </button>
            <button 
              type="button" 
              className={`auth-mode-btn ${authMode === 'password' ? 'active' : ''}`} 
              onClick={() => setAuthMode('password')}
            >
              Email & Password
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Login as <span className={`role-badge role-badge--${portal}`}>{portal}</span></label>
              <div className="input-wrapper">
                <MdOutlineBadge className="input-icon" />
                <select className="role-select" value={portal} onChange={(e) => setPortal(e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {portal === 'admin' && !adminExists && (
              <div className="admin-banner">No admin yet. <Link to="/staff/register">Create admin (once)</Link></div>
            )}

            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <FaEnvelope className="input-icon" />
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
              </div>
            </div>

            {authMode === 'password' ? (
              <div className="input-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <FaLock className="input-icon" />
                  <input type={showPassword ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Your password" />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            ) : otpSent ? (
              <div className="input-group">
                <label>6-digit OTP</label>
                <div className="input-wrapper">
                  <FaLock className="input-icon" />
                  <input type="text" inputMode="numeric" maxLength={6} required value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '') })} />
                </div>
              </div>
            ) : null}

            {devOtp && authMode === 'otp' && (
              <div className="otp-hint-box">Dev OTP: <strong>{devOtp}</strong></div>
            )}
            {error && <span className="field-error">{error}</span>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Please wait…' : authMode === 'password' ? 'Login with Password' : otpSent ? 'Login with OTP' : 'Send Login OTP'}
            </button>
            {authMode === 'otp' && otpSent && (
              <button type="button" className="submit-btn-secondary" onClick={() => { setOtpSent(false); setDevOtp(''); }}>
                Resend OTP
              </button>
            )}
          </form>

          <div className="form-footer">
            <p><Link to="/staff/register">Create account</Link> · <Link to="/forgot-password">Forgot password?</Link></p>
            <Link to="/">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
