import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);

  const load = () => api.get('/admin/leaves').then((res) => setLeaves(res.data));
  useEffect(() => { load(); }, []);

  const review = async (id, status) => {
    await api.put(`/admin/leaves/${id}`, { status });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Leave Requests</h1>
      <div className="space-y-4">
        {leaves.map((l) => (
          <div key={l.id} className="card flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="font-medium">{l.full_name} ({l.employee_code})</p>
              <p className="text-sm text-slate-500 capitalize">{l.leave_type} · {l.start_date} to {l.end_date}</p>
              <p className="text-sm mt-1">{l.reason}</p>
            </div>
            {l.status === 'pending' ? (
              <div className="flex gap-2">
                <button onClick={() => review(l.id, 'approved')} className="btn-primary text-sm py-2">Approve</button>
                <button onClick={() => review(l.id, 'rejected')} className="btn-secondary text-sm py-2">Reject</button>
              </div>
            ) : (
              <span className={`capitalize font-medium ${l.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                {l.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
