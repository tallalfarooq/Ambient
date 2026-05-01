/**
 * Supabase client — single shared instance for the app.
 *
 * Uses the anon (public) key, which is safe to expose to the browser.
 * RLS policies (defined in supabase/migrations/0001_initial_schema.sql)
 * gate what each user can see. Server-only privileged operations live
 * in /api/* routes that use SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Loud error during dev: missing env vars are the #1 cause of "why is auth not working"
  // We log instead of throw so static asset routes still load and the user can see what's wrong.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.local.example to .env.local and fill in your Supabase project values.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Disable the cross-tab navigator.locks acquisition that supabase-js v2 uses
    // by default. With multiple tabs open it caused "Lock released because
    // another request stole it" errors that broke uploads and made sign-out
    // feel laggy across tabs. Each tab now refreshes its own token; the
    // BroadcastChannel still propagates SIGNED_IN / SIGNED_OUT cross-tab.
    lock: async (_name, _timeout, fn) => fn(),
  },
});
