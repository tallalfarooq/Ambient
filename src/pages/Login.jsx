import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowRight, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/lib/AuthContext';

/**
 * Single-step auth: Google OAuth as primary, magic link as fallback.
 *
 * No password, no signup/signin distinction — magic link auto-creates the
 * user if they don't exist. After clicking the email link or completing
 * Google's consent screen, AuthContext picks up the session and the
 * effect below redirects to `returnUrl` (default /Studio).
 */
export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [magicSent, setMagicSent] = useState(false);

  // Normalize returnUrl: only accept same-origin paths.
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

  // Already authenticated? Bounce back to where we came from.
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate, returnUrl]);

  const handleGoogle = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${returnUrl}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (err) throw err;
      // Browser navigates to Google's consent screen — the rest happens after the callback.
    } catch (err) {
      setError(err?.message || 'Google sign-in failed.');
      setGoogleSubmitting(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}${returnUrl}`,
          shouldCreateUser: true,
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
            <SuccessState
              email={email}
              onReset={() => { setMagicSent(false); setEmail(''); }}
            />
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-white mb-1 text-center">
                Welcome to Ambient Space
              </h1>
              <p className="text-sm text-white/50 mb-7 text-center">
                Sign in or create an account in one step.
              </p>

              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleSubmitting || submitting}
                className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: '#FFFFFF',
                  color: '#0A0A0B',
                }}
              >
                {googleSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest text-white/30">
                  or continue with email
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Magic link form */}
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
                <SubmitButton submitting={submitting} disabled={googleSubmitting}>
                  Continue with email <ArrowRight className="w-4 h-4" />
                </SubmitButton>
                <p className="text-xs text-white/40 text-center pt-1">
                  We&rsquo;ll email you a one-click sign-in link. New here? An account is created automatically.
                </p>
              </form>

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
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

function SubmitButton({ submitting, disabled, children }) {
  return (
    <button
      type="submit"
      disabled={submitting || disabled}
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
