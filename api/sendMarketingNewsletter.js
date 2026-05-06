/**
 * /api/sendMarketingNewsletter — admin-only, currently a stub.
 *
 * Called by src/pages/AdminEmail.jsx with { subject, html, segment }. The
 * original implementation iterated the user list and sent emails via
 * Resend. We've dropped that for launch — at MVP scale, sending campaign
 * emails directly from the Resend dashboard is faster and safer.
 *
 * Like /api/syncResendContacts, this stub exists so the admin page doesn't
 * 404 AND so the auth contract is correct: any HTTP client hitting the URL
 * without an admin session gets a clean 403, not a working endpoint.
 *
 * To fully implement: pull users by `segment` from auth.users + profiles,
 * call Resend API (batch), return counts. ~80 lines including dry-run mode.
 * Defer until needed.
 */
import { allow, json } from './_lib/auth.js';
import { requireAdmin } from './_lib/requireAdmin.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return; // 401/403 already written by helper

  return json(res, 501, {
    error: 'Not implemented',
    detail:
      'Marketing newsletter sending is not wired up yet. Use the Resend ' +
      'dashboard to send campaigns until traffic justifies automation.',
  });
}
