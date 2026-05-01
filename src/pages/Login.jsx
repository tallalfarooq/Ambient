import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Mail, Lock, ArrowRight, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/lib/AuthContext';

/**
 * Single-page auth flow:
 *   - Tab: Magic link (default)  → email → Supabase emails a one-click sign-in link
 *   - Tab: Password              → email + password → sign in
 *   - Mode toggle: Sign in / Sign up
 *
 * After magic link or password sign-in, Supabase fires SIGNED_IN, AuthContext
 * picks it up, and we redirect to the returnUrl (or /Studio).
 */
export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  const [tab, setTab] = useState('magic'); // 'magic' | 'password'
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [magicSent, setMagicSent] = useState(false);

  // Normalize returnUrl so it's always a same-origin path (no full URLs).
  // Defends against legacy callers that passed window.location.href.
  const returnUrl = (() => {
    const raw = searchParams.get('returnUrl') || '/Studio';
    try {
      const u = new URL(raw);
      return u.origin === window.location.origin
        ? u.pathname + u.search + u.hash
        : '/Studio';
    } catch {
      return raw.startsWith('/') ? raw : '/' + raw;
    }
  })();

  // If already authenticated, bounce back to where we came from
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate, returnUrl]);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}${returnUrl.startsWith('/') ? returnUrl : '/' + returnUrl}`,
          shouldCreateUser: true, // Magic link doubles as signup
        },
      });
      if (err) throw err;
      setMagicSent(true);
    } catch (err) {
      setError(err?.message || 'Failed to send magic link.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() || undefined },
            emailRedirectTo: `${window.location.origin}${returnUrl.startsWith('/') ? returnUrl : '/' + returnUrl}`,
          },
        });
        if (err) throw err;
        setMagicSent(true); // Reuse the success state — Supabase emails confirmation
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        // Auth state change → AuthContext → useEffect above redirects
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0A0A0B]">
      <div className="w-full max-w-md">
        {/* Brand */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-10">
          <img
            src="/logo.png"
            alt="Ambient Space"
            className="w-9 h-9 rounded-lg object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="flex items-baseline gap-0">
            <span className="font-black text-white text-base tracking-tight">Ambient</span>
            <span className="font-semibold text-base tracking-tight ml-1" style={{ color: '#6EC6C6' }}>Space</span>
          </div>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-sm">
          {magicSent ? (
            <SuccessState email={email} onReset={() => { setMagicSent(false); setEmail(''); }} />
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-white mb-1">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-sm text-white/50 mb-8">
                {mode === 'signup'
                  ? 'Sign up to start redesigning your space.'
                  : 'Sign in to continue redesigning your space.'}
              </p>

              {/* Tabs */}
              <div className="flex gap-1 p-1 mb-6 rounded-xl bg-white/[0.04] border border-white/10">
                <TabButton active={tab === 'magic'} onClick={() => setTab('magic')} icon={Sparkles}>
                  Magic link
                </TabButton>
                <TabButton active={tab === 'password'} onClick={() => setTab('password')} icon={Lock}>
                  Password
                </TabButton>
              </div>

              {/* Magic link tab */}
              {tab === 'magic' && (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <Field
                    label="Email"
                    icon={Mail}
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <SubmitButton submitting={submitting}>
                    Send magic link <ArrowRight className="w-4 h-4" />
                  </SubmitButton>
                  <p className="text-xs text-white/40 text-center">
                    No password to remember. We'll email you a one-click sign-in link.
                  </p>
                </form>
              )}

              {/* Password tab */}
              {tab === 'password' && (
                <form onSubmit={handlePasswordAuth} className="space-y-4">
                  {mode === 'signup' && (
                    <Field
                      label="Full name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name (optional)"
                    />
                  )}
                  <Field
                    label="Email"
                    icon={Mail}
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <Field
                    label="Password"
                    icon={Lock}
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                  />
                  <SubmitButton submitting={submitting}>
                    {mode === 'signup' ? 'Create account' : 'Sign in'}
                    <ArrowRight className="w-4 h-4" />
                  </SubmitButton>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
                      className="text-xs text-white/50 hover:text-white/80 transition"
                    >
                      {mode === 'signin'
                        ? "Don't have an account? Sign up"
                        : 'Already have an account? Sign in'}
                    </button>
                  </div>
                </form>
              )}

              {error && (
                <p className="mt-4 text-sm text-red-400/90 text-center">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          By continuing you agree to our{' '}
          <Link to="/terms-of-service" className="underline hover:text-white/60">Terms</Link>
          {' and '}
          <Link to="/privacy-policy" className="underline hover:text-white/60">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition ${
        active ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}

function Field({ label, icon: Icon, ...inputProps }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide">
        {label}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        )}
        <input
          {...inputProps}
          className={`w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#6EC6C6]/60 focus:bg-white/[0.06] ${
            Icon ? 'pl-9' : ''
          }`}
        />
      </div>
    </label>
  );
}

function SubmitButton({ submitting, children }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[#0A0A0B] transition disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
      style={{ background: 'linear-gradient(135deg, #6EC6C6, #1B8FA0)' }}
    >
      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}

function SuccessState({ email, onReset }) {
  return (
    <div className="text-center py-4">
      <div className="w-12 h-12 rounded-full bg-[#6EC6C6]/15 mx-auto flex items-center justify-center mb-4">
        <Check className="w-6 h-6 text-[#6EC6C6]" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
      <p className="text-sm text-white/60 mb-6">
        We sent a sign-in link to <span className="text-white">{email}</span>.<br />
        Open it on this device to log in.
      </p>
      <button
        onClick={onReset}
        className="text-xs text-white/50 hover:text-white/80 transition"
      >
        Use a different email
      </button>
    </div>
  );
}
