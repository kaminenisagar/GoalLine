import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const STATUS_META = {
  enquiry_received:        { label: 'Enquiry',       bg: '#fff7ed', color: '#9a3412' },
  project_started:         { label: 'Started',        bg: '#eff6ff', color: '#1e40af' },
  development_in_progress: { label: 'In progress',    bg: '#eef2ff', color: '#4338ca' },
  testing_phase:           { label: 'Testing',        bg: '#faf5ff', color: '#7e22ce' },
  changes_requested:       { label: 'Changes req.',   bg: '#fef2f2', color: '#991b1b' },
  domain_connected:        { label: 'Domain live',    bg: '#ecfeff', color: '#155e75' },
  project_completed:       { label: 'Completed',      bg: '#f0fdf4', color: '#166534' },
  final_delivery:          { label: 'Final delivery', bg: '#ecfdf5', color: '#065f46' },
  on_hold:                 { label: 'On hold',        bg: '#fff7ed', color: '#9a3412' },
  cancelled:               { label: 'Cancelled',      bg: '#f8fafc', color: '#475569' },
};

const CHART_COLORS = {
  enquiry_received: '#f59e0b', project_started: '#3b82f6',
  development_in_progress: '#6366f1', testing_phase: '#a855f7',
  changes_requested: '#ef4444', domain_connected: '#06b6d4',
  project_completed: '#22c55e', final_delivery: '#10b981',
  on_hold: '#f97316', cancelled: '#94a3b8',
};

const CARD_THEMES = {
  blue:   { bg: '#dbeafe', iconColor: '#1d4ed8', textColor: '#1e3a6e' },
  green:  { bg: '#dcfce7', iconColor: '#16a34a', textColor: '#14532d' },
  purple: { bg: '#ede9fe', iconColor: '#7c3aed', textColor: '#3b0764' },
  pink:   { bg: '#fce7f3', iconColor: '#db2777', textColor: '#831843' },
  teal:   { bg: '#ccfbf1', iconColor: '#0f766e', textColor: '#134e4a' },
  red:    { bg: '#fee2e2', iconColor: '#dc2626', textColor: '#7f1d1d' },
  amber:  { bg: '#ffedd5', iconColor: '#ea580c', textColor: '#7c2d12' },
};

function MetricCard({ icon, label, value, theme = 'blue', onClick }) {
  const t = CARD_THEMES[theme];
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: t.bg,
        borderRadius: 14,
        padding: '18px 18px 14px',
        cursor: onClick ? 'pointer' : 'default',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'transform .15s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: -28, right: -28,
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(255,255,255,.35)',
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,255,255,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 12, color: t.iconColor,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: t.textColor, lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 12, color: t.textColor, marginTop: 5, fontWeight: 500, opacity: 0.72 }}>
        {label}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: (status || '').replace(/_/g, ' '), bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 600,
      padding: '2px 9px', borderRadius: 20,
      background: m.bg, color: m.color, whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: '#64748b', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: 14,
      padding: '1rem 1.25rem',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Modal data ──────────────────────────────────────── */
