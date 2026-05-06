/**
 * /api/syncResendContacts — admin-only, currently a stub.
 *
 * Called by src/pages/AdminEmail.jsx. The original implementation
 * walked the user list and pushed contacts into a Resend audience. We've
 * dropped that for launch (the audience is small enough to manage manually
 * in the Resend dashboard), but the route exists so the admin page doesn't
 * 404 and so the auth/authz contract is correct: even if anyone discovers
 * the URL they get a clean 403 unless they're an admin.
 *
 * To fully implement: pull users from auth.users + profiles, batch-create
 * Resend audience contacts via the Resend API. ~50 lines. Defer until the
 * waitlist is large enough that manual sync is annoying.
 */
import { allow, json } from './_lib/auth.js';
import { requireAdmin } from './_lib/requireAdmin.js';

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return; // 401/403 already written by helper

  return json(res, 501, {
    error: 'Not implemented',
    detail:
      'Resend audience sync is not yet wired up. Manage contacts directly ' +
      'in the Resend dashboard for now.',
  });
}
