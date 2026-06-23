import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/navbar';
import { api } from '../../api';
import StarRating from '../../components/shared/StarRating';
import InteractiveModal, { FormSection, FormField } from '../../components/shared/InteractiveModal';
import '../../components/shared/interactiveModal.css';
import './home.css';

const TECH_STACK = [
  { id: 'react', icon: '⚛️', title: 'React.js', desc: 'Component-based UI with hooks and fast SPA experiences.', detail: 'Virtual DOM and React Router power admin, employee dashboards and the client landing experience.' },
  { id: 'node', icon: '🟢', title: 'Node.js', desc: 'Express APIs for auth, projects, milestones, and chat.', detail: 'REST endpoints with JWT connect the React frontend to business logic.' },
  { id: 'mysql', icon: '🐬', title: 'MySQL', desc: 'Relational storage for clients, projects, tasks, and payments.', detail: 'Normalized schemas enable secure tracking, payroll, and milestone records.' },
];

const FEATURES = [
  { icon: '🎯', title: 'Goal Tracking', desc: 'Real-time progress monitoring with deadline alerts', detail: 'Track every milestone and get notified before deadlines slip.' },
  { icon: '📊', title: 'Project Dashboard', desc: 'Visual timelines and milestone management', detail: 'See all projects, statuses, and due dates in one live dashboard.' },
  { icon: '👥', title: 'Team Collaboration', desc: 'Assign tasks and improve team coordination', detail: 'Admins assign work; employees update progress in real time.' },
  { icon: '⏰', title: 'Deadline Guardian', desc: 'Smart reminders to never miss client deadlines', detail: 'Deadline views combine tasks and projects sorted by due date.' },
  { icon: '🔗', title: 'Client Portal', desc: 'Track projects and manage payments', detail: 'Clients register projects, pay milestones, and track status — all from a dedicated portal.' },
  { icon: '📈', title: 'Reports', desc: 'Professional reports to showcase delivery success', detail: 'Performance, salaries, and completion metrics at a glance.' },
];

const DEFAULT_STATS = {
  counts: { employees: 0, clients: 0, projects: 0, tasks: 0, completedTasks: 0 },
  taskChart: [], projectChart: [], recentProjects: [], chats: [], meetings: [],
  averageRating: 0, totalReviews: 0, reviews: [],
  metrics: { completionRate: 0, activeProjects: 0, teamSize: 0 },
};

function getStatusBadge(status) {
  const map = {
    enquiry_received: { label: 'Enquiry Received', cls: 'gl-badge-yellow' },
    project_started: { label: 'Started', cls: 'gl-badge-blue' },
    development_in_progress: { label: 'In Development', cls: 'gl-badge-indigo' },
    testing_phase: { label: 'Testing', cls: 'gl-badge-purple' },
    changes_requested: { label: 'Changes Requested', cls: 'gl-badge-red' },
    domain_connected: { label: 'Domain Sent', cls: 'gl-badge-cyan' },
    project_completed: { label: 'Completed', cls: 'gl-badge-green' },
    final_delivery: { label: 'Final Delivery', cls: 'gl-badge-emerald' },
    on_hold: { label: 'On Hold', cls: 'gl-badge-amber' },
    cancelled: { label: 'Cancelled', cls: 'gl-badge-gray' },
  };
  const m = map[status] || { label: status?.replace(/_/g, ' ') || 'Unknown', cls: 'gl-badge-gray' };
  return <span className={`gl-status-badge ${m.cls}`}>{m.label}</span>;
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="gl-modal-overlay" onClick={onClose} role="presentation">
      <div className="gl-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="gl-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3 className="gl-modal-title">{title}</h3>
        <div className="gl-modal-body">{children}</div>
      </div>
    </div>
  );
}

