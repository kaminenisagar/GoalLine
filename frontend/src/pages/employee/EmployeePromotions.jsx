import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function EmployeePromotions() {
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    api.get('/employee/promotions').then((r) => setPromotions(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Promotions</h1>
      <div className="space-y-4">
        {promotions.map((p) => (
          <div key={p.id} className="card">
            <div className="flex flex-wrap gap-4 mb-2">
              {p.previous_designation && (
                <span className="text-slate-500">{p.previous_designation}</span>
              )}
              {p.previous_designation && p.new_designation && (
                <span className="text-brand-600">→</span>
              )}
              <span className="font-semibold text-brand-700">{p.new_designation}</span>
            </div>
            {p.previous_salary != null && p.new_salary != null && (
              <p className="text-sm text-slate-600">
                Salary: ${p.previous_salary} → <strong>${p.new_salary}</strong>
              </p>
            )}
            {p.effective_date && (
              <p className="text-sm text-slate-500 mt-1">Effective: {p.effective_date}</p>
            )}
            {p.notes && <p className="text-sm text-slate-600 mt-2">{p.notes}</p>}
            <p className="text-xs text-slate-400 mt-2">
              {p.created_at && new Date(p.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        {!promotions.length && <p className="text-slate-500">No promotion history yet.</p>}
      </div>
    </div>
  );
}
