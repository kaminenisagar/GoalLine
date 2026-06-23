import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function EmployeeRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', department: '', designation: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register/employee', form);
      setCode(res.data.employee_code);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (code) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center card">
        <h2 className="text-xl font-semibold text-green-600 mb-2">Registered!</h2>
        <p className="text-slate-600">Employee code: <strong>{code}</strong></p>
        <Link to="/login" className="btn-primary inline-block mt-6">Login Now</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-2">Employee Registration</h1>
      <p className="text-slate-600 text-center mb-8">Create your account — then login with password or OTP</p>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <input className="input-field" placeholder="Full Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input className="input-field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input-field" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <input className="input-field" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
        <input className="input-field" type="password" placeholder="Password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
      </form>
      <p className="text-center mt-6 text-sm">
        <Link to="/login" className="text-brand-600">Already registered? Login</Link>
      </p>
    </div>
  );
}