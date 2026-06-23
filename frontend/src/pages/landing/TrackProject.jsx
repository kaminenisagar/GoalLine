import { useState } from 'react';
import { Link } from 'react-router-dom';
import http from '../../api/index';

const STAGES = {
  enquiry_received: 'Enquiry Received', project_started: 'Project Started',
  development_in_progress: 'Development In Progress', testing_phase: 'Testing Phase',
  changes_requested: 'Changes Requested', domain_connected: 'Domain Connected',
  project_completed: 'Project Completed', final_delivery: 'Final Delivery',
  on_hold: 'On Hold', cancelled: 'Cancelled',
};

export default function TrackProject() {
  const [identifier, setIdentifier] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async e => {
    e.preventDefault();
    setLoading(true); setError(''); setData(null);
    try {
      const r = await http.get(`/public/track/${encodeURIComponent(identifier.trim())}`);
      setData(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Project not found');
    } finally { setLoading(false); }
  };

  const projects = Array.isArray(data) ? data : data ? [data] : [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Roboto,sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ fontWeight: 800, fontSize: '1.3rem', color: '#db2777', textDecoration: 'none' }}>Goal<span style={{ color: '#0f172a' }}>Line</span></Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/client/login" style={{ padding: '0.45rem 1rem', borderRadius: 8, border: '1.5px solid #db2777', color: '#db2777', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>Client Login</Link>
          <Link to="/" style={{ padding: '0.45rem 1rem', borderRadius: 8, background: '#f1f5f9', color: '#374151', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>← Home</Link>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '3rem auto', padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>Track Your Project</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Enter your Tracking ID (GLXXXXXXXX) or registered email</p>
        </div>

        <form onSubmit={handleTrack} style={{ background: 'white', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '2rem', display: 'flex', gap: '0.75rem' }}>
          <input
            style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.9rem', fontFamily: 'Roboto,sans-serif', outline: 'none', background: '#f8fafc' }}
            placeholder="GLXXXXXXXX or email@example.com"
            required value={identifier} onChange={e => setIdentifier(e.target.value)}
          />
          <button type="submit" disabled={loading} style={{ background: '#db2777', color: 'white', border: 'none', borderRadius: 10, padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Roboto,sans-serif', whiteSpace: 'nowrap' }}>
            {loading ? 'Searching…' : 'Track'}
          </button>
        </form>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem', color: '#dc2626', textAlign: 'center', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {projects.map(project => (
          <div key={project.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{project.title}</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>ID: {project.tracking_id}</p>
                {project.deadline && <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Deadline: {new Date(project.deadline).toLocaleDateString()}</p>}
              </div>
              <div style={{ background: '#fdf2f8', color: '#db2777', padding: '0.35rem 1rem', borderRadius: 999, fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize' }}>
                {STAGES[project.status] || project.status}
              </div>
            </div>

            {project.domain_name && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#1d4ed8' }}>
                  🌐 Live site: <a href={`https://${project.domain_name.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 600 }}>{project.domain_name}</a>
                </p>
              </div>
            )}

            {/* Timeline */}
            {(project.tracking_log || []).length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', margin: '0 0 1rem' }}>Progress Timeline</p>
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: '#e2e8f0' }} />
                  {(project.tracking_log || []).map((log, i) => (
                    <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12, position: 'relative' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: i === project.tracking_log.length - 1 ? '#db2777' : '#cbd5e1', border: '2px solid white', position: 'absolute', left: -20, top: 2, flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: '0 0 0.15rem', fontWeight: 600, fontSize: '0.85rem', color: '#374151', textTransform: 'capitalize' }}>{STAGES[log.stage] || log.stage}</p>
                        {log.message && <p style={{ margin: '0 0 0.15rem', fontSize: '0.8rem', color: '#64748b' }}>{log.message}</p>}
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoices */}
            {(project.invoices || []).length > 0 && (
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', margin: '0 0 0.75rem' }}>Invoices</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        {['Invoice #', 'Amount', 'Due Date', 'Status'].map(h => (
                          <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {project.invoices.map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem', color: '#374151' }}>{inv.invoice_number}</td>
                          <td style={{ padding: '0.75rem', color: '#374151' }}>₹{Number(inv.amount).toLocaleString()}</td>
                          <td style={{ padding: '0.75rem', color: '#374151' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ background: inv.status === 'paid' ? '#f0fdf4' : inv.status === 'overdue' ? '#fef2f2' : '#fff7ed', color: inv.status === 'paid' ? '#16a34a' : inv.status === 'overdue' ? '#dc2626' : '#d97706', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{inv.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}