import { useEffect, useState } from 'react';
import api from '../../services/api';
import { CheckCircle, XCircle, RefreshCw, Globe, MessageSquare, Star, Send } from 'lucide-react';

export default function AdminProjectWorkflow() {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingReviews, setPendingReviews] = useState([]);
  const [readyForDomain, setReadyForDomain] = useState([]);
  const [domainModal, setDomainModal] = useState(null);
  const [domainForm, setDomainForm] = useState({ domain_name: '', hosting_details: '', project_id: null });
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ decision: '', feedback: '', rating: 3 });
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ feedback: '', rating: 5, send_to_client: false });

  const loadData = async () => {
    const [pending, ready] = await Promise.all([
      api.get('/admin/projects/pending-review'),
      api.get('/admin/projects/ready-for-domain')
    ]);
    setPendingReviews(pending.data);
    setReadyForDomain(ready.data);
  };

  useEffect(() => { loadData(); }, []);

  const submitReview = async (e) => {
    e.preventDefault();
    await api.post(`/admin/projects/${reviewModal}/review`, reviewForm);
    setReviewModal(null);
    setReviewForm({ decision: '', feedback: '', rating: 3 });
    loadData();
  };

  const sendDomain = async (e) => {
    e.preventDefault();
    await api.post(`/admin/projects/${domainModal.project_id}/send-domain`, {
      domain_name: domainForm.domain_name,
      hosting_details: domainForm.hosting_details,
      use_employee_draft: true
    });
    setDomainModal(null);
    setDomainForm({ domain_name: '', hosting_details: '', project_id: null });
    loadData();
  };

  const submitFinalFeedback = async (e) => {
    e.preventDefault();
    await api.post(`/admin/projects/${feedbackModal}/final-feedback`, feedbackForm);
    setFeedbackModal(null);
    setFeedbackForm({ feedback: '', rating: 5, send_to_client: false });
    loadData();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Project Workflow Management</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'pending' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500'}`}
        >
          Pending Review ({pendingReviews.length})
        </button>
        <button
          onClick={() => setActiveTab('domain')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'domain' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500'}`}
        >
          Ready for Domain ({readyForDomain.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'completed' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500'}`}
        >
          Completed Projects
        </button>
      </div>

      {/* Pending Reviews Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingReviews.length === 0 ? (
            <div className="card text-center py-12 text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No projects pending review</p>
            </div>
          ) : (
            pendingReviews.map(project => (
              <div key={project.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{project.title}</h3>
                    <p className="text-sm text-slate-500">
                      {project.tracking_id} · Client: {project.client_name}
                    </p>
                    <p className="text-sm text-brand-600 mt-1">
                      Employee: {project.employee_name} ({project.employee_code})
                    </p>
                    <p className="text-xs text-slate-400">
                      Submitted: {new Date(project.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setReviewModal(project.id)}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    Review Work
                  </button>
                </div>
                
                {project.work_notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">Employee Notes:</p>
                    <p className="text-sm text-slate-600">{project.work_notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Ready for Domain Tab */}
      {activeTab === 'domain' && (
        <div className="space-y-4">
          {readyForDomain.length === 0 ? (
            <div className="card text-center py-12 text-slate-400">
              <Globe className="w-12 h-12 mx-auto mb-3" />
              <p>No projects ready for domain deployment</p>
            </div>
          ) : (
            readyForDomain.map(project => (
              <div key={project.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{project.title}</h3>
                    <p className="text-sm text-slate-500">{project.tracking_id}</p>
                    <p className="text-sm text-brand-600 mt-1">
                      Employee: {project.employee_name}
                    </p>
                    {project.employee_domain_draft && (
                      <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                        <p className="text-sm font-medium text-amber-800">Employee Domain Draft:</p>
                        <p className="text-sm text-amber-700">{project.employee_domain_draft}</p>
                        {project.employee_domain_hosting && (
                          <p className="text-xs text-amber-600 mt-1">{project.employee_domain_hosting}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setDomainModal({ project_id: project.id, domain: project.employee_domain_draft })}
                    className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" /> Deploy Domain
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Completed Projects Tab */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {/* You can add a list of completed projects here */}
          <div className="card text-center py-12 text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>Feature coming soon - View completed projects</p>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={submitReview} className="card max-w-lg w-full space-y-4">
            <h2 className="font-semibold text-lg">Review Employee Submission</h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Decision *</label>
              <select
                className="input-field"
                required
                value={reviewForm.decision}
                onChange={(e) => setReviewForm({ ...reviewForm, decision: e.target.value })}
              >
                <option value="">Select decision</option>
                <option value="approve">✅ Approve - Ready for domain</option>
                <option value="request_changes">🔄 Request Changes - Send back to employee</option>
              </select>
            </div>
            
            {reviewForm.decision === 'approve' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rating (Optional)</label>
                <select
                  className="input-field"
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                >
                  {[5,4,3,2,1].map(r => (
                    <option key={r} value={r}>{'⭐'.repeat(r)} {r}/5</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Feedback *</label>
              <textarea
                className="input-field"
                rows={4}
                required
                placeholder="Provide detailed feedback for the employee..."
                value={reviewForm.feedback}
                onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Submit Review</button>
              <button type="button" className="btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Domain Modal */}
      {domainModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={sendDomain} className="card max-w-md w-full space-y-4">
            <h2 className="font-semibold">Deploy Domain to Client</h2>
            <input
              className="input-field"
              placeholder="Domain Name *"
              required
              defaultValue={domainModal.domain || ''}
              onChange={(e) => setDomainForm({ ...domainForm, domain_name: e.target.value })}
            />
            <textarea
              className="input-field"
              placeholder="Hosting Details"
              rows={3}
              onChange={(e) => setDomainForm({ ...domainForm, hosting_details: e.target.value })}
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Deploy & Notify Client</button>
              <button type="button" className="btn-secondary" onClick={() => setDomainModal(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}