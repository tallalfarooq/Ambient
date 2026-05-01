import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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

    const applySession = async (session) => {
      if (!session?.user) {
        if (!mounted) return;
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      const sessionUser = session.user;
      // Best-effort profile hydration; don't block UI on RLS or transient errors.
      let profileData = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', sessionUser.id)
          .maybeSingle();
        profileData = data;
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
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await applySession(session);
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
    await base44.auth.logout();
    // Optimistic clear for instant UI feedback; auth listener also fires SIGNED_OUT.
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = (returnUrl) => {
    // Always pass a same-origin PATH, not a full URL — the login page builds the
    // absolute redirect target itself. Avoids "localhost:5173/http://localhost:5173/" loops.
    const path =
      returnUrl ?? (window.location.pathname + window.location.search + window.location.hash);
    base44.auth.redirectToLogin(path);
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
