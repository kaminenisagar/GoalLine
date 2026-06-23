import { useEffect, useMemo, useState } from 'react';
import { Calendar, LogIn, LogOut, Clock, Search, Timer, Users } from 'lucide-react';
import api from '../../services/api';

const STATUS_COLOR = {
  present:    'bg-green-100 text-green-700',
  absent:     'bg-red-100 text-red-700',
  half_day:   'bg-yellow-100 text-yellow-700',
  leave:      'bg-blue-100 text-blue-700',
  early_leave:'bg-orange-100 text-orange-700',
};

const Rupee = ({ className }) => <span className={className}>₹</span>;

export default function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAttendance = async (selectedDate) => {
    setLoading(true);
    try {
      const query = selectedDate ? `?date=${selectedDate}` : '';
      const res = await api.get(`/admin/attendance${query}`);
      setRecords(res.data);
    } catch (err) {
      console.error(err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAttendance(date); }, [date]);

  const filteredRecords = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      return (r.full_name || '').toLowerCase().includes(q)
        || (r.employee_code || '').toLowerCase().includes(q)
        || (r.status || '').toLowerCase().includes(q);
    });
  }, [records, filter]);

  const summary = useMemo(() => {
    const present = filteredRecords.filter((r) => r.status === 'present').length;
    const absent = filteredRecords.filter((r) => r.status === 'absent').length;
    const totalHours = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.total_hours) || 0), 0);
    const overtimeHours = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0);
    const overtimePay = filteredRecords.reduce((sum, r) => sum + (parseFloat(r.overtime_pay) || 0), 0);
    const underHours = filteredRecords.filter((r) => r.total_hours != null && parseFloat(r.total_hours) < 8).length;
    return {
      present,
      absent,
      totalHours: totalHours.toFixed(1),
      overtimeHours: overtimeHours.toFixed(1),
      overtimePay: overtimePay.toFixed(2),
      underHours,
    };
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Attendance</h1>
          <p className="text-slate-500 text-sm mt-1">Daily target is 8 hours and weekly target is 40 hours.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 items-end">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">Search employee</span>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Name, code or status"
                className="input-field pl-10"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Present', value: summary.present, icon: Users, color: 'text-green-600' },
          { label: 'Absent', value: summary.absent, icon: Clock, color: 'text-red-500' },
          { label: 'Total Hours', value: summary.totalHours, icon: Timer, color: 'text-blue-600' },
          { label: 'Overtime', value: summary.overtimeHours, icon: LogOut, color: 'text-amber-600' },
          { label: 'Overtime Pay', value: `₹${summary.overtimePay}`, icon: Rupee, color: 'text-emerald-600' },
          { label: 'Under 8h', value: summary.underHours, icon: LogIn, color: 'text-slate-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card text-center py-4">
            <div className={`flex items-center justify-center gap-2 text-3xl font-bold ${color}`}>
              <Icon className="w-5 h-5" />
              {value}
            </div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-4 flex items-center gap-2 text-slate-700"><Calendar className="w-4 h-4" /> Attendance details</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase border-b">
              {['Date','Employee','Code','Check In','Check Out','Hours','Overtime','OT Pay','Status'].map((header) => (
                <th key={header} className="pb-2 pr-4 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={`${record.id}-${record.date}`} className="border-b hover:bg-slate-50">
                <td className="py-3 pr-4 font-medium">
                  {new Date(record.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                </td>
                <td className="pr-4 font-medium">{record.full_name || 'Unknown'}</td>
                <td className="pr-4 text-slate-500">{record.employee_code || '—'}</td>
                <td className="pr-4 font-mono text-green-700">{record.check_in || <span className="text-slate-300">—</span>}</td>
                <td className="pr-4 font-mono text-red-600">{record.check_out || <span className="text-slate-300">—</span>}</td>
                <td className="pr-4 font-mono text-blue-600">{record.total_hours != null ? `${record.total_hours}h` : <span className="text-slate-300">—</span>}</td>
                <td className="pr-4 font-mono text-amber-600">{record.overtime_hours ? `${record.overtime_hours}h` : <span className="text-slate-300">—</span>}</td>
                <td className="pr-4 font-mono text-emerald-600">{record.overtime_pay != null ? `₹${record.overtime_pay.toFixed(2)}` : <span className="text-slate-300">—</span>}</td>
                <td>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[record.status] || 'bg-slate-100 text-slate-600'}`}>
                    {record.status?.replace('_', ' ') || 'Unknown'}
                  </span>
                </td>
              </tr>
            ))}
            {!filteredRecords.length && (
              <tr><td colSpan={9} className="py-10 text-center text-slate-400">No records found for this date or filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="text-sm text-slate-500">Loading attendance records…</div>}
    </div>
  );
}
