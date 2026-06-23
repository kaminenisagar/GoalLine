import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', company_name: '' });
  const [trackingId, setTrackingId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register/client', form);
      setTrackingId(res.data.tracking_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (trackingId) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="card">
          <h2 className="text-xl font-semibold text-green-600 mb-2">Registered!</h2>
          <p className="text-slate-600 mb-4">Save your tracking ID:</p>
          <p className="font-mono text-lg font-bold text-brand-700">{trackingId}</p>
          <Link to="/track" className="btn-primary inline-block mt-6">Track Project</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-2">Client Registration</h1>
      <p className="text-slate-600 text-center mb-8">No login required — get a tracking ID for your projects</p>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <input className="input-field" placeholder="Full Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input className="input-field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input-field" placeholder="Company Name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        <input className="input-field" type="password" placeholder="Password (for future use)" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
      </form>
      <p className="text-center mt-6 text-sm">
        Staff? <Link to="/login" className="text-brand-600">Admin / Employee Login</Link>
      </p>
    </div>
  );
}