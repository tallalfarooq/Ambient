import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from '@/App.jsx'
import '@/index.css'

// =============================================================================
// Sentry — error tracking
//
// Free tier covers an MVP comfortably. The DSN is public-safe (it's literally
// designed to be embedded in client bundles). When VITE_SENTRY_DSN is unset
// (e.g. local dev or before the user signs up for Sentry), we skip init and
// the app behaves identically.
// =============================================================================
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN && import.meta.env.PROD) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Auto-capture unhandled errors and rejections.
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Modest sampling for the free tier — we want errors, not every pageview.
    tracesSampleRate: 0.1,
    // Don't send errors from localhost or *.vercel.app preview URLs.
    beforeSend(event) {
      const host = window.location.hostname;
      if (host === 'localhost' || host.endsWith('-vercel.app')) return null;
      return event;
    },
  });
}

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
