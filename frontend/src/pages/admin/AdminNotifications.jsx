import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get('/admin/notifications').then((r) => setNotifications(r.data)).catch(console.error);
  }, []);

  const typeColor = (type) => {
    const map = {
      project: 'bg-blue-100 text-blue-700',
      enquiry: 'bg-purple-100 text-purple-700',
      complaint: 'bg-red-100 text-red-700',
      leave: 'bg-amber-100 text-amber-700',
      payroll: 'bg-green-100 text-green-700',
      domain: 'bg-teal-100 text-teal-700',
    };
    return map[type] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Notifications</h1>
      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className={`card ${!n.is_read ? 'border-brand-300 bg-brand-50/30' : ''}`}>
            <div className="flex flex-wrap justify-between gap-2 mb-1">
              <h3 className="font-medium">{n.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColor(n.type)}`}>
                {n.type}
              </span>
            </div>
            <p className="text-slate-600 text-sm">{n.message}</p>
            <p className="text-xs text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
          </div>
        ))}
        {!notifications.length && <p className="text-slate-500">No notifications.</p>}
      </div>
    </div>
  );
}
