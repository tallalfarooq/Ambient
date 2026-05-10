/**
 * /api/welcomeEmail — first-session welcome email via Resend.
 *
 * Day 13b. Closes a real onboarding gap: signups landed in the product with
 * zero confirmation, no expectations set, and no Resend-warmup signal. Now:
 *
 *   1. AuthContext fires this once per session if the user has no
 *      `welcome_email_sent_at` timestamp on their profile.
 *   2. We look up the user, check the dedup column, and bail with success
 *      if it's already been sent (idempotent).
 *   3. We pull their current credit balance and plan_type so we can tailor
 *      the copy: invite-redeemed Pro users get a "Pro is active" version,
 *      free-tier users get a "your 2 free credits are ready" version.
 *   4. Send via Resend.
 *   5. Stamp `welcome_email_sent_at` so we never send again for this user.
 *
 * If RESEND_API_KEY is missing we still return 200 so the client doesn't
 * spin in retry — log the skip and move on. Welcome email is a polish
 * feature; it never blocks user onboarding.
 *
 * Failure modes that DO bubble up to the client:
 *   - 401 unauth (bad/missing JWT)
 *   - 502 Resend returned a non-2xx (so monitoring sees Resend outages)
 */
import { allow, getUserFromRequest, json, supabaseAdmin } from './_lib/auth.js';

export const config = { maxDuration: 15 };

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Ambient Space <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'https://www.ambientspace.ai';

function buildEmail({ name, planType, credits }) {
  const isPro = planType === 'pro';
  const isBasic = planType === 'basic';
  const friendlyName = (name && name.trim()) || 'there';

  const headline = isPro
    ? 'Your Pro plan is active.'
    : isBasic
    ? 'Welcome to Ambient Space.'
    : 'Welcome to Ambient Space.';

  const subhead = isPro
    ? `You have ${credits} credits ready to spend — that's up to ${Math.floor(credits / 2)} full AI redesigns or ${credits} fine-tune edits.`
    : `Your account is ready. You have ${credits} free credits — enough to try ${Math.floor(credits / 2)} full AI redesign${Math.floor(credits / 2) === 1 ? '' : 's'} on us.`;

  const cta = `${APP_URL}/Studio`;

  const text = [
    `Hi ${friendlyName},`,
    '',
    headline,
    '',
    subhead,
    '',
    'Quick start:',
    '  1. Open the Studio',
    '  2. Upload a photo of any room (empty rooms work too)',
    '  3. Pick a style (Japandi, Industrial, Boho, etc.)',
    '  4. Watch your space transform in 25–35 seconds',
    '',
    `Get started: ${cta}`,
    '',
    'If something looks off, click "Retry at no cost" — that re-runs without burning another credit. And if a render is wildly wrong, reply to this email and we\'ll dig in.',
    '',
    '— The Ambient Space team',
    '',
    `${APP_URL}/Help · ${APP_URL}/Pricing · Reply to this email for support`,
  ].join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;background:#0A0A0B;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:48px 28px">
    <div style="background:linear-gradient(135deg,#1B8FA0,#C9963A);width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;margin-bottom:32px">
      <span style="font-size:32px">✦</span>
    </div>
    <h1 style="font-size:32px;line-height:1.15;font-weight:700;margin:0 0 12px;letter-spacing:-0.02em">${headline}</h1>
    <p style="color:rgba(255,255,255,0.65);font-size:16px;line-height:1.55;margin:0 0 32px">Hi ${escapeHtml(friendlyName)} — ${subhead}</p>
    <a href="${cta}" style="display:inline-block;background:linear-gradient(135deg,#1B8FA0,#C9963A);color:#fff;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:14px;margin-bottom:36px">Open Studio →</a>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:22px 24px;margin-bottom:36px">
      <p style="color:rgba(255,255,255,0.4);font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 14px">Quick start</p>
      <ol style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.7;margin:0;padding-left:20px">
        <li>Upload a photo of any room (empty rooms work too).</li>
        <li>Pick a style — Japandi, Industrial, Boho, Modern Minimal…</li>
        <li>Watch your space transform in 25–35 seconds.</li>
      </ol>
    </div>
    <p style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;margin:0 0 24px">Render didn't quite land? Click <strong style="color:rgba(255,255,255,0.7)">Retry at no cost</strong> on the result page — re-runs are free. Or just reply to this email; a real human reads everything.</p>
    <p style="color:rgba(255,255,255,0.3);font-size:12px;line-height:1.5;margin:32px 0 0">— The Ambient Space team<br/><a href="${APP_URL}/Help" style="color:rgba(255,255,255,0.4);text-decoration:none">Help &amp; FAQ</a> · <a href="${APP_URL}/Pricing" style="color:rgba(255,255,255,0.4);text-decoration:none">Pricing</a></p>
  </div>
</body></html>`;

  return {
    subject: isPro ? 'Your Ambient Space Pro plan is active' : 'Welcome to Ambient Space',
    text,
    html,
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Not authenticated' });

  // 1. Profile lookup — also gives us the dedup flag.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, welcome_email_sent_at')
    .eq('id', user.id)
    .maybeSingle();

  // Idempotent — already sent? Return success without touching Resend.
  if (profile?.welcome_email_sent_at) {
    return json(res, 200, { sent: false, reason: 'already_sent' });
  }

  // 2. Pull current credits + plan to tailor copy.
  const { data: credits } = await supabaseAdmin
    .from('user_credits')
    .select('credits_remaining, plan_type')
    .eq('user_id', user.id)
    .maybeSingle();

  const planType = credits?.plan_type || 'free';
  const creditCount = credits?.credits_remaining ?? 2;

  // 3. No Resend key? Mark as sent so we don't keep retrying, but log it.
  if (!RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[welcomeEmail] RESEND_API_KEY missing — skipping send for', user.email);
    await supabaseAdmin
      .from('profiles')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', user.id);
    return json(res, 200, { sent: false, reason: 'resend_not_configured' });
  }

  // 4. Send.
  const { subject, text, html } = buildEmail({
    name: profile?.full_name,
    planType,
    credits: creditCount,
  });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [user.email],
        subject,
        text,
        html,
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      // eslint-disable-next-line no-console
      console.error('[welcomeEmail] Resend rejected', r.status, body.slice(0, 300));
      // DON'T stamp welcome_email_sent_at on failure — let it retry next session.
      return json(res, 502, { error: 'Email provider rejected the send', detail: body.slice(0, 200) });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[welcomeEmail] Resend fetch threw', err);
    return json(res, 502, { error: 'Email provider unreachable' });
  }

  // 5. Stamp dedup so we never send again for this user.
  await supabaseAdmin
    .from('profiles')
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq('id', user.id);

  return json(res, 200, { sent: true, plan_type: planType, credits: creditCount });
}
