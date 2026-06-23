import { useEffect, useState } from 'react';
import http from '../../api/index';
import { RefreshCw, TrendingUp, Activity } from 'lucide-react';

const STATUS_COLORS = {
  enquiry_received: '#f59e0b', project_started: '#3b82f6',
  development_in_progress: '#6366f1', testing_phase: '#a855f7',
  changes_requested: '#ef4444', domain_connected: '#06b6d4',
  project_completed: '#22c55e', final_delivery: '#10b981',
  on_hold: '#f97316', cancelled: '#94a3b8',
};

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeeReports, setEmployeeReports] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [rep, proj] = await Promise.all([
        http.get('/admin/reports'),
        http.get('/admin/projects'),
      ]);
      setData(rep.data);
      // Gather employee reports from project assignments
      const assignments = await http.get('/admin/projects').then((r) => r.data);
      setEmployeeReports(assignments.filter((p) => p.assigned_employee));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
      <Activity className="w-6 h-6 animate-spin" /> Loading reports…
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center gap-3 h-64 justify-center">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={load} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );
  if (!data) return null;

  const { summary, projects_by_status = [], monthly_revenue = [] } = data;
  const maxRevenue = Math.max(...monthly_revenue.map((m) => parseFloat(m.revenue) || 0), 1);
  const totalProjects = projects_by_status.reduce((s, x) => s + Number(x.count), 0) || 1;

  const statCards = [
    { label: 'Completed Projects', value: summary.completed_projects, color: 'text-green-600 bg-green-50' },
    { label: 'Active Projects', value: summary.active_projects, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Invoiced', value: `₹${Number(summary.total_invoiced).toLocaleString('en-IN')}`, color: 'text-purple-600 bg-purple-50' },
    { label: 'Total Collected', value: `₹${Number(summary.total_collected).toLocaleString('en-IN')}`, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Employees', value: summary.total_employees, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Total Clients', value: summary.total_clients, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Pending Enquiries', value: summary.pending_enquiries, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-slate-500 text-sm">Business performance overview</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className={`text-xl sm:text-2xl font-bold ${color.split(' ')[0]}`}>{value}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Projects by status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Projects by Status</h2>
          <div className="space-y-3">
            {projects_by_status.map(({ status, count }) => {
              const pct = Math.round((count / totalProjects) * 100);
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="capitalize text-slate-700">{(status || '').replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{count}</span>
                      <span className="text-xs text-slate-400">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: STATUS_COLORS[status] || '#94a3b8' }}
                    />
                  </div>
                </div>
              );
            })}
            {!projects_by_status.length && <p className="text-slate-400 text-sm py-4 text-center">No project data.</p>}
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" /> Monthly Revenue
          </h2>
          <div className="space-y-3">
            {monthly_revenue.map((m) => {
              const rev = parseFloat(m.revenue) || 0;
              const pct = (rev / maxRevenue) * 100;
              return (
                <div key={`${m.year}-${m.month}`}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-700">{m.month}/{m.year}</span>
                    <span className="font-semibold text-green-600">₹{rev.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!monthly_revenue.length && <p className="text-slate-400 text-sm py-4 text-center">No payment data yet.</p>}
          </div>
        </div>
      </div>

      {/* Employee Reports with Status */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Employee Project Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">Projects with assigned employees and their statuses</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide border-b">
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4 hidden sm:table-cell">Client</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 hidden md:table-cell">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {employeeReports.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800 max-w-[150px] truncate">{p.title}</td>
                  <td className="px-4 text-slate-500 hidden sm:table-cell">{p.client_name}</td>
                  <td className="px-4 text-slate-700">{p.assigned_employee || '—'}</td>
                  <td className="px-4">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{
                        background: STATUS_COLORS[p.status] ? STATUS_COLORS[p.status] + '22' : '#f1f5f9',
                        color: STATUS_COLORS[p.status] || '#64748b',
                      }}
                    >
                      {(p.status || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 text-slate-500 hidden md:table-cell text-xs">
                    {p.deadline ? new Date(p.deadline).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
              {!employeeReports.length && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-sm">No employee reports available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}