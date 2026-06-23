import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import http from '../../api/index';
import { ClipboardList, CheckCircle, Video, CalendarCheck, Clock, Activity, RefreshCw } from 'lucide-react';

const STATUS_COLOR = {
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  submitted: 'bg-amber-100 text-amber-700',
  revision: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 flex items-center gap-4 shadow-sm border border-slate-100">
      <div className={`${color} p-3 rounded-xl text-white shrink-0`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-slate-800">{value ?? '—'}</p>
        <p className="text-xs sm:text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    http.get('/employee/dashboard')
      .then((r) => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <Activity className="w-7 h-7 animate-spin text-brand-500" />
      <p className="text-sm">Loading dashboard…</p>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-slate-500 text-sm">Failed to load dashboard.</p>
      <button onClick={load} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );

  const { stats, assignments = [], upcoming_meetings = [], progress_chart = [] } = data;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">My Dashboard</h1>
          <p className="text-slate-500 text-sm">Your work at a glance</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={ClipboardList} label="Active Tasks" value={stats.active_tasks} color="bg-brand-600" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed_tasks} color="bg-green-500" />
        <StatCard icon={CalendarCheck} label="Leaves Approved" value={stats.approved_leaves} color="bg-amber-500" />
        <StatCard icon={Clock} label="Days Present (Month)" value={stats.present_days_this_month} color="bg-indigo-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Assignments */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-800">Recent Assignments</h2>
            <Link to="/employee/projects" className="text-brand-600 text-xs sm:text-sm hover:underline">View all</Link>
          </div>
          {assignments.length ? assignments.map((a) => (
            <div key={a.id} className="border-b border-slate-100 py-3 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-800 text-sm leading-snug">{a.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${STATUS_COLOR[a.status] || 'bg-slate-100 text-slate-600'}`}>
                  {(a.status || '').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                <span>{a.progress_percent}% complete</span>
                {a.deadline && <span>Due: {new Date(a.deadline).toLocaleDateString('en-IN')}</span>}
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-500"
                  style={{ width: `${a.progress_percent || 0}%` }}
                />
              </div>
            </div>
          )) : (
            <p className="text-slate-400 text-sm py-4 text-center">No assignments yet.</p>
          )}
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Video className="w-4 h-4 text-brand-600" /> Upcoming Meetings
          </h2>
          {upcoming_meetings.length ? upcoming_meetings.map((m) => (
            <div key={m.id} className="border-b border-slate-100 py-3 last:border-0">
              <p className="font-medium text-slate-800 text-sm">{m.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(m.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              {m.meeting_link && (
                <a href={m.meeting_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline mt-1 inline-block">
                  Join meeting →
                </a>
              )}
            </div>
          )) : (
            <p className="text-slate-400 text-sm py-4 text-center">No upcoming meetings.</p>
          )}
        </div>

        {/* Progress chart */}
        {progress_chart.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Task Progress Overview</h2>
            <div className="space-y-3">
              {progress_chart.map(({ status, count }) => (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-slate-700">{(status || '').replace(/_/g, ' ')}</span>
                    <span className="font-medium text-slate-600">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((count / (progress_chart.reduce((s, x) => s + x.count, 0) || 1)) * 100)}%`,
                        background: STATUS_COLOR[status]?.includes('blue') ? '#3b82f6' :
                          STATUS_COLOR[status]?.includes('green') ? '#22c55e' :
                          STATUS_COLOR[status]?.includes('amber') ? '#f59e0b' :
                          STATUS_COLOR[status]?.includes('red') ? '#ef4444' : '#f45b8c',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}