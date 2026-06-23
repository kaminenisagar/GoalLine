import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import { MdEmail, MdSecurity, MdVerified } from 'react-icons/md';
import api from '../../services/api';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/verify-email', { email });
      if (res.data.dev_otp) setDevOtp(res.data.dev_otp);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;
    if (value.length > 1) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) document.getElementById(`forgot-otp-${index + 1}`)?.focus();
    if (error) setError('');
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    const entered = otp.join('');
    if (entered.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password/reset', {
        email,
        otp: otp.join(''),
        newPassword,
      });
      setShowSuccessModal(true);
      setTimeout(() => navigate('/staff/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccessModal) {
    return (
      <div className="forgot-success-overlay">
        <div className="forgot-success-modal">
          <FaCheckCircle className="forgot-success-icon" />
          <h3>Password Reset Successful</h3>
          <p>Redirecting to staff login…</p>
          <button type="button" onClick={() => navigate('/staff/login')}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-split-container">
      <div className="forgot-split-left">
        <div className="forgot-info-card">
          <div className="info-logo">Goal<span>Line</span></div>
          <h2>Reset Your Password</h2>
          <div className="info-features">
            <div className="info-feature"><MdSecurity /><span>Secure OTP verification</span></div>
            <div className="info-feature"><MdVerified /><span>For admin & employee accounts</span></div>
          </div>
        </div>
      </div>
      <div className="forgot-split-right">
        <div className="forgot-form-card">
          <h2>{step === 1 ? 'Enter Your Email' : step === 2 ? 'Verify OTP' : 'Create New Password'}</h2>

          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              <label>Email Address</label>
              <div className="input-wrapper">
                <MdEmail className="input-icon" />
                <input type="email" placeholder="Registered staff email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error && <p className="forgot-error">{error}</p>}
              <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Sending…' : 'Send Reset OTP'}</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <label>Enter OTP</label>
              <div className="otp-container">
                {otp.map((digit, index) => (
                  <input key={index} id={`forgot-otp-${index}`} type="text" maxLength={1} value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)} className="otp-input" autoFocus={index === 0} />
                ))}
              </div>
              {devOtp && <p className="dev-otp-hint">Dev OTP: <strong>{devOtp}</strong></p>}
              {error && <p className="forgot-error">{error}</p>}
              <button type="submit" className="submit-btn">Verify OTP</button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <label>New Password</label>
              <div className="input-wrapper">
                <FaLock className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <FaLock className="input-icon" />
                <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {error && <p className="forgot-error">{error}</p>}
              <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Resetting…' : 'Reset Password'}</button>
            </form>
          )}

          <p className="forgot-footer">
            <Link to="/staff/login">Back to Staff Login</Link> · <Link to="/">Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
