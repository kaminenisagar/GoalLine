import { useState } from 'react';
import api from '../../services/api';

export default function Enquiry() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', company_name: '',
    project_type: '', budget_range: '', description: '',
  });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await api.post('/public/enquiry', form);
      setStatus('success');
      setForm({ full_name: '', email: '', phone: '', company_name: '', project_type: '', budget_range: '', description: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-2">Project Enquiry</h1>
      <p className="text-slate-600 text-center mb-8">Tell us about your project requirements</p>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <input className="input-field" placeholder="Full Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className="input-field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input-field" placeholder="Company Name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <select className="input-field" required value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })}>
            <option value="">Project Type</option>
            <option>Web Development</option>
            <option>Mobile App</option>
            <option>E-Commerce</option>
            <option>Custom Software</option>
            <option>UI/UX Design</option>
          </select>
          <select className="input-field" value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })}>
            <option value="">Budget Range</option>
            <option>Under $5,000</option>
            <option>$5,000 - $15,000</option>
            <option>$15,000 - $50,000</option>
            <option>$50,000+</option>
          </select>
        </div>
        <textarea className="input-field" rows={5} placeholder="Project Description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button type="submit" className="btn-primary w-full" disabled={status === 'sending'}>
          {status === 'sending' ? 'Submitting...' : 'Submit Enquiry'}
        </button>
        {status === 'success' && <p className="text-green-600 text-sm text-center">Enquiry submitted! We will contact you soon.</p>}
        {status === 'error' && <p className="text-red-600 text-sm text-center">Submission failed. Please try again.</p>}
      </form>
    </div>
  );
}
