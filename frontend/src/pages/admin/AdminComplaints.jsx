import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);

  const load = () => api.get('/admin/complaints').then((res) => setComplaints(res.data));
  useEffect(() => { load(); }, []);

  const update = async (id, status) => {
    await api.put(`/admin/complaints/${id}`, { status, admin_response: 'We are working on your complaint.' });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Complaints</h1>
      <div className="space-y-4">
        {complaints.map((c) => (
          <div key={c.id} className="card">
            <div className="flex justify-between mb-2">
              <span className="font-mono text-sm text-brand-600">{c.ticket_id}</span>
              <span className="capitalize text-sm">{c.status}</span>
            </div>
            <h3 className="font-medium">{c.subject}</h3>
            <p className="text-sm text-slate-600 mt-1">{c.description}</p>
            <p className="text-xs text-slate-400 mt-2">{c.email}</p>
            {c.status === 'open' && (
              <button onClick={() => update(c.id, 'in_progress')} className="btn-primary text-sm mt-3 py-2">
                Mark In Progress
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
