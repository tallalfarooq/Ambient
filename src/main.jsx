import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Defensive: suppress noisy unhandled rejections from supabase-js's cross-tab
// auth-token lock. The actual auth flow recovers fine from these via the
// auth state change listener; the only damage is a scary console error.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    if (msg.includes('lock:sb-') && msg.includes('was released')) {
      event.preventDefault();
      // eslint-disable-next-line no-console
      console.debug('[supabase] suppressed cross-tab lock release:', msg);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
