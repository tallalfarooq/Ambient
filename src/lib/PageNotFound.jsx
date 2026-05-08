import { useLocation } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * PageNotFound — themed 404 page.
 *
 * Day 6.1: rebuilt to match the dark Ambient Space aesthetic. The previous
 * version used a light slate palette which was jarring next to every other
 * page on the site. This component is wrapped by LayoutWrapper in App.jsx
 * so the standard nav + footer remain visible — users who hit a typo or
 * stale URL still see they're inside the app.
 *
 * No data fetching here — the previous admin-note-from-useQuery path was
 * a Base44 holdover that no longer applied. Keep this component small and
 * dependency-free so the wildcard route renders instantly.
 */
export default function PageNotFound() {
  const location = useLocation();
  const pageName = decodeURIComponent(location.pathname).replace(/^\/+/, '') || '/';

  return (
    <div className="min-h-[calc(100vh-200px)] bg-bg-base text-white flex items-center justify-center px-6 py-24">
      <div className="max-w-xl w-full text-center flex flex-col items-center gap-7">
        {/* 404 numeral with brand gradient */}
        <div
          className="text-[clamp(96px,18vw,180px)] font-bold leading-none tracking-tight"
          style={{
            background:
              'linear-gradient(135deg, rgba(110,198,198,0.85), rgba(201,150,58,0.85))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          404
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">
            We couldn&apos;t find that page.
          </h1>
          <p className="text-white/55 leading-relaxed max-w-md">
            The page <code className="text-white/75 px-1.5 py-0.5 rounded bg-white/5 font-mono text-sm">/{pageName}</code>{' '}
            doesn&apos;t exist (or it moved). Head back home and pick up where you left off.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-2xl text-[#0A0A12] transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1B8FA0, #C9963A)' }}
          >
            <Home className="w-4 h-4" />
            Go home
          </a>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-2xl text-white/80 border border-white/10 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
