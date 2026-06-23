import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function EmployeeAppraisals() {
  const [appraisals, setAppraisals] = useState([]);

  useEffect(() => {
    api.get('/employee/appraisals').then((r) => setAppraisals(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Appraisals</h1>
      <div className="space-y-4">
        {appraisals.map((a) => (
          <div key={a.id} className="card">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <p className="font-semibold">{a.period || 'Appraisal'}</p>
              {a.rating != null && (
                <span className="text-brand-600 font-bold text-lg">{a.rating}/5</span>
              )}
            </div>
            {a.feedback && <p className="text-slate-600 text-sm">{a.feedback}</p>}
            {a.recommendations && (
              <p className="text-sm text-slate-500 mt-2"><strong>Recommendations:</strong> {a.recommendations}</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              {a.created_at && new Date(a.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        {!appraisals.length && <p className="text-slate-500">No appraisals recorded yet.</p>}
      </div>
    </div>
  );
}
