import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Calendar, Clock, Video, Users, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', scheduled_at: '', duration_minutes: 60,
    meeting_link: '', attendee_ids: [],
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [m, e] = await Promise.all([api.get('/admin/meetings'), api.get('/admin/employees')]);
    setMeetings(m.data);
    setEmployees(e.data);
  };

  useEffect(() => { load(); }, []);

  const toggleAttendee = (id) => {
    setForm((f) => ({
      ...f,
      attendee_ids: f.attendee_ids.includes(id)
        ? f.attendee_ids.filter((a) => a !== id)
        : [...f.attendee_ids, id],
    }));
  };

  const schedule = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/admin/meetings', form);
      setSuccess('Meeting scheduled successfully! Attendees have been notified.');
      setForm({ title: '', description: '', scheduled_at: '', duration_minutes: 60, meeting_link: '', attendee_ids: [] });
      setShowForm(false);
      load();
    } catch (err) {
      const isConflict = err.response?.status === 409;
      setError(err.response?.data?.error || 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  const deleteMeeting = async (id) => {
    if (!window.confirm('Delete this meeting?')) return;
    await api.delete(`/admin/meetings/${id}`);
    load();
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const upcoming = meetings.filter((m) => new Date(m.scheduled_at) >= new Date());
  const past = meetings.filter((m) => new Date(m.scheduled_at) < new Date());

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-slate-500 text-sm mt-1">Schedule and manage team meetings</p>
        </div>
        <button type="button" onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Schedule Meeting
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={schedule} className="card mb-8 space-y-4">
          <h2 className="font-semibold text-lg">New Meeting</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <input className="input-field" placeholder="Meeting Title *" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="input-field" type="datetime-local" required value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            <input className="input-field" type="number" placeholder="Duration (minutes)" min={15} value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
            <input className="input-field" placeholder="Meeting Link (Zoom/Meet/Teams)" value={form.meeting_link}
              onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} />
            <textarea className="input-field sm:col-span-2" placeholder="Description (optional)" rows={2}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> Select Attendees (leave empty for all)
            </p>
            <div className="grid sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {employees.map((emp) => (
                <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1.5 rounded">
                  <input type="checkbox" checked={form.attendee_ids.includes(emp.user_id || emp.id)}
                    onChange={() => toggleAttendee(emp.user_id || emp.id)} className="rounded" />
                  <span className="truncate">{emp.full_name}</span>
                </label>
              ))}
            </div>
            {form.attendee_ids.length > 0 && (
              <p className="text-xs text-brand-600 mt-1">{form.attendee_ids.length} employee(s) selected</p>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {upcoming.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" /> Upcoming Meetings ({upcoming.length})
            </h2>
            <div className="space-y-3">
              {upcoming.map((m) => <MeetingCard key={m.id} meeting={m} employees={employees} onDelete={deleteMeeting} formatDate={formatDate} />)}
            </div>
          </div>
        )}
        {past.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-500 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Past Meetings ({past.length})
            </h2>
            <div className="space-y-3 opacity-70">
              {past.map((m) => <MeetingCard key={m.id} meeting={m} employees={employees} onDelete={deleteMeeting} formatDate={formatDate} isPast />)}
            </div>
          </div>
        )}
        {!meetings.length && (
          <div className="card text-center py-12 text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No meetings scheduled yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingCard({ meeting: m, employees, onDelete, formatDate, isPast }) {
  const attendees = (() => {
    try { return JSON.parse(m.attendee_ids || '[]'); } catch { return []; }
  })();
  return (
    <div className={`card flex flex-wrap justify-between gap-4 ${isPast ? 'border-slate-100' : 'border-brand-100'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-base">{m.title}</h3>
          {!isPast && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Upcoming</span>}
        </div>
        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
          <Calendar className="w-3.5 h-3.5" /> {formatDate(m.scheduled_at)}
        </p>
        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
          <Clock className="w-3.5 h-3.5" /> {m.duration_minutes} minutes
        </p>
        {m.description && <p className="text-sm text-slate-600 mt-2">{m.description}</p>}
        {attendees.length > 0 && (
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> {attendees.length} attendee(s)
          </p>
        )}
        {attendees.length === 0 && (
          <p className="text-xs text-slate-400 mt-2">All employees</p>
        )}
      </div>
      <div className="flex flex-col gap-2 items-end shrink-0">
        {m.meeting_link && (
          <a href={m.meeting_link} target="_blank" rel="noreferrer"
            className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5" /> Join
          </a>
        )}
        <button type="button" onClick={() => onDelete(m.id)}
          className="text-red-400 hover:text-red-600 text-sm flex items-center gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}
