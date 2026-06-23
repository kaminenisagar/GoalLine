import { useEffect, useState } from 'react';
import api from '../../services/api';

const TABS = ['leaves', 'early-leave', 'appraisals', 'promotions', 'hikes'];

export default function AdminHR() {
  const [tab, setTab] = useState('leaves');
  const [leaves, setLeaves] = useState([]);
  const [earlyLeaves, setEarlyLeaves] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [appraisalForm, setAppraisalForm] = useState({ employee_id: '', period: '', rating: 5, feedback: '' });
  const [promoForm, setPromoForm] = useState({ employee_id: '', new_designation: '', effective_date: '', notes: '' });
  const [hikeForm, setHikeForm] = useState({ employee_id: '', salary: '' });

  const load = async () => {
    const [l, el, a, p, e] = await Promise.all([
      api.get('/admin/leaves'),
      api.get('/admin/early-leave'),
      api.get('/admin/appraisals'),
      api.get('/admin/promotions'),
      api.get('/admin/employees'),
    ]);
    setLeaves(l.data);
    setEarlyLeaves(el.data);
    setAppraisals(a.data);
    setPromotions(p.data);
    setEmployees(e.data);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">HR Management</h1>
      <p className="text-slate-600 mb-6">Admin controls leaves, appraisals, promotions, and salary hikes</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm capitalize ${tab === t ? 'bg-brand-600 text-white' : 'bg-slate-200'}`}>{t.replace('-', ' ')}</button>
        ))}
      </div>

      {tab === 'leaves' && leaves.map((l) => (
        <div key={l.id} className="card mb-3 flex justify-between items-center">
          <div><p className="font-medium">{l.full_name}</p><p className="text-sm text-slate-500">{l.leave_type} · {l.start_date} – {l.end_date}</p></div>
          {l.status === 'pending' && (
            <div className="flex gap-2">
              <button type="button" className="btn-primary text-sm py-2" onClick={() => api.put(`/admin/leaves/${l.id}`, { status: 'approved' }).then(load)}>Approve</button>
              <button type="button" className="btn-secondary text-sm py-2" onClick={() => api.put(`/admin/leaves/${l.id}`, { status: 'rejected' }).then(load)}>Reject</button>
            </div>
          )}
          {l.status !== 'pending' && <span className="capitalize">{l.status}</span>}
        </div>
      ))}

      {tab === 'early-leave' && earlyLeaves.map((l) => (
        <div key={l.id} className="card mb-3 flex justify-between">
          <div><p className="font-medium">{l.full_name}</p><p className="text-sm">{l.date} · {l.reason}</p></div>
          {l.status === 'pending' && (
            <div className="flex gap-2">
              <button type="button" className="btn-primary text-sm py-2" onClick={() => api.put(`/admin/early-leave/${l.id}`, { status: 'approved' }).then(load)}>Approve</button>
              <button type="button" className="btn-secondary text-sm py-2" onClick={() => api.put(`/admin/early-leave/${l.id}`, { status: 'rejected' }).then(load)}>Reject</button>
            </div>
          )}
        </div>
      ))}

      {tab === 'appraisals' && (
        <>
          <form className="card mb-6 grid sm:grid-cols-2 gap-3" onSubmit={async (e) => {
            e.preventDefault();
            await api.post('/admin/appraisals', appraisalForm);
            setAppraisalForm({ employee_id: '', period: '', rating: 5, feedback: '' });
            load();
          }}>
            <select className="input-field" required value={appraisalForm.employee_id} onChange={(e) => setAppraisalForm({ ...appraisalForm, employee_id: e.target.value })}>
              <option value="">Employee</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
            <input className="input-field" placeholder="Period e.g. Q1 2026" required value={appraisalForm.period} onChange={(e) => setAppraisalForm({ ...appraisalForm, period: e.target.value })} />
            <input className="input-field" type="number" min={1} max={5} value={appraisalForm.rating} onChange={(e) => setAppraisalForm({ ...appraisalForm, rating: Number(e.target.value) })} />
            <textarea className="input-field sm:col-span-2" placeholder="Feedback" value={appraisalForm.feedback} onChange={(e) => setAppraisalForm({ ...appraisalForm, feedback: e.target.value })} />
            <button type="submit" className="btn-primary sm:col-span-2">Add appraisal</button>
          </form>
          {appraisals.map((a) => (
            <div key={a.id} className="card mb-3"><p className="font-medium">{a.full_name} · {a.period}</p><p className="text-sm">Rating: {a.rating}</p><p className="text-sm text-slate-600">{a.feedback}</p></div>
          ))}
        </>
      )}

      {tab === 'promotions' && (
        <>
          <form className="card mb-6 grid sm:grid-cols-2 gap-3" onSubmit={async (e) => {
            e.preventDefault();
            await api.post('/admin/promotions', promoForm);
            setPromoForm({ employee_id: '', new_designation: '', effective_date: '', notes: '' });
            load();
          }}>
            <select className="input-field" required value={promoForm.employee_id} onChange={(e) => setPromoForm({ ...promoForm, employee_id: e.target.value })}>
              <option value="">Employee</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
            <input className="input-field" placeholder="New designation" required value={promoForm.new_designation} onChange={(e) => setPromoForm({ ...promoForm, new_designation: e.target.value })} />
            <input className="input-field" type="date" required value={promoForm.effective_date} onChange={(e) => setPromoForm({ ...promoForm, effective_date: e.target.value })} />
            <button type="submit" className="btn-primary sm:col-span-2">Record promotion</button>
          </form>
          {promotions.map((p) => (
            <div key={p.id} className="card mb-3"><p className="font-medium">{p.full_name}</p><p className="text-sm">{p.old_designation} → {p.new_designation}</p></div>
          ))}
        </>
      )}

      {tab === 'hikes' && (
        <form className="card max-w-md space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          await api.put(`/admin/employees/${hikeForm.employee_id}/salary`, { salary: Number(hikeForm.salary) });
          setHikeForm({ employee_id: '', salary: '' });
          alert('Salary hike applied');
          load();
        }}>
          <h3 className="font-semibold">Salary hike</h3>
          <select className="input-field" required value={hikeForm.employee_id} onChange={(e) => setHikeForm({ ...hikeForm, employee_id: e.target.value })}>
            <option value="">Employee</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name} (₹{emp.salary})</option>)}
          </select>
          <input className="input-field" type="number" placeholder="New salary ₹" required value={hikeForm.salary} onChange={(e) => setHikeForm({ ...hikeForm, salary: e.target.value })} />
          <button type="submit" className="btn-primary">Apply hike</button>
        </form>
      )}
    </div>
  );
}
