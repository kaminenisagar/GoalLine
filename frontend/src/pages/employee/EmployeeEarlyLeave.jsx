import { useEffect, useState } from 'react';
import api from '../../services/api';

const emptyForm = { date: '', leave_time: '', reason: '' };

export default function EmployeeEarlyLeave() {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get('/employee/early-leave').then((r) => setRequests(r.data));

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (req) => {
    if (req.status !== 'pending') return;
    setEditId(req.id);
    setForm({ date: req.date?.slice(0, 10) || req.date, leave_time: req.leave_time || '', reason: req.reason || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await api.put(`/employee/early-leave/${editId}`, form);
    } else {
      await api.post('/employee/early-leave', form);
    }
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this early leave request?')) return;
    await api.delete(`/employee/early-leave/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Early Leave Requests</h1>
        <button type="button" onClick={openCreate} className="btn-primary">New Request</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 grid sm:grid-cols-2 gap-4 max-w-2xl">
          <h2 className="font-semibold sm:col-span-2">{editId ? 'Edit Request' : 'New Early Leave'}</h2>
          <input
            className="input-field"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input
            className="input-field"
            type="time"
            placeholder="Leave time"
            value={form.leave_time}
            onChange={(e) => setForm({ ...form, leave_time: e.target.value })}
          />
          <textarea
            className="input-field sm:col-span-2"
            placeholder="Reason"
            required
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Submit'}</button>
            <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="card flex flex-wrap justify-between gap-4 items-start">
            <div>
              <p className="font-medium">{r.date?.slice?.(0, 10) || r.date}</p>
              {r.leave_time && <p className="text-sm text-slate-500">Leave at: {r.leave_time}</p>}
              <p className="text-sm text-slate-600 mt-1">{r.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`capitalize text-sm font-medium px-3 py-1 rounded-full ${
                r.status === 'approved' ? 'bg-green-100 text-green-700' :
                r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {r.status}
              </span>
              {r.status === 'pending' && (
                <>
                  <button type="button" onClick={() => openEdit(r)} className="btn-secondary text-sm py-2">Edit</button>
                  <button type="button" onClick={() => handleDelete(r.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
        {!requests.length && <p className="text-slate-500">No early leave requests yet.</p>}
      </div>
    </div>
  );
}
