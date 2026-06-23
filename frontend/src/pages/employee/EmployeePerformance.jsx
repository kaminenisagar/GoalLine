import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function EmployeePerformance() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/employee/performance').then((r) => setData(r.data)).catch(console.error);
  }, []);

  if (!data) return <div>Loading performance...</div>;

  const { tasks, latest_appraisal, attendance_last_30_days, company } = data;
  const completionRate = tasks?.total
    ? Math.round((tasks.completed / tasks.total) * 100)
    : 0;
  const attendanceRate = attendance_last_30_days?.days
    ? Math.round((attendance_last_30_days.present_days / attendance_last_30_days.days) * 100)
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Performance</h1>
      <p className="text-slate-500 mb-8">{company || 'GoalLine'} — your work metrics</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-2xl font-bold text-brand-600">{tasks?.total ?? 0}</p>
          <p className="text-sm text-slate-500">Total Assignments</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-green-600">{tasks?.completed ?? 0}</p>
          <p className="text-sm text-slate-500">Completed</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-brand-600">{completionRate}%</p>
          <p className="text-sm text-slate-500">Completion Rate</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-brand-600">
            {tasks?.avg_progress != null ? Math.round(tasks.avg_progress) : 0}%
          </p>
          <p className="text-sm text-slate-500">Avg Progress</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Attendance (Last 30 Days)</h2>
          <p className="text-3xl font-bold text-brand-600">{attendanceRate}%</p>
          <p className="text-sm text-slate-500 mt-1">
            {attendance_last_30_days?.present_days ?? 0} present of {attendance_last_30_days?.days ?? 0} days
          </p>
          <div className="h-3 bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-brand-600 rounded-full" style={{ width: `${attendanceRate}%` }} />
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Latest Appraisal</h2>
          {latest_appraisal ? (
            <>
              <p className="text-2xl font-bold text-brand-600">{latest_appraisal.rating}/5</p>
              <p className="text-sm text-slate-500 mt-1">{latest_appraisal.period}</p>
              {latest_appraisal.feedback && (
                <p className="text-slate-600 text-sm mt-3">{latest_appraisal.feedback}</p>
              )}
            </>
          ) : (
            <p className="text-slate-500">No appraisal on record yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
