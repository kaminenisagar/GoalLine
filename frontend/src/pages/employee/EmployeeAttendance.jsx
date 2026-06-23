import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Clock, LogIn, LogOut, Calendar, CheckCircle, XCircle, AlertCircle, Timer } from 'lucide-react';

const STATUS_COLOR = {
  present:    'bg-green-100 text-green-700',
  absent:     'bg-red-100 text-red-700',
  half_day:   'bg-yellow-100 text-yellow-700',
  leave:      'bg-blue-100 text-blue-700',
  early_leave:'bg-orange-100 text-orange-700',
};

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className="text-center select-none">
      <div className="text-5xl font-mono font-bold tracking-widest text-white drop-shadow">
        {t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </div>
      <div className="text-sm text-blue-200 mt-1">
        {t.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

export default function EmployeeAttendance() {
  const [records, setRecords]   = useState([]);
  const [todayRec, setTodayRec] = useState(null);
  const [msg, setMsg]           = useState({ text: '', ok: true });
  const [busy, setBusy]         = useState({ in: false, out: false });

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 5000); };

  const loadToday = useCallback(async () => {
    try { const r = await api.get('/employee/attendance/today'); setTodayRec(r.data); }
    catch { setTodayRec(null); }
  }, []);

  const loadAll = useCallback(async () => {
    try { const r = await api.get('/employee/attendance'); setRecords(r.data); }
    catch { setRecords([]); }
  }, []);

  useEffect(() => { loadToday(); loadAll(); }, [loadToday, loadAll]);

  const punchIn = async () => {
    setBusy(b => ({ ...b, in: true }));
    try {
      const r = await api.post('/employee/attendance/check-in');
      flash(`✅ Punched IN at ${r.data.time}`);
      await loadToday(); await loadAll();
    } catch (e) { flash(e.response?.data?.error || 'Punch-in failed', false); }
    finally { setBusy(b => ({ ...b, in: false })); }
  };

  const punchOut = async () => {
    setBusy(b => ({ ...b, out: true }));
    try {
      const r = await api.post('/employee/attendance/check-out');
      const totalHours = r.data.total_hours ?? r.data.hours_worked ?? '0.00';
      flash(`✅ Punched OUT at ${r.data.time}  •  Total: ${totalHours}h`);
      await loadToday(); await loadAll();
    } catch (e) { flash(e.response?.data?.error || 'Punch-out failed', false); }
    finally { setBusy(b => ({ ...b, out: false })); }
  };

  const checkedIn  = !!todayRec?.check_in;
  const checkedOut = !!todayRec?.check_out;
  const canIn      = !checkedIn;
  const canOut     = checkedIn && !checkedOut;

  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const hours   = records.reduce((s, r) => s + (parseFloat(r.total_hours) || 0), 0).toFixed(1);
  const overtimeDays = records.filter(r => parseFloat(r.overtime_hours) > 0).length;
  const overtimeHours = records.reduce((s, r) => s + (parseFloat(r.overtime_hours) || 0), 0).toFixed(1);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-slate-500 text-sm mt-0.5">Punch in &amp; punch out every working day</p>
      </div>

      {/* Punch Card */}
      <div className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900">
        <div className="p-8 flex flex-col md:flex-row items-center gap-8">
          {/* Clock */}
          <div className="flex-1 flex justify-center"><LiveClock /></div>

          <div className="w-px bg-white/20 self-stretch hidden md:block" />

          {/* Controls */}
          <div className="flex-1 flex flex-col items-center gap-4">
            {/* Status pill */}
            <div className={`text-xs font-bold px-4 py-1 rounded-full tracking-wider ${
              checkedOut ? 'bg-green-400/20 text-green-300 border border-green-400/40'
              : checkedIn ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 animate-pulse'
              : 'bg-white/10 text-white/50 border border-white/10'
            }`}>
              {checkedOut ? '✔ SHIFT COMPLETE' : checkedIn ? '● CURRENTLY WORKING' : '○ NOT PUNCHED IN'}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={punchIn} disabled={!canIn || busy.in}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  canIn ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/30'
                        : 'bg-white/10 text-white/25 cursor-not-allowed'
                }`}>
                <LogIn className="w-4 h-4" />{busy.in ? 'Punching…' : 'Punch In'}
              </button>
              <button onClick={punchOut} disabled={!canOut || busy.out}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  canOut ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30'
                         : 'bg-white/10 text-white/25 cursor-not-allowed'
                }`}>
                <LogOut className="w-4 h-4" />{busy.out ? 'Punching…' : 'Punch Out'}
              </button>
            </div>

            {/* Today's times */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'In',       val: todayRec?.check_in,    color: 'text-green-300' },
                { label: 'Out',      val: todayRec?.check_out,   color: 'text-red-300'   },
                { label: 'Hours',    val: todayRec?.total_hours ? `${todayRec.total_hours}h` : null, color: 'text-blue-200' },
                { label: 'Overtime', val: todayRec?.overtime_hours ? `${todayRec.overtime_hours}h` : '0.00h', color: 'text-amber-200' },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <div className="text-white/40 text-xs uppercase tracking-wider">{label}</div>
                  <div className={`font-mono font-semibold text-sm mt-0.5 ${color}`}>{val || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {msg.text && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present Days', val: present, color: 'text-green-600' },
          { label: 'Absent Days',  val: absent,  color: 'text-red-500'   },
          { label: 'Total Hours',  val: hours,   color: 'text-blue-600'  },
          { label: 'Overtime Days', val: overtimeDays, color: 'text-amber-600' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card text-center py-4">
            <div className={`text-3xl font-bold ${color}`}>{val}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-4 flex items-center gap-2 text-slate-700">
          <Calendar className="w-4 h-4" /> Attendance History (last 60 days)
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase border-b">
              {['Date','Punch In','Punch Out','Hours','Overtime','Status'].map(h => (
                <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b hover:bg-slate-50">
                <td className="py-3 pr-4 font-medium">
                  {new Date(r.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                </td>
                <td className="pr-4 font-mono text-green-700">{r.check_in  || <span className="text-slate-300">—</span>}</td>
                <td className="pr-4 font-mono text-red-600">  {r.check_out || <span className="text-slate-300">—</span>}</td>
                <td className="pr-4 font-mono text-blue-600">{r.total_hours ? `${r.total_hours}h` : <span className="text-slate-300">—</span>}</td>
                <td className="pr-4 font-mono text-amber-600">{r.overtime_hours ? `${r.overtime_hours}h` : <span className="text-slate-300">—</span>}</td>
                <td>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[r.status] || 'bg-slate-100 text-slate-600'}`}>
                    {r.status?.replace('_',' ')}
                  </span>
                </td>
              </tr>
            ))}
            {!records.length && (
              <tr><td colSpan={5} className="py-10 text-center text-slate-400">No records yet. Start punching in!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