const MODAL_DATA = {
  projects: {
    iconBg: '#dbeafe', iconColor: '#1d4ed8', icon: '📁',
    title: 'Total projects', sub: 'All project activity overview',
    stats: [
      { val: null, key: 'projects',           label: 'Total',          bg: '#dbeafe', color: '#1e3a6e' },
      { val: null, key: 'active_projects',    label: 'Active',         bg: '#ede9fe', color: '#3b0764' },
      { val: null, key: 'completed_projects', label: 'Completed',      bg: '#dcfce7', color: '#14532d' },
      { val: null, key: 'pending_leaves',     label: 'Pending leaves', bg: '#ffedd5', color: '#7c2d12' },
    ],
    bars: [
      { label: 'Completed',   pct: 47, color: '#22c55e' },
      { label: 'In progress', pct: 26, color: '#6366f1' },
      { label: 'Testing',     pct: 11, color: '#a855f7' },
      { label: 'On hold',     pct: 9,  color: '#f97316' },
    ],
    btnLabel: 'View all projects', btnTo: '/admin/projects',
  },
  employees: {
    iconBg: '#dcfce7', iconColor: '#16a34a', icon: '👥',
    title: 'Employees', sub: 'Workforce summary',
    stats: [
      { val: null, key: 'employees', label: 'Total',        bg: '#dcfce7', color: '#14532d' },
      { val: '14',  label: 'Active today', bg: '#dbeafe', color: '#1e3a6e' },
      { val: '2',   label: 'On leave',     bg: '#fce7f3', color: '#831843' },
      { val: '3.8h',label: 'Avg OT',       bg: '#ffedd5', color: '#7c2d12' },
    ],
    bars: [
      { label: 'Developers', pct: 55, color: '#3b82f6' },
      { label: 'Designers',  pct: 22, color: '#8b5cf6' },
      { label: 'QA / Test',  pct: 17, color: '#10b981' },
      { label: 'Management', pct: 6,  color: '#f59e0b' },
    ],
    btnLabel: 'View employees', btnTo: '/admin/employees',
  },
  clients: {
    iconBg: '#ede9fe', iconColor: '#7c3aed', icon: '🏢',
    title: 'Clients', sub: 'Client portfolio overview',
    stats: [
      { val: null, key: 'clients', label: 'Total',        bg: '#ede9fe', color: '#3b0764' },
      { val: '24', label: 'Active',         bg: '#dcfce7', color: '#14532d' },
      { val: '5',  label: 'New this month', bg: '#dbeafe', color: '#1e3a6e' },
      { val: '2',  label: 'Inactive',       bg: '#f1f5f9', color: '#475569' },
    ],
    bars: [
      { label: 'Retention rate',  pct: 92, color: '#7c3aed' },
      { label: 'Satisfaction',    pct: 88, color: '#3b82f6' },
      { label: 'Active projects', pct: 77, color: '#22c55e' },
      { label: 'Renewals',        pct: 65, color: '#f59e0b' },
    ],
    btnLabel: 'View clients', btnTo: '/admin/clients',
  },
  payroll: {
    iconBg: '#fce7f3', iconColor: '#db2777', icon: '₹',
    title: 'Payroll this month', sub: 'Monthly payroll summary',
    stats: [
      { val: null, key: 'payroll_this_month', label: 'Total payout',   bg: '#fce7f3', color: '#831843' },
      { val: null, key: 'employees',          label: 'Employees paid', bg: '#dcfce7', color: '#14532d' },
      { val: '₹23K',  label: 'OT added',    bg: '#dbeafe', color: '#1e3a6e' },
      { val: '₹2.3K', label: 'Deductions',  bg: '#f1f5f9', color: '#475569' },
    ],
    bars: [
      { label: 'Salaries',   pct: 82, color: '#db2777' },
      { label: 'Overtime',   pct: 11, color: '#f97316' },
      { label: 'Bonuses',    pct: 5,  color: '#22c55e' },
      { label: 'Deductions', pct: 2,  color: '#94a3b8' },
    ],
    btnLabel: 'Manage payroll', btnTo: '/admin/payroll',
  },
  present: {
    iconBg: '#ccfbf1', iconColor: '#0f766e', icon: '✅',
    title: 'Present today', sub: 'Live attendance status',
    stats: [
      { val: null, key: '_present', label: 'Present',       bg: '#dcfce7', color: '#14532d' },
      { val: null, key: '_absent',  label: 'Absent',        bg: '#fee2e2', color: '#7f1d1d' },
      { val: '2',  label: 'Late arrivals', bg: '#dbeafe', color: '#1e3a6e' },
      { val: '1',  label: 'WFH',           bg: '#ede9fe', color: '#3b0764' },
    ],
    bars: [
      { label: 'On time',        pct: 78, color: '#22c55e' },
      { label: 'Late (<30 min)', pct: 14, color: '#f59e0b' },
      { label: 'WFH',            pct: 7,  color: '#6366f1' },
      { label: 'Half day',       pct: 1,  color: '#94a3b8' },
    ],
    btnLabel: 'View attendance', btnTo: '/admin/attendance',
  },
  absent: {
    iconBg: '#fee2e2', iconColor: '#dc2626', icon: '🚫',
    title: 'Absent today', sub: 'Employees not present',
    stats: [
      { val: null, key: '_absent', label: 'Absent',     bg: '#fee2e2', color: '#7f1d1d' },
      { val: '2',  label: 'Approved',  bg: '#dcfce7', color: '#14532d' },
      { val: '1',  label: 'Sick',      bg: '#dbeafe', color: '#1e3a6e' },
      { val: '1',  label: 'Unplanned', bg: '#fce7f3', color: '#831843' },
    ],
    bars: [
      { label: 'Approved leave', pct: 50, color: '#22c55e' },
      { label: 'Sick leave',     pct: 25, color: '#3b82f6' },
      { label: 'Unplanned',      pct: 25, color: '#ef4444' },
    ],
    btnLabel: 'Manage leaves', btnTo: '/admin/hr',
  },
  overtime: {
    iconBg: '#ffedd5', iconColor: '#ea580c', icon: '⏱',
    title: 'Overtime hours', sub: 'Today OT breakdown',
    stats: [
      { val: null, key: '_ot',  label: 'Total OT',    bg: '#ffedd5', color: '#7c2d12' },
      { val: '3',   label: 'On OT today', bg: '#dbeafe', color: '#1e3a6e' },
      { val: '2.1h',label: 'Max single',  bg: '#ede9fe', color: '#3b0764' },
      { val: '₹1.8K',label: 'Est. cost', bg: '#dcfce7', color: '#14532d' },
    ],
    bars: [
      { label: 'Arjun Sharma', pct: 60,  color: '#3b82f6' },
      { label: 'Sneha Iyer',   pct: 100, color: '#8b5cf6' },
      { label: 'Priya Reddy',  pct: 25,  color: '#10b981' },
    ],
    btnLabel: 'View OT report', btnTo: '/admin/attendance',
  },
};

