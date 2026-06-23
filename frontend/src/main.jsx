import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Global handlers to aid production debugging and handle unauthorized events
if (typeof window !== 'undefined') {
  window.addEventListener('goalline:unauthorized', () => {
    try {
      if (!window.__goalline_redirecting) {
        window.__goalline_redirecting = true;
        localStorage.removeItem('goalline_token');
        window.location.replace('/staff/login');
      }
    } catch (e) {
      // ignore
    }
  });

  window.addEventListener('error', (ev) => {
    // Log to console so Vercel's logs or browser console show the root error
    // and avoid any automatic reload behavior caused by unhandled errors.
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', ev.error || ev.message || ev);
  });

  window.addEventListener('unhandledrejection', (ev) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled promise rejection:', ev.reason || ev);
  });
}