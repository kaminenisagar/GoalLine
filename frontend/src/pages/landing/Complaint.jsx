import { useState } from 'react';
import api from '../../services/api';

export default function Complaint() {
  const [form, setForm] = useState({ email: '', subject: '', description: '', project_id: '' });
  const [ticketId, setTicketId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/public/complaint', {
        ...form,
        project_id: form.project_id || undefined,
      });
      setTicketId(res.data.ticket_id);
      setForm({ email: '', subject: '', description: '', project_id: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-2">Submit a Complaint</h1>
      <p className="text-slate-600 text-center mb-8">We will respond promptly. Admin receives automatic notification.</p>
      {ticketId ? (
        <div className="card text-center">
          <p className="text-green-600 font-medium">Complaint submitted successfully!</p>
          <p className="mt-2">Ticket ID: <strong>{ticketId}</strong></p>
          <button onClick={() => setTicketId('')} className="btn-secondary mt-4">Submit Another</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <input className="input-field" type="email" placeholder="Your Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input-field" placeholder="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <input className="input-field" placeholder="Project ID (optional)" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} />
          <textarea className="input-field" rows={5} placeholder="Describe your complaint" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full">Submit Complaint</button>
        </form>
      )}
    </div>
  );
}
