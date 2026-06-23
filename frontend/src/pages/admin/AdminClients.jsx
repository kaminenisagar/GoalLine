import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminClients() {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    api.get('/admin/clients').then((res) => setClients(res.data));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Clients</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Tracking ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-3 font-mono">{c.tracking_id}</td>
                <td>{c.full_name}</td>
                <td>{c.email}</td>
                <td>{c.company_name || '-'}</td>
                <td>{c.phone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
