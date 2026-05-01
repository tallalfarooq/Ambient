import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Hydrate the user from the Supabase session and keep it in sync.
  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      // Safety timeout: never let the spinner block the page for more than 5s.
      // If Supabase is slow/unreachable, treat as logged-out and keep going.
      const TIMEOUT_MS = 5000;
      try {
        const currentUser = await Promise.race([
          base44.auth.me(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('auth_hydrate_timeout')), TIMEOUT_MS)
          ),
        ]);
        if (!mounted) return;
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } catch (err) {
        if (err?.message === 'auth_hydrate_timeout') {
          // eslint-disable-next-line no-console
          console.warn('[Auth] Hydration timed out after 5s — proceeding as logged-out.');
        }
        // No session (or timeout) — fine. Public pages render; protected pages
        // should check `isAuthenticated` and call `navigateToLogin` themselves.
        if (!mounted) return;
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    };

    hydrate();

    // Subscribe to Supabase auth state changes (sign in / sign out / token refresh).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          const u = await base44.auth.me();
          setUser(u);
          setIsAuthenticated(true);
          setAuthError(null);
        } catch {
          /* swallow — covered by next state change */
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await base44.auth.logout();
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
