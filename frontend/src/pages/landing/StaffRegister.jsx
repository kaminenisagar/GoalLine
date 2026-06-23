import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaPhone } from 'react-icons/fa';
import { MdVerified, MdOutlineBadge } from 'react-icons/md';
import { TbProgressCheck } from 'react-icons/tb';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './auth-split.css';

export default function StaffRegister() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [adminExists, setAdminExists] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    role: 'employee', agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/admin/exists').then((r) => {
      setAdminExists(r.data.exists);
      if (r.data.exists && formData.role === 'admin') {
        setFormData((f) => ({ ...f, role: 'employee' }));
      }
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const freshErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[a-zA-Z\s]{3,50}$/;
    if (!nameRegex.test(formData.fullName.trim())) freshErrors.fullName = 'Name must be 3–50 letters only.';
    if (!emailRegex.test(formData.email)) freshErrors.email = 'Enter a valid email address.';
    if (formData.password.length < 6) freshErrors.password = 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) freshErrors.confirmPassword = 'Passwords do not match.';
    if (!formData.agreeTerms) freshErrors.agreeTerms = 'You must accept the terms and conditions.';
    if (formData.role === 'admin' && adminExists) freshErrors.role = 'Admin already exists. Only one admin is allowed.';
    setErrors(freshErrors);
    return Object.keys(freshErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const body = {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim() || undefined,
      };
      if (formData.role === 'admin') {
        const res = await api.post('/auth/register/admin', body);
        login(res.data.token, { email: body.email, role: 'admin', full_name: body.full_name });
        navigate('/admin');
      } else {
        await api.post('/auth/register/employee', body);
        navigate('/staff/login', { state: { message: 'Employee registered! Login with OTP.' } });
      }
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || err.message || 'Registration failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="split-container">
      <div className="split-left">
        <div className="info-card">
          <div className="info-logo">Goal<span>Line</span></div>
          <h2>Join GoalLine Today</h2>
          <div className="info-features">
            <div className="info-feature">
              <span className="feature-icon"><TbProgressCheck /></span>
              <span>Admin: one-time setup only</span>
            </div>
            <div className="info-feature">
              <span className="feature-icon"><MdVerified /></span>
              <span>Employees: unlimited registrations</span>
            </div>
            <div className="info-feature">
              <span className="feature-icon"><MdOutlineBadge /></span>
              <span>Login with OTP after registration</span>
            </div>
          </div>
        </div>
      </div>
      <div className="split-right">
        <div className="form-card">
          <div className="form-header">
            <h2>Create Account</h2>
            <p>No OTP needed to register — OTP is used at login only</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Register as</label>
              <div className="input-wrapper">
                <MdOutlineBadge className="input-icon" />
                <select name="role" className="role-select" value={formData.role} onChange={handleChange}>
                  <option value="employee">Employee (many allowed)</option>
                  <option value="admin" disabled={adminExists}>Admin {adminExists ? '(already exists)' : '(one-time only)'}</option>
                </select>
              </div>
              {errors.role && <span className="field-error">{errors.role}</span>}
            </div>
            <div className="input-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <FaUser className="input-icon" />
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter full name" required />
              </div>
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <FaEnvelope className="input-icon" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email address" required />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="input-group">
              <label>Phone (optional)</label>
              <div className="input-wrapper">
                <FaPhone className="input-icon" />
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" />
              </div>
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="input-wrapper">
                <FaLock className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Create password (min 6 chars)" required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <FaLock className="input-icon" />
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" required />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
            </div>
            <div className="input-group checkbox-group">
              <label>
                <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} />
                <span>I agree to the Terms and Conditions</span>
              </label>
              {errors.agreeTerms && <span className="field-error">{errors.agreeTerms}</span>}
            </div>
            {errors.submit && <span className="field-error">{errors.submit}</span>}
            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Creating Account…' : formData.role === 'admin' ? 'Create Admin Account' : 'Create Employee Account'}
            </button>
          </form>
          <div className="form-footer">
            <p>Already have an account? <Link to="/staff/login">Login with OTP</Link></p>
            <Link to="/">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
