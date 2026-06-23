import axios from 'axios';

// Single axios instance used everywhere
// Use Vite env var VITE_API_URL in production, fallback to local proxy '/api'
const http = axios.create({
  baseURL: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api',
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('goalline_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      try {
        localStorage.removeItem('goalline_token');
        // Dispatch an event so the app can handle redirecting or showing login UI.
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('goalline:unauthorized'));
        }
      } catch (e) {
        // ignore
      }
    }
    return Promise.reject(err);
  }
);

async function request(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Request failed';
    throw new Error(msg);
  }
}

// Public API helpers
export const api = {
  getLandingStats: () => request(() => http.get('/public/landing-stats')),
  getPublicClients: () => request(() => http.get('/public/clients')),
  getPublicProjects: () => request(() => http.get('/public/projects')),
  trackProject: (code) => request(() => http.get(`/public/track-project/${encodeURIComponent(code)}`)),
  trackProjectByIdentifier: (identifier) => request(async () => {
    try {
      return await http.get(`/public/track-project/${encodeURIComponent(identifier)}`);
    } catch (err) {
      if (err.response?.status === 404) {
        return await http.get(`/public/track/${encodeURIComponent(identifier)}`);
      }
      throw err;
    }
  }),
  submitContact: (body) => request(() => http.post('/public/contact', body)),
  submitProject: (body) => request(() => http.post('/public/submit-project', body)),
  payMilestone: (body) => request(() => http.post('/public/pay-milestone', body)),
  submitFeedback: (body) => request(() => http.post('/public/feedback', body)),
  submitComplaint: (body) => request(() => http.post('/public/complaint', body)),
  getPublicMeetings: () => request(() => http.get('/public/meetings')),
  sendGuestChat: (body) => request(() => http.post('/public/guest-chat', body)),
};

export default http;