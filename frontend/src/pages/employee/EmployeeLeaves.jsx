import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function EmployeeLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/employee/leaves').then((res) => setLeaves(res.data));
  useEffect(() => { load(); }, []);

  const apply = async (e) => {
    e.preventDefault();
    await api.post('/employee/leaves', form);
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Leave Requests</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">Apply Leave</button>
      </div>
      {showForm && (
        <form onSubmit={apply} className="card mb-6 grid sm:grid-cols-2 gap-4">
          <select className="input-field" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
            <option value="sick">Sick</option>
            <option value="casual">Casual</option>
            <option value="annual">Annual</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <input className="input-field" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <input className="input-field" type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <textarea className="input-field" placeholder="Reason" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button type="submit" className="btn-primary sm:col-span-2">Submit Request</button>
        </form>
      )}
      <div className="space-y-3">
        {leaves.map((l) => (
          <div key={l.id} className="card flex justify-between">
            <div>
              <p className="font-medium capitalize">{l.leave_type} Leave</p>
              <p className="text-sm text-slate-500">{l.start_date} to {l.end_date}</p>
            </div>
            <span className={`capitalize font-medium ${l.status === 'approved' ? 'text-green-600' : l.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
              {l.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
