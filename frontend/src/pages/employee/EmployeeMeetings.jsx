import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Calendar, Clock, Video, AlertCircle } from 'lucide-react';

export default function EmployeeMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/employee/meetings')
      .then((res) => setMeetings(res.data))
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const isToday = (d) => new Date(d).toDateString() === new Date().toDateString();
  const isSoon = (d) => {
    const diff = new Date(d) - new Date();
    return diff > 0 && diff < 60 * 60 * 1000; // within 1 hour
  };

  if (loading) return <div className="p-8 text-slate-500">Loading meetings...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Meetings</h1>
        <p className="text-slate-500 text-sm mt-1">Upcoming meetings scheduled for you</p>
      </div>

      {meetings.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No upcoming meetings</p>
          <p className="text-sm mt-1">Your admin will schedule meetings and notify you</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((m) => (
            <div key={m.id} className={`card border-l-4 ${isToday(m.scheduled_at) ? 'border-l-brand-500 bg-brand-50/30' : 'border-l-slate-200'}`}>
              <div className="flex flex-wrap justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{m.title}</h3>
                    {isToday(m.scheduled_at) && (
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">Today</span>
                    )}
                    {isSoon(m.scheduled_at) && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Starting soon
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatDate(m.scheduled_at)}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Duration: {m.duration_minutes || 60} minutes
                    </p>
                  </div>
                  {m.description && (
                    <p className="text-sm text-slate-600 mt-3 p-3 bg-slate-50 rounded-lg">{m.description}</p>
                  )}
                </div>
                {m.meeting_link && (
                  <div className="shrink-0">
                    <a href={m.meeting_link} target="_blank" rel="noreferrer"
                      className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
                      <Video className="w-4 h-4" /> Join Meeting
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