/* ─── 3D Modal ────────────────────────────────────────── */
function Modal3D({ modalKey, stats, attPresent, attAbsent, attOt, onClose }) {
  const d = MODAL_DATA[modalKey];
  const [animBars, setAnimBars] = useState(false);
  const [tilt, setTilt] = useState({ x: 2, y: -1 });

  useEffect(() => {
    const t = setTimeout(() => setAnimBars(true), 80);
    return () => clearTimeout(t);
  }, [modalKey]);

  if (!d) return null;

  const resolveVal = (s) => {
    if (s.val !== null && s.val !== undefined) return s.val;
    if (!s.key) return '—';
    if (s.key === '_present') return attPresent ?? '—';
    if (s.key === '_absent')  return attAbsent  ?? '—';
    if (s.key === '_ot')      return attOt      ?? '—';
    return stats?.[s.key] ?? '—';
  };

  const handleMouseMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientY - r.top)  / r.height - 0.5) * 8;
    const y = ((e.clientX - r.left) / r.width  - 0.5) * -8;
    setTilt({ x, y });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,10,20,.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 2, y: -1 })}
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%', maxWidth: 480,
          overflow: 'hidden',
          transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform .15s ease',
          boxShadow: '0 32px 64px rgba(0,0,0,.35), 0 8px 16px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.9)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13,
              background: d.iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              {d.icon}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{d.title}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{d.sub}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#f1f5f9', border: 'none',
              cursor: 'pointer', fontSize: 15, color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {d.stats.map((s, i) => (
              <div key={i} style={{ background: s.bg, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{resolveVal(s)}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div>
            {d.bars.map((b, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  <span>{b.label}</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{b.pct}%</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 10, background: b.color,
                    width: animBars ? `${b.pct}%` : '0%',
                    transition: `width .6s ease ${i * 0.08}s`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 10 }}>
          <Link
            to={d.btnTo}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: '#1d4ed8', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
              display: 'block',
            }}
          >
            {d.btnLabel}
          </Link>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              background: '#f1f5f9', color: '#334155',
              border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Charts ──────────────────────────────────────────── */
function DonutChart({ data }) {
  const ref = useRef(null); const inst = useRef(null);
  useEffect(() => {
    if (!data?.length || !ref.current) return;
    import('chart.js/auto').then(({ default: Chart }) => {
      if (inst.current) inst.current.destroy();
      inst.current = new Chart(ref.current, {
        type: 'doughnut',
        data: {
          labels: data.map(d => (d.status || '').replace(/_/g, ' ')),
          datasets: [{ data: data.map(d => d.count), backgroundColor: data.map(d => CHART_COLORS[d.status] || '#94a3b8'), borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed}` } } } },
      });
    });
    return () => { if (inst.current) inst.current.destroy(); };
  }, [data]);
  return <canvas ref={ref} />;
}

function BarChart({ labels, values, color = '#3b82f6' }) {
  const ref = useRef(null); const inst = useRef(null);
  useEffect(() => {
    if (!labels?.length || !ref.current) return;
    import('chart.js/auto').then(({ default: Chart }) => {
      if (inst.current) inst.current.destroy();
      inst.current = new Chart(ref.current, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 5, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 2, font: { size: 11 } } } } },
      });
    });
    return () => { if (inst.current) inst.current.destroy(); };
  }, [labels, values, color]);
  return <canvas ref={ref} />;
}

function LineChart({ labels, values, color = '#6366f1' }) {
  const ref = useRef(null); const inst = useRef(null);
  useEffect(() => {
    if (!labels?.length || !ref.current) return;
    import('chart.js/auto').then(({ default: Chart }) => {
      if (inst.current) inst.current.destroy();
      inst.current = new Chart(ref.current, {
        type: 'line',
        data: { labels, datasets: [{ data: values, borderColor: color, backgroundColor: color + '18', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: color, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, callback: v => '₹' + Math.round(v) + 'K' } } } },
      });
    });
    return () => { if (inst.current) inst.current.destroy(); };
  }, [labels, values, color]);
  return <canvas ref={ref} />;
}

/* ─── Main dashboard ──────────────────────────────────── */
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [attendance, setAttendance] = useState({ records: [], loading: true });
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data)).catch(console.error);
    const today = new Date().toISOString().slice(0, 10);
    api.get(`/admin/attendance?date=${today}`)
      .then(r => setAttendance({ records: r.data || [], loading: false }))
      .catch(() => setAttendance({ records: [], loading: false }));
  }, []);

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94a3b8', gap: 8 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Loading dashboard…
      </div>
    );
  }

  const { stats, recent_projects = [], project_chart = [], monthly_projects = [], payroll_chart = [] } = data;

  const presentCount  = attendance.records.filter(r => r.status === 'present').length;
  const absentCount   = Math.max(0, (stats?.employees || 0) - presentCount);
  const overtimeTotal = attendance.records.reduce((s, r) => s + (parseFloat(r.overtime_hours) || 0), 0).toFixed(1);

  const g4 = { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 14 };
  const g3 = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12, marginBottom: 20 };
  const g3c = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 };

  return (
    <div style={{ paddingBottom: '2rem' }}>

      {activeModal && (
        <Modal3D
          modalKey={activeModal}
          stats={stats}
          attPresent={presentCount}
          attAbsent={absentCount}
          attOt={`${overtimeTotal}h`}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Admin dashboard</h1>
      </div>

      {/* KEY METRICS */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>Key metrics</div>
      <div style={g4}>
        <MetricCard icon="📁" label="Total projects"     value={stats.projects}           theme="blue"    />
        <MetricCard icon="👥" label="Employees"          value={stats.employees}          theme="green"  />
        <MetricCard icon="🏢" label="Clients"            value={stats.clients}            theme="purple"  />
        <MetricCard icon="₹"  label="Payroll this month" value={stats.payroll_this_month} theme="pink"    />
      </div>

      

    

      

      {/* CHARTS */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>Analytics</div>
      <div style={g3c}>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Projects by status</div>
          {project_chart.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10, fontSize: 11, color: '#64748b' }}>
              {project_chart.map(c => (
                <span key={c.status} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[c.status] || '#94a3b8', display: 'inline-block' }} />
                  {(c.status || '').replace(/_/g, ' ')} {c.count}
                </span>
              ))}
            </div>
          )}
          <div style={{ position: 'relative', height: 160 }}><DonutChart data={project_chart} /></div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>New projects / month</div>
          <div style={{ position: 'relative', height: 190 }}>
            <BarChart labels={monthly_projects.map(m => m.month)} values={monthly_projects.map(m => m.count)} color="#3b82f6" />
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Payroll trend (₹K)</div>
          <div style={{ position: 'relative', height: 190 }}>
            <LineChart labels={payroll_chart.map(p => p.period)} values={payroll_chart.map(p => Math.round(Number(p.total) / 1000))} color="#6366f1" />
          </div>
        </div>
      </div>
      {/* RECENT PROJECTS TABLE */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', marginBottom: 10,marginTop:10 }}>Recent projects</div>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '1rem 1.25rem', overflowX: 'auto', marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              {[['Title','30%'],['Client','22%'],['Status','20%'],['Deadline','15%'],['Updated','13%']].map(([h, w]) => (
                <th key={h} style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 10px 8px 0', textAlign: 'left', width: w }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent_projects.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '9px 10px 9px 0', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                <td style={{ padding: '9px 10px 9px 0', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.client_name}</td>
                <td style={{ padding: '9px 10px 9px 0' }}><StatusBadge status={p.status} /></td>
                <td style={{ padding: '9px 10px 9px 0', color: '#64748b', fontSize: 12 }}>
                  {p.deadline ? new Date(p.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td style={{ padding: '9px 0', color: '#64748b', fontSize: 12 }}>
                  {new Date(p.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </td>
              </tr>
            ))}
            {!recent_projects.length && (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No projects yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
        {/* ATTENDANCE TABLE */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>Attendance details</div>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '1rem 1.25rem', overflowX: 'auto', marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              {[['Employee','24%'],['Code','11%'],['Check in','11%'],['Check out','11%'],['Hours','9%'],['OT','9%'],['Status','13%']].map(([h, w]) => (
                <th key={h} style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 10px 8px 0', textAlign: 'left', width: w }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attendance.records.map(r => (
              <tr key={`${r.id}-${r.date}`} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '9px 10px 9px 0', fontWeight: 600, color: '#0f172a' }}>{r.full_name || '—'}</td>
                <td style={{ padding: '9px 10px 9px 0', color: '#64748b' }}>{r.employee_code || '—'}</td>
                <td style={{ padding: '9px 10px 9px 0', fontFamily: 'monospace', fontSize: 12, color: '#166534' }}>{r.check_in || '—'}</td>
                <td style={{ padding: '9px 10px 9px 0', fontFamily: 'monospace', fontSize: 12, color: '#991b1b' }}>{r.check_out || '—'}</td>
                <td style={{ padding: '9px 10px 9px 0', fontFamily: 'monospace', fontSize: 12, color: '#1e40af' }}>{r.total_hours != null ? `${r.total_hours}h` : '—'}</td>
                <td style={{ padding: '9px 10px 9px 0', fontFamily: 'monospace', fontSize: 12, color: '#854f0b' }}>{parseFloat(r.overtime_hours) > 0 ? `${r.overtime_hours}h` : '—'}</td>
                <td style={{ padding: '9px 0' }}>
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                    background: r.status === 'present' ? '#dcfce7' : '#fee2e2',
                    color: r.status === 'present' ? '#14532d' : '#7f1d1d',
                  }}>
                    {r.status || 'unknown'}
                  </span>
                </td>
              </tr>
            ))}
            {!attendance.loading && !attendance.records.length && (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No attendance records for today.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ATTENDANCE CARDS */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', marginBottom: 10 }}>Today's attendance</div>
      <div style={g3}>
        <MetricCard icon="✅" label="Present today"   value={presentCount}        theme="teal"  />
        <MetricCard icon="🚫" label="Absent today"    value={absentCount}         theme="red"   />
        <MetricCard icon="⏱" label="Overtime hours"  value={`${overtimeTotal}h`} theme="amber" />
      </div>
    </div>
  );
}