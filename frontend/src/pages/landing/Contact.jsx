import { useState } from 'react';
import api from '../../services/api';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await api.post('/public/enquiry', {
        full_name: form.name,
        email: form.email,
        description: `Subject: ${form.subject}\n\n${form.message}`,
        project_type: 'General Contact',
      });
      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
      <p className="text-slate-600 mb-8">Have questions? We would love to hear from you.</p>
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-4 text-slate-600">
          <p><strong>Email:</strong> support@goalline.com</p>
          <p><strong>Phone:</strong> +1 (555) 123-4567</p>
          <p><strong>Hours:</strong> Mon–Fri, 9am–6pm</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <input className="input-field" placeholder="Your Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input-field" placeholder="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea className="input-field" rows={4} placeholder="Message" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <button type="submit" className="btn-primary w-full" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending...' : 'Send Message'}
          </button>
          {status === 'success' && <p className="text-green-600 text-sm">Message sent successfully!</p>}
          {status === 'error' && <p className="text-red-600 text-sm">Failed to send. Please try again.</p>}
        </form>
      </div>
    </div>
  );
}
