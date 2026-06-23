import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminDomains() {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ domain_name: '', hosting_details: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/admin/projects').then((r) => setProjects(r.data));

  useEffect(() => { load(); }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedId || !form.domain_name) return;
    setLoading(true);
    setMessage('');
    try {
      await api.post(`/admin/projects/${selectedId}/send-domain`, form);
      setMessage('Domain details sent to client.');
      setForm({ domain_name: '', hosting_details: '' });
      setSelectedId('');
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to send domain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Domain Management</h1>

      <form onSubmit={handleSend} className="card mb-8 max-w-xl space-y-4">
        <h2 className="font-semibold">Send Domain to Client</h2>
        <select
          className="input-field"
          required
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} — {p.client_name} ({p.tracking_id})
            </option>
          ))}
        </select>
        <input
          className="input-field"
          placeholder="Domain name"
          required
          value={form.domain_name}
          onChange={(e) => setForm({ ...form, domain_name: e.target.value })}
        />
        <textarea
          className="input-field"
          placeholder="Hosting details (optional)"
          rows={3}
          value={form.hosting_details}
          onChange={(e) => setForm({ ...form, hosting_details: e.target.value })}
        />
        {message && (
          <p className={`text-sm ${message.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send Domain to Client'}
        </button>
      </form>

      <h2 className="font-semibold text-lg mb-4">Projects with domains</h2>
      <div className="space-y-4">
        {projects.filter((p) => p.domain_name).map((p) => (
          <div key={p.id} className="card">
            <h3 className="font-medium">{p.title}</h3>
            <p className="text-sm text-slate-500">{p.client_name} · {p.tracking_id}</p>
            <p className="mt-2 text-brand-700 font-medium">{p.domain_name}</p>
            {p.hosting_details && <p className="text-sm text-slate-600 mt-1">{p.hosting_details}</p>}
          </div>
        ))}
        {!projects.some((p) => p.domain_name) && (
          <p className="text-slate-500">No domains sent yet.</p>
        )}
      </div>
    </div>
  );
}
