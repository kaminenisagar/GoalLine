import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminRegister() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/admin/exists').then((r) => {
      if (r.data.exists) setBlocked(true);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register/admin', form);
      login(res.data.token, { email: form.email, role: 'admin', full_name: form.full_name });
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (blocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center card">
        <p className="text-red-600 font-medium">Admin account already exists.</p>
        <p className="text-sm text-slate-500 mt-2">Only one admin is allowed.</p>
        <Link to="/staff/login" className="btn-primary inline-block mt-6">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-2">Create Admin Account</h1>
      <p className="text-slate-600 text-center mb-8">One-time setup — only one admin allowed</p>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <input className="input-field" placeholder="Full Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input className="input-field" type="email" placeholder="Admin Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input-field" type="password" placeholder="Password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Creating...' : 'Create Admin'}</button>
      </form>
      <p className="text-center mt-6 text-sm">
        <Link to="/staff/login" className="text-brand-600">Back to Login</Link>
      </p>
    </div>
  );
}