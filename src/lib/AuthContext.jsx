import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { supabase } from '@/api/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Subscribe to Supabase auth state changes — single source of truth.
  // INITIAL_SESSION fires once on subscribe with the current session
  // (whether loaded from storage or freshly detected from a URL hash/code),
  // which gives us hydration without a separate hydrate() call.
  // No race between hydrate and onAuthStateChange because there's only one path.
  useEffect(() => {
    let mounted = true;

    // Generic timeout helper — bounded waits for both getSession() and the
    // profile lookup. Hanging promises inside applySession() were the cause
    // of the "page loads forever until refresh" bug.
    const withTimeout = (promise, ms, fallback) =>
      Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);

    const applySession = async (session) => {
      if (!session?.user) {
        if (!mounted) return;
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      const sessionUser = session.user;
      // Day 11 — best-effort profile hydration with one retry. The previous
      // single-shot 3s wait was firing the timeout warning ~18 times across
      // a typical session in QA-9, suggesting the Supabase REST endpoint is
      // genuinely slow on first call from cold connections. Approach now:
      //   1. First attempt: 4s (gives slow connections more breathing room).
      //   2. If timed out, schedule a non-blocking 6s retry that quietly
      //      upgrades user.full_name / user.role once it resolves.
      // The UI never blocks — defaults render instantly, then the row gets
      // patched in if the retry succeeds.
      const fetchProfile = (timeoutMs) =>
        withTimeout(
          supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', sessionUser.id)
            .maybeSingle(),
          timeoutMs,
          { data: null, _timedOut: true }
        );

      let profileData = null;
      try {
        const result = await fetchProfile(4000);
        if (result?._timedOut) {
          // eslint-disable-next-line no-console
          console.warn('[AuthContext] profile lookup timed out — using defaults, scheduling retry');
          // Background retry — patches user state once the second attempt lands.
          fetchProfile(6000).then((retry) => {
            if (!mounted || retry?._timedOut) return;
            const retryData = retry?.data;
            if (!retryData) return;
            setUser((u) =>
              u && u.id === sessionUser.id
                ? {
                    ...u,
                    full_name: retryData.full_name ?? u.full_name,
                    role: retryData.role ?? u.role,
                  }
                : u
            );
          }).catch(() => { /* swallow — defaults already rendered */ });
        } else {
          profileData = result?.data ?? null;
        }
      } catch {
        /* swallow — fall back to defaults */
      }
      if (!mounted) return;
      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        full_name:
          profileData?.full_name ??
          sessionUser.email?.split('@')[0] ??
          null,
        role: profileData?.role ?? 'user',
      });
      setIsAuthenticated(true);
      setAuthError(null);
    };

    // Belt-and-suspenders: kick off an explicit getSession() so we still
    // resolve isLoadingAuth even if INITIAL_SESSION is delayed for any reason.
    // Day 11 — bumped from 1500ms → 4000ms after QA-9 saw this warning fire
    // on every page load. The onAuthStateChange listener still runs in the
    // background and will fix things up if we time out, but giving Supabase
    // 4s on a cold start prevents the false-logout flash.
    (async () => {
      try {
        const result = await withTimeout(
          supabase.auth.getSession(),
          4000,
          { data: { session: null }, _timedOut: true }
        );
        if (result?._timedOut) {
          // eslint-disable-next-line no-console
          console.warn('[AuthContext] initial getSession timed out — proceeding as unauthenticated');
        }
        await applySession(result?.data?.session ?? null);
      } catch {
        /* ignore — onAuthStateChange will recover */
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      // eslint-disable-next-line no-console
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        console.debug('[AuthContext]', event, session?.user?.email ?? '(no session)');
      }
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        await applySession(session);
        if (mounted) setIsLoadingAuth(false);
      } else if (event === 'SIGNED_OUT') {
        if (!mounted) return;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await apiClient.auth.logout();
    // Optimistic clear for instant UI feedback; auth listener also fires SIGNED_OUT.
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = (returnUrl) => {
    // Always pass a same-origin PATH, not a full URL — the login page builds the
    // absolute redirect target itself. Avoids "localhost:5173/http://localhost:5173/" loops.
    const path =
      returnUrl ?? (window.location.pathname + window.location.search + window.location.hash);
    apiClient.auth.redirectToLogin(path);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        // Kept for backwards-compat with App.jsx; nothing to load anymore.
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        logout,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
