/**
 * Admin authorization helper.
 *
 * Usage in a route handler:
 *
 *   import { requireAdmin } from './_lib/requireAdmin.js';
 *
 *   const admin = await requireAdmin(req, res);
 *   if (!admin) return; // requireAdmin already wrote a 401/403 response
 *   // ... admin-only logic, `admin.user` available
 *
 * Why this is its own helper:
 *   The AdminEmail page checks `user.role === 'admin'` client-side, but
 *   that's window-dressing — anyone who knows the API URL and has any
 *   logged-in session can hit /api/sendMarketingNewsletter and blast emails
 *   to your audience. The server MUST verify the role before doing anything.
 *
 * Source of truth: `profiles.role` column. Set it to 'admin' for your own
 * Supabase auth user via:
 *   UPDATE profiles SET role = 'admin' WHERE id = '<your-uuid>';
 */
import { getUserFromRequest, json, supabaseAdmin } from './auth.js';

export async function requireAdmin(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) {
    json(res, 401, { error: 'Not authenticated' });
    return null;
  }

  // Look up role server-side using the service-role client so RLS doesn't
  // hide the row. We never trust a role claim from the JWT or request body.
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[requireAdmin] profile lookup failed:', error);
    json(res, 500, { error: 'Could not verify admin role' });
    return null;
  }

  if (profile?.role !== 'admin') {
    json(res, 403, { error: 'Admin access required' });
    return null;
  }

  return { user, profile };
}
