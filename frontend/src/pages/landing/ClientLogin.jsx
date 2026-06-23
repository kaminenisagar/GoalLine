import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { MdVerified, MdSecurity } from 'react-icons/md';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './auth-split.css';

export default function ClientLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('otp');
  const [form, setForm] = useState({ email: '', password: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const portal = 'client';

  useEffect(() => {
    setOtpSent(false);
    setDevOtp('');
    setError('');
  }, [authMode]);

  const sendOtp = async () => {
    if (!form.email.trim()) return setError('Enter email first');
    setLoading(true);
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
        const res = await api.post('/auth/login', { email: form.email.trim(), password: form.password, portal });
        login(res.data.token, res.data.user);
        navigate('/client/portal');
        return;
      }
      if (!otpSent) {
        await sendOtp();
        return;
      }
      const res = await api.post('/auth/login-otp', { email: form.email.trim(), otp: form.otp.trim(), portal });
      login(res.data.token, res.data.user);
      navigate('/client/portal');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      <div className="auth-split-left">
        <div className="info-card">
          <div className="info-logo">Goal<span>Line</span></div>
          <h2>Client Portal</h2>
          <div className="info-features">
            <div className="info-feature"><span className="feature-icon"><MdSecurity /></span><span>Email + password or OTP</span></div>
            <div className="info-feature"><span className="feature-icon"><MdVerified /></span><span>Payments, feedback, domain & complaints</span></div>
          </div>
        </div>
      </div>
      <div className="auth-split-right">
        <div className="form-card">
          <div className="form-header">
            <h2>Client Login</h2>
            <p className="section-sub" style={{ margin: 0,marginBottom:"10px" }}>Sign in with email & password, or OTP verification</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button type="button" className={authMode === 'otp' ? 'submit-btn' : 'submit-btn-secondary'} style={{ flex: 1, margin: 0 }} onClick={() => setAuthMode('otp')}>OTP</button>
            <button type="button" className={authMode === 'password' ? 'submit-btn' : 'submit-btn-secondary'} style={{ flex: 1, margin: 0 }} onClick={() => setAuthMode('password')}>Password</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email</label>
              <div className="input-wrapper">
                <FaEnvelope className="input-icon" />
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            {authMode === 'password' ? (
              <div className="input-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <FaLock className="input-icon" />
                  <input type={showPassword ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FaEyeSlash /> : <FaEye />}</button>
                </div>
              </div>
            ) : otpSent && (
              <div className="input-group">
                <label>OTP</label>
                <input className="input-field" maxLength={6} required value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} style={{ width: '100%' }} />
              </div>
            )}
            {devOtp && <div className="otp-hint-box">Dev OTP: <strong>{devOtp}</strong></div>}
            {error && <span className="field-error">{error}</span>}
            <button type="submit" className="submit-btn" disabled={loading}>
              {authMode === 'password' ? 'Login' : otpSent ? 'Verify OTP' : 'Send OTP'}
            </button>
          </form>
          <div className="form-footer">
            <p><Link to="/client/register">Register</Link> · <Link to="/">Track on Home</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
