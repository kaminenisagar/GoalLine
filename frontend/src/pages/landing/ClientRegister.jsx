import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ClientRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', company_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register/client', form);
      navigate('/client/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-2">Client Registration</h1>
      <p className="text-slate-600 text-center mb-8">Create your GoalLine client account</p>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <input
          className="input-field"
          placeholder="Full Name"
          required
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
        <input
          className="input-field"
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="input-field"
          placeholder="Company Name (optional)"
          value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })}
        />
        <input
          className="input-field"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className="text-center mt-6 text-sm">
        Already have an account? <Link to="/client/login" className="text-brand-600 font-semibold">Client Login</Link>
      </p>
    </div>
  );
}