// Contact request modal — shows request form first, chat only after admin approval
function ContactRequestModal({ open, onClose }) {
  const [step, setStep] = useState('request'); // 'request' | 'sent'
  const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      await api.submitContact({ ...form, subject: 'Chat Access Request', message: `Request for chat: ${form.reason}` });
      setStep('sent');
    } catch (ex) {
      setErr(ex.message || 'Failed to send request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gl-modal-overlay" onClick={onClose}>
      <div className="gl-modal gl-modal-sm" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="gl-modal-close" onClick={onClose}>×</button>
        {step === 'request' ? (
          <>
            <h3 className="gl-modal-title">Request Chat Access</h3>
            <p className="gl-modal-subtitle">Fill in your details. Once Admin approves, chat will be enabled.</p>
            <form onSubmit={handleSubmit} className="gl-modal-form">
              <input required placeholder="Your Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input required type="email" placeholder="Email *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Phone Number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <textarea placeholder="Reason for contacting *" required rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              {err && <p className="gl-form-error-text">{err}</p>}
              <button type="submit" className="cta-pink-btn" disabled={loading}>{loading ? 'Sending...' : 'Send Request'}</button>
            </form>
          </>
        ) : (
          <div className="gl-success-state">
            <div className="gl-success-icon">✅</div>
            <h3>Request Sent!</h3>
            <p>Your chat access request has been submitted. Admin will review and enable chat access soon. You will be contacted at <strong>{form.email}</strong>.</p>
            <button className="cta-pink-btn" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [selectedTech, setSelectedTech] = useState(null);
  const [trackCode, setTrackCode] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [projectForm, setProjectForm] = useState({
    contact_name: '', email: '', phone: '', password: '', title: '', description: '',
    purpose: '', budget: '', deadline: '', company_name: '', is_self: false,
  });
  const [payForm, setPayForm] = useState({ milestone: 'advance', amount: '', payment_method: 'upi', upi_id: '', reference_no: '', client_email: '' });
  const [rating, setRating] = useState(0);
  const [feedbackForm, setFeedbackForm] = useState({ client_name: '', client_email: '', project_code: '', message: '' });
  const [complaintForm, setComplaintForm] = useState({ client_name: '', client_email: '', project_code: '', subject: '', description: '' });
  const [dbClients, setDbClients] = useState([]);
  const [dbProjects, setDbProjects] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [contactRequestOpen, setContactRequestOpen] = useState(false);

  const handleNavClick = useCallback((section) => {
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadStats = useCallback(() => {
    api.getLandingStats()
      .then(data => setStats(data || DEFAULT_STATS))
      .catch(() => setStats(DEFAULT_STATS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const openFeedback = () => {
    setModal('feedback');
    setFormMsg({ type: '', text: '' });
    Promise.all([api.getPublicClients(), api.getPublicProjects()])
      .then(([clients, projects]) => { setDbClients(clients || []); setDbProjects(projects || []); })
      .catch(() => { setDbClients([]); setDbProjects([]); });
  };

  const onFeedbackClientSelect = (clientId) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setFeedbackForm((f) => ({ ...f, client_name: '', client_email: '', project_code: '' }));
      return;
    }
    const client = dbClients.find((c) => String(c.id) === String(clientId));
    if (!client) return;
    const codes = (client.project_codes || '').split(',').filter(Boolean);
    setFeedbackForm((f) => ({ ...f, client_name: client.contact_name || '', client_email: client.email || '', project_code: codes[0] || '' }));
  };

  const onFeedbackProjectSelect = (code) => {
    const proj = dbProjects.find((p) => p.project_code === code);
    setFeedbackForm((f) => ({ ...f, project_code: code, client_name: proj?.contact_name || f.client_name, client_email: proj?.client_email || f.client_email }));
  };

  const chartHeights = stats.taskChart.length
    ? stats.taskChart.map((t) => Math.max(25, (t.count / Math.max(...stats.taskChart.map((x) => x.count), 1)) * 85))
    : [40, 65, 50, 85];

  const metricsRibbon = [
    { icon: '👥', title: 'Team Members', sub: `${stats.counts.employees} active`, dynamic: stats.counts.employees },
    { icon: '📁', title: 'Active Projects', sub: `${stats.counts.projects} total`, dynamic: stats.metrics.activeProjects },
    { icon: '✅', title: 'Tasks Completed', sub: `${stats.metrics.completionRate}% rate`, dynamic: stats.metrics.completionRate },
    { icon: '⭐', title: 'Client Rating', sub: `${stats.totalReviews} reviews`, dynamic: stats.averageRating },
    { icon: '💼', title: 'Clients', sub: 'Managed accounts', dynamic: stats.counts.clients },
    { icon: '📋', title: 'Open Tasks', sub: 'In pipeline', dynamic: stats.counts.tasks - stats.counts.completedTasks },
  ];

  // Top 4 rated feedbacks only
  const allReviews = stats.reviews.length
    ? stats.reviews.map((r) => ({ text: r.message, author: r.client_name || 'Client', rating: r.rating || 5 }))
    : [
        { text: 'GoalLine helped us deliver 95% of our client projects on time!', author: 'Rahul Sharma, PixelCraft', rating: 5 },
        { text: 'Client communication and deadline management became so much easier.', author: 'Priya Malhotra, GrowthWorks', rating: 5 },
        { text: 'The project tracking feature is incredibly transparent for our clients.', author: 'Amit Kumar, TechVentures', rating: 5 },
        { text: 'Payroll and attendance tracking saves us hours every month.', author: 'Sneha Reddy, DesignCo', rating: 4 },
      ];
  const reviews = [...allReviews].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);

  const handleTrack = async (e) => {
    e.preventDefault();
    const identifier = trackCode.trim();
    if (!identifier) { setTrackResult({ error: 'Please enter a Tracking ID or registered email.' }); return; }
    setTrackLoading(true);
    setTrackResult(null);
    try {
      const result = await api.trackProjectByIdentifier(identifier);
      if (result?.error) setTrackResult({ error: result.error });
      else if (!result?.project_code) setTrackResult({ error: 'Project not found. Please check your Tracking ID or email.' });
      else setTrackResult(result);
    } catch (err) {
      setTrackResult({ error: err.message || 'Failed to track project. Please try again.' });
    } finally {
      setTrackLoading(false);
    }
  };

  const handleContact = async (e) => {
    e.preventDefault();
    try {
      await api.submitContact(contactForm);
      setFormMsg({ type: 'success', text: 'Message sent! We will contact you soon.' });
      setContactForm({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setModal(null), 2000);
    } catch (err) { setFormMsg({ type: 'error', text: err.message }); }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        contact_name: projectForm.contact_name,
        email: projectForm.email,
        phone: projectForm.phone,
        password: projectForm.password,
        title: projectForm.title,
        description: [projectForm.description, projectForm.purpose ? `Purpose: ${projectForm.purpose}` : ''].filter(Boolean).join('\n'),
        budget: projectForm.budget,
        deadline: projectForm.deadline,
        company_name: projectForm.is_self ? 'Self' : projectForm.company_name,
      };
      const res = await api.submitProject(submitData);
      setFormMsg({ type: 'success', text: `✅ Project submitted! Your Project ID: ${res.project_code}. We'll reach out shortly.` });
      setProjectForm({ contact_name: '', email: '', phone: '', password: '', title: '', description: '', purpose: '', budget: '', deadline: '', company_name: '', is_self: false });
      setTimeout(() => setModal(null), 3500);
    } catch (err) { setFormMsg({ type: 'error', text: err.message }); }
  };

  return (
    <div className="landing-page-wrapper">
      {loading && <div className="gl-loading-bar" />}
      <Navbar onNavClick={handleNavClick} onOpenProject={() => setModal('project')} onOpenTrack={() => setModal('track')} />

      {/* ─── Hero ─── */}
      <section className="hero-section" id="home">
        <div className="hero-inner">
          <div className="hero-container-grid">
            <div className="hero-content">
              <p className="hero-tagline">🚀 Project Management Platform</p>
              <h1>Deliver Projects <span className="highlight">On Time</span>, Every Time</h1>
              <p className="hero-subtext">GoalLine empowers teams to manage projects, track deadlines, handle payroll, and communicate seamlessly — all in one powerful platform.</p>
              <div className="hero-buttons">
                <button className="cta-pink-btn" onClick={() => setModal('project')}>Start a New Project</button>
                <button className="cta-outline-btn" onClick={() => setModal('track')}>Track Your Project</button>
              </div>
            </div>
            <div className="hero-graphic-preview">
              <div className="mockup-phone-frame">
                <div className="mockup-inner-screen">
                  <div className="mockup-header">
                    <span className="mockup-dot red" /><span className="mockup-dot yellow" /><span className="mockup-dot green" />
                    <span className="mockup-title">GoalLine Dashboard</span>
                  </div>
                  <div className="mockup-stat-row">
                    {[{ l: 'Projects', v: stats.counts.projects }, { l: 'Team', v: stats.counts.employees }, { l: 'Clients', v: stats.counts.clients }].map(s => (
                      <div key={s.l} className="mockup-stat-card">
                        <span className="mockup-stat-num">{s.v}</span>
                        <span className="mockup-stat-label">{s.l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mockup-chart">
                    {chartHeights.map((h, i) => <div key={i} className="mockup-bar" style={{ height: `${h}%` }} />)}
                  </div>
                  <div className="mockup-status-row">
                    <span className="mockup-pill green">● On Track</span>
                    <span className="mockup-pill blue">● {stats.metrics.activeProjects || 0} Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metrics Ribbon ─── */}
      <section className="metrics-ribbon">
        {metricsRibbon.map((m, i) => (
          <div key={i} className="metric-card">
            <span className="metric-icon">{m.icon}</span>
            <div>
              <div className="metric-value">{typeof m.dynamic === 'number' && m.title === 'Client Rating' ? m.dynamic.toFixed(1) : m.dynamic}</div>
              <div className="metric-title">{m.title}</div>
              <div className="metric-sub">{m.sub}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ─── Features ─── */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2>Everything Your Team Needs</h2>
            <p>Powerful tools built for modern project management teams.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.icon} className="feature-card" onClick={() => { setSelectedFeature(f); setModal('feature'); }}>
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <span className="feature-learn">Learn more →</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="how-section" id="how">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Process</span>
            <h2>How GoalLine Works</h2>
            <p>Simple, transparent workflow from enquiry to delivery.</p>
          </div>
          <div className="steps-grid">
            {[
              { n: '01', t: 'Submit Project', d: 'Fill out the project form with your requirements, budget, and deadline.' },
              { n: '02', t: 'Admin Assigns', d: 'Admin reviews and assigns the project to the best-fit employee.' },
              { n: '03', t: 'Development', d: 'Employee builds, tracks status, and submits domain for admin review.' },
              { n: '04', t: 'Client Review', d: 'Admin sends domain to client. Client reviews and approves or requests changes.' },
            ].map((s) => (
              <div key={s.n} className="step-card">
                <div className="step-number">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack ─── */}
      <section className="tech-section" id="tech">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Tech Stack</span>
            <h2>Built with Modern Technology</h2>
            <p>Reliable, scalable, and developer-friendly stack.</p>
          </div>
          <div className="tech-grid">
            {TECH_STACK.map((t) => (
              <div key={t.id} className="tech-card" onClick={() => { setSelectedTech(t); setModal('tech'); }}>
                <span className="tech-icon">{t.icon}</span>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Top 4 Rated Reviews ─── */}
      <section className="reviews-section" id="testimonials">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Testimonials</span>
            <h2>What Our Clients Say</h2>
            <p>Top rated feedback from our valued clients.</p>
          </div>
          <div className="reviews-container">
            {reviews.map((r, i) => (
              <div key={i} className="review-card">
                <div className="review-stars">{'⭐'.repeat(r.rating || 5)}</div>
                <p className="review-text">"{r.text}"</p>
                <p className="review-author">— {r.author}</p>
              </div>
            ))}
          </div>
        
        </div>
      </section>

      {/* ─── 24/7 Support Section ─── */}
      <section className="support-section" id="contact">
        <div className="section-container">
          <div className="support-card">
            <div className="support-icon">🛡️</div>
            <div className="support-content">
              <h2>24/7 Support Available</h2>
              <p>Our team is always ready to help you with any questions, issues, or project assistance. Reach us anytime.</p>
              <div className="support-contacts">
                <a href="tel:+919876543210" className="support-contact-item">
                  <span>📞</span> +91 98765 43210
                </a>
                <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="support-contact-item whatsapp">
                  <span>💬</span> WhatsApp Support
                </a>
                <a href="mailto:support@goalline.in" className="support-contact-item email">
                  <span>✉️</span> support@goalline.in
                </a>
              </div>
              <div className="social-icons-row">
                <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="social-icon whatsapp" title="WhatsApp">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
                <a href="https://instagram.com/goalline" target="_blank" rel="noopener noreferrer" className="social-icon instagram" title="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="mailto:support@goalline.in" className="social-icon email-icon" title="Email">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </a>
              </div>
            </div>
            <div className="support-cta">
              <button className="cta-pink-btn" onClick={() => setContactRequestOpen(true)}>Request Chat Access</button>
              <p className="support-note">Admin will approve your request before chat is enabled.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="footer-section">
        <div className="footer-container">
          <div className="footer-brand">
            <h3>Goal<span>Line</span></h3>
            <p>Helping small teams smash deadlines.</p>
            <div className="footer-social">
              <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" title="WhatsApp" className="footer-social-link">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a href="https://instagram.com/goalline" target="_blank" rel="noopener noreferrer" title="Instagram" className="footer-social-link">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="mailto:support@goalline.in" title="Email" className="footer-social-link">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              </a>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-column"><h4>Product</h4><ul>
              <li onClick={() => handleNavClick('features')}>Features</li>
              <li onClick={() => handleNavClick('how')}>How It Works</li>
            </ul></div>
            <div className="footer-column"><h4>Account</h4><ul>
              <li><Link to="/client/login">Client Login</Link></li>
              <li><Link to="/client/register">Client Register</Link></li>
              <li><Link to="/staff/login">Staff Login</Link></li>
            </ul></div>
            <div className="footer-column"><h4>Support</h4><ul>
              <li onClick={() => setModal('contact')}>Contact Us</li>
              <li onClick={() => setModal('track')}>Track Project</li>
              <li onClick={() => setModal('complaint')}>Complaint</li>
              <li><a href="tel:+919876543210">+91 98765 43210</a></li>
            </ul></div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 GoalLine. All rights reserved.</p>
          <p>24/7 Support: <a href="tel:+919876543210">+91 98765 43210</a></p>
        </div>
      </footer>

      {/* ─── MODALS ─── */}

      {/* Contact Request Modal */}
      <ContactRequestModal open={contactRequestOpen} onClose={() => setContactRequestOpen(false)} />

      {/* Track Modal */}
      <Modal open={modal === 'track'} onClose={() => { setModal(null); setTrackResult(null); setTrackCode(''); }} title="Track Your Project">
        <form onSubmit={handleTrack} className="gl-modal-form">
          <input type="text" value={trackCode} onChange={(e) => setTrackCode(e.target.value)} placeholder="Enter Project ID (e.g. GLXXXXXXXX)" required disabled={trackLoading} />
          <button type="submit" className="cta-pink-btn" disabled={trackLoading}>{trackLoading ? 'Tracking...' : 'Track Project'}</button>
        </form>
        {trackLoading && <div className="gl-loading-state"><div className="spinner" /><p>Fetching project details...</p></div>}
        {trackResult && !trackResult.error && !trackLoading && (
          <div className="gl-track-result">
            <div className="track-header">
              <h4>{trackResult.title}</h4>
              {getStatusBadge(trackResult.status)}
            </div>
            <div className="track-info">
              <p><strong>Project ID:</strong> {trackResult.project_code}</p>
              {trackResult.budget && <p><strong>Budget:</strong> ₹{Number(trackResult.budget).toLocaleString()}</p>}
              {trackResult.deadline && <p><strong>Deadline:</strong> {new Date(trackResult.deadline).toLocaleDateString()}</p>}
            </div>
            {trackResult.client_visible && trackResult.deployed_url ? (
              <div className="live-url-section">
                <p><strong>🌐 Live URL:</strong></p>
                <a href={trackResult.deployed_url} target="_blank" rel="noreferrer" className="live-link">{trackResult.deployed_url}</a>
              </div>
            ) : <p className="gl-pending-note">🔜 Live link will appear here after admin publishes your project.</p>}
            {trackResult.milestones?.length > 0 && (
              <div className="milestones-section">
                <h5>💰 Milestones & Payments</h5>
                {trackResult.milestones.map((m, idx) => (
                  <div key={idx} className="gl-milestone-row">
                    <span>{m.milestone}</span>
                    <span>₹{Number(m.amount).toLocaleString()}</span>
                    <span className={`milestone-status status-${m.status}`}>{m.status === 'paid' ? '✅ Paid' : m.status === 'partial' ? '⚠️ Partial' : '⏳ Pending'}</span>
                    {m.status !== 'paid' && <button type="button" className="ae-btn-sm ok" onClick={() => { setPayForm({ ...payForm, milestone: m.milestone, amount: m.amount, client_email: trackResult.client_email || '' }); setModal('pay'); }}>Pay Now</button>}
                  </div>
                ))}
              </div>
            )}
            {trackResult.status_updates?.length > 0 && (
              <div className="updates-section">
                <h5>📋 Status Updates</h5>
                {trackResult.status_updates.map((u, i) => (
                  <div key={i} className="gl-update-row">
                    <span>{u.status}</span><span>{u.message || '—'}</span><span>{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {trackResult?.error && !trackLoading && (
          <div className="gl-form-error"><span>⚠️</span><p>{trackResult.error}</p></div>
        )}
      </Modal>

      {/* Contact Modal */}
      <Modal open={modal === 'contact'} onClose={() => setModal(null)} title="Contact GoalLine">
        <form onSubmit={handleContact} className="gl-modal-form">
          <input placeholder="Name *" required value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
          <input type="email" placeholder="Email *" required value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
          <input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
          <input placeholder="Subject" value={contactForm.subject} onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })} />
          <textarea placeholder="Message *" required rows={4} value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} />
          {formMsg.text && <p className={formMsg.type === 'success' ? 'gl-form-success-text' : 'gl-form-error-text'}>{formMsg.text}</p>}
          <button type="submit" className="cta-pink-btn">Send Message</button>
        </form>
      </Modal>

      {/* Start New Project Modal — with Password & Phone */}
      <Modal open={modal === 'project'} onClose={() => { setModal(null); setFormMsg({ type: '', text: '' }); }} title="Start a New Project">
        {formMsg.text && <p className={`gl-form-msg ${formMsg.type}`}>{formMsg.text}</p>}
        <form onSubmit={handleProjectSubmit} className="gl-modal-form">
          <div className="gl-form-row">
            <input placeholder="Your Name *" required value={projectForm.contact_name} onChange={(e) => setProjectForm({ ...projectForm, contact_name: e.target.value })} />
            <input type="email" placeholder="Email *" required value={projectForm.email} onChange={(e) => setProjectForm({ ...projectForm, email: e.target.value })} />
          </div>
          <div className="gl-form-row">
            <input type="tel" placeholder="Phone Number *" required value={projectForm.phone} onChange={(e) => setProjectForm({ ...projectForm, phone: e.target.value })} />
            <input type="password" placeholder="Password (for Client Portal) *" required minLength={6} value={projectForm.password} onChange={(e) => setProjectForm({ ...projectForm, password: e.target.value })} />
          </div>
          <input placeholder="Project Title *" required value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
          <textarea placeholder="Project Description *" required rows={3} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
          <textarea placeholder="Purpose / Goals of this project" rows={2} value={projectForm.purpose} onChange={(e) => setProjectForm({ ...projectForm, purpose: e.target.value })} />
          <div className="gl-form-row">
            <input type="number" placeholder="Budget (₹)" value={projectForm.budget} onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })} />
            <input type="date" value={projectForm.deadline} onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })} />
          </div>
          <label className="gl-checkbox-label">
            <input type="checkbox" checked={projectForm.is_self} onChange={(e) => setProjectForm({ ...projectForm, is_self: e.target.checked, company_name: '' })} />
            This is a personal / self project
          </label>
          {!projectForm.is_self && (
            <input placeholder="Company Name" value={projectForm.company_name} onChange={(e) => setProjectForm({ ...projectForm, company_name: e.target.value })} />
          )}
          <button type="submit" className="cta-pink-btn">Submit Project</button>
        </form>
      </Modal>

      {/* Pay Milestone Modal */}
      <Modal open={modal === 'pay'} onClose={() => setModal(null)} title="Milestone Payment">
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            setTrackLoading(true);
            await api.payMilestone({ project_code: trackCode.trim().toUpperCase(), amount: Number(payForm.amount), payment_method: payForm.payment_method, upi_id: payForm.upi_id, reference_no: payForm.reference_no, client_email: payForm.client_email, milestone: payForm.milestone });
            setFormMsg({ type: 'success', text: '✅ Payment recorded!' });
            setModal('track');
            const updated = await api.trackProject(trackCode.trim().toUpperCase());
            setTrackResult(updated);
          } catch (err) { setFormMsg({ type: 'error', text: err.message }); }
          finally { setTrackLoading(false); }
        }} className="gl-modal-form">
          <p><strong>Project:</strong> {trackCode}</p>
          <p><strong>Milestone:</strong> {payForm.milestone}</p>
          <p><strong>Amount:</strong> ₹{payForm.amount}</p>
          <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
            <option value="upi">UPI Payment</option>
            <option value="cash">Cash Payment</option>
          </select>
          {payForm.payment_method === 'upi' && <input placeholder="UPI ID" value={payForm.upi_id} onChange={(e) => setPayForm({ ...payForm, upi_id: e.target.value })} />}
          <input placeholder="Reference / Transaction No." value={payForm.reference_no} onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })} />
          <input type="email" placeholder="Your email (for confirmation)" value={payForm.client_email} onChange={(e) => setPayForm({ ...payForm, client_email: e.target.value })} />
          {formMsg.text && <p className={formMsg.type === 'success' ? 'gl-form-success-text' : 'gl-form-error-text'}>{formMsg.text}</p>}
          <button type="submit" className="cta-pink-btn" disabled={trackLoading}>Confirm Payment</button>
        </form>
      </Modal>

      {/* Feedback Modal */}
      <InteractiveModal open={modal === 'feedback'} onClose={() => { setModal(null); setSelectedClientId(''); }} title="Feedback & Rating" subtitle="Select your client profile" icon="⭐" size="lg"
        footer={<button type="submit" form="feedback-form" className="im-btn im-btn-primary">Submit Feedback</button>}>
        <form id="feedback-form" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.submitFeedback({ ...feedbackForm, rating, message: feedbackForm.message });
            setFormMsg({ type: 'success', text: 'Thank you for your feedback!' });
            setModal(null);
          } catch (err) { setFormMsg({ type: 'error', text: err.message }); }
        }}>
          {formMsg.text && <p className={formMsg.type === 'success' ? 'gl-form-success-text' : 'gl-form-error-text'}>{formMsg.text}</p>}
          <FormSection>
            <FormField label="Select Client">
              <select value={selectedClientId} onChange={(e) => onFeedbackClientSelect(e.target.value)}>
                <option value="">— Select your name —</option>
                {dbClients.map((c) => <option key={c.id} value={c.id}>{c.contact_name}</option>)}
              </select>
            </FormField>
            <FormField label="Name"><input value={feedbackForm.client_name} onChange={(e) => setFeedbackForm({ ...feedbackForm, client_name: e.target.value })} /></FormField>
            <FormField label="Email"><input type="email" value={feedbackForm.client_email} onChange={(e) => setFeedbackForm({ ...feedbackForm, client_email: e.target.value })} /></FormField>
            <FormField label="Project">
              <select value={feedbackForm.project_code} onChange={(e) => onFeedbackProjectSelect(e.target.value)}>
                <option value="">— Select project —</option>
                {dbProjects.map((p) => <option key={p.project_code} value={p.project_code}>{p.title} ({p.project_code})</option>)}
              </select>
            </FormField>
            <FormField label="Rating"><StarRating value={rating} onChange={setRating} /></FormField>
            <FormField label="Feedback"><textarea required rows={4} value={feedbackForm.message} onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })} /></FormField>
          </FormSection>
        </form>
      </InteractiveModal>

      {/* Complaint Modal */}
      <Modal open={modal === 'complaint'} onClose={() => setModal(null)} title="Submit Complaint">
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.submitComplaint(complaintForm);
            setFormMsg({ type: 'success', text: 'Complaint submitted. We will follow up within 24 hours.' });
            setComplaintForm({ client_name: '', client_email: '', project_code: '', subject: '', description: '' });
            setTimeout(() => setModal(null), 2000);
          } catch (err) { setFormMsg({ type: 'error', text: err.message }); }
        }} className="gl-modal-form">
          <input placeholder="Your Name *" required value={complaintForm.client_name} onChange={(e) => setComplaintForm({ ...complaintForm, client_name: e.target.value })} />
          <input type="email" placeholder="Email *" required value={complaintForm.client_email} onChange={(e) => setComplaintForm({ ...complaintForm, client_email: e.target.value })} />
          <input placeholder="Project Code" value={complaintForm.project_code} onChange={(e) => setComplaintForm({ ...complaintForm, project_code: e.target.value })} />
          <input placeholder="Subject *" required value={complaintForm.subject} onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })} />
          <textarea placeholder="Description *" required rows={4} value={complaintForm.description} onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })} />
          {formMsg.text && <p className={formMsg.type === 'success' ? 'gl-form-success-text' : 'gl-form-error-text'}>{formMsg.text}</p>}
          <button type="submit" className="cta-pink-btn">Submit Complaint</button>
        </form>
      </Modal>

      {/* Feature Detail Modal */}
      <Modal open={modal === 'feature' && !!selectedFeature} onClose={() => setModal(null)} title={selectedFeature?.title}>
        <p className="gl-modal-detail-text">{selectedFeature?.detail}</p>
      </Modal>

      {/* Tech Detail Modal */}
      <Modal open={modal === 'tech' && !!selectedTech} onClose={() => { setModal(null); setSelectedTech(null); }} title={selectedTech?.title}>
        <p className="gl-modal-detail-text">{selectedTech?.detail}</p>
      </Modal>
    </div>
  );
}