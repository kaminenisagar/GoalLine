import { useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../services/api';

export default function Feedback() {
  const [form, setForm] = useState({ email: '', rating: 0, comment: '', project_id: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating) return;
    try {
      await api.post('/public/feedback', { ...form, project_id: form.project_id || undefined });
      setSubmitted(true);
    } catch {
      alert('Failed to submit feedback');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-2">Project Feedback</h1>
      <p className="text-slate-600 text-center mb-8">Share your experience and rate our service</p>
      {submitted ? (
        <div className="card text-center">
          <p className="text-green-600 font-medium text-lg">Thank you for your feedback!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <input className="input-field" type="email" placeholder="Your Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div>
            <p className="text-sm font-medium mb-2">Rating</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })}>
                  <Star className={`w-8 h-8 ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea className="input-field" rows={4} placeholder="Your feedback (optional)" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          <button type="submit" className="btn-primary w-full">Submit Feedback</button>
        </form>
      )}
    </div>
  );
}
