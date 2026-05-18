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
// Support inbox the user can REPLY to. Defaults to the same address as the
// `from` so replies land somewhere a human reads. Set SUPPORT_EMAIL in env
// to route replies to a different address (e.g. founder inbox during beta).
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || null;
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

  // Email HTML in 2026 still needs to look right in Gmail, Outlook, Apple
  // Mail, and the built-in iOS Mail. That means table-based layout, inline
  // styles, no flexbox/grid, websafe fonts, and a max width of 600px.
  // The logo is served from the production app at /logo.png — that URL has
  // long-lived caching and resolves whether or not the recipient is signed
  // in (it's a public asset).
  const logoUrl = `${APP_URL}/logo.png`;
  const previewText = isPro
    ? `100 credits ready to spend. Open Studio when you're ready.`
    : `Your 2 free credits are ready. Open Studio when you are.`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0B;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- preview text shown in inbox preview pane (Gmail / Apple Mail) -->
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;mso-hide:all;">${escapeHtml(previewText)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0A0B;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0F0F11;border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden;">

          <!-- Header: logo + wordmark, left-aligned -->
          <tr>
            <td style="padding:28px 32px 24px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:12px;">
                    <img src="${logoUrl}" alt="Ambient Space" width="36" height="36" style="display:block;border:0;border-radius:9px;" />
                  </td>
                  <td valign="middle">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Ambient</span>
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#6EC6C6;letter-spacing:-0.01em;">&nbsp;Space</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:40px 32px 8px 32px;">
              <h1 style="margin:0 0 14px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${escapeHtml(headline)}</h1>
              <p style="margin:0 0 28px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:rgba(255,255,255,0.65);">Hi ${escapeHtml(friendlyName)} — ${escapeHtml(subhead)}</p>
            </td>
          </tr>

          <!-- CTA button. Bulletproof button (table + role=presentation) so
               Outlook desktop renders the rounded background. -->
          <tr>
            <td style="padding:0 32px 36px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#1B8FA0" style="border-radius:12px;background-image:linear-gradient(135deg,#1B8FA0,#C9963A);">
                    <a href="${cta}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">Open Studio &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Showcase gallery — Day 13c. Three before/after pairs from the
               marketing site (RoomVideoShowcase). Drives clicks: signups
               who SEE what's possible convert to first-generation ~2x
               better than text-only welcome emails. Built with table-based
               layout so it survives Gmail/Outlook/Apple Mail. Each pair is
               a 2-column table with stacked label rows. -->
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase;">See what's possible</p>

              <!-- Pair 1: Modern Minimal -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;background-color:rgba(255,255,255,0.025);">
                <tr>
                  <td width="50%" style="padding:0;">
                    <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&amp;fit=crop&amp;w=560&amp;q=80" width="260" alt="Empty room before" style="display:block;width:100%;max-width:260px;height:160px;object-fit:cover;border:0;" />
                    <p style="margin:0;padding:6px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);letter-spacing:0.08em;text-transform:uppercase;background:rgba(0,0,0,0.3);">Before</p>
                  </td>
                  <td width="50%" style="padding:0;">
                    <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&amp;fit=crop&amp;w=560&amp;q=80" width="260" alt="Modern minimal interior after AI redesign" style="display:block;width:100%;max-width:260px;height:160px;object-fit:cover;border:0;" />
                    <p style="margin:0;padding:6px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;color:#6EC6C6;letter-spacing:0.08em;text-transform:uppercase;background:rgba(0,0,0,0.3);">Modern Minimal &#10022;</p>
                  </td>
                </tr>
              </table>

              <!-- Pair 2: Scandinavian -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;background-color:rgba(255,255,255,0.025);">
                <tr>
                  <td width="50%" style="padding:0;">
                    <img src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&amp;fit=crop&amp;w=560&amp;q=80" width="260" alt="Empty room before" style="display:block;width:100%;max-width:260px;height:160px;object-fit:cover;border:0;" />
                    <p style="margin:0;padding:6px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);letter-spacing:0.08em;text-transform:uppercase;background:rgba(0,0,0,0.3);">Before</p>
                  </td>
                  <td width="50%" style="padding:0;">
                    <img src="https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&amp;fit=crop&amp;w=560&amp;q=80" width="260" alt="Scandinavian interior after AI redesign" style="display:block;width:100%;max-width:260px;height:160px;object-fit:cover;border:0;" />
                    <p style="margin:0;padding:6px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;color:#6EC6C6;letter-spacing:0.08em;text-transform:uppercase;background:rgba(0,0,0,0.3);">Scandinavian &#10022;</p>
                  </td>
                </tr>
              </table>

              <!-- Pair 3: Boho / warm -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;background-color:rgba(255,255,255,0.025);">
                <tr>
                  <td width="50%" style="padding:0;">
                    <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&amp;fit=crop&amp;w=560&amp;q=80" width="260" alt="Empty room before" style="display:block;width:100%;max-width:260px;height:160px;object-fit:cover;border:0;" />
                    <p style="margin:0;padding:6px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);letter-spacing:0.08em;text-transform:uppercase;background:rgba(0,0,0,0.3);">Before</p>
                  </td>
                  <td width="50%" style="padding:0;">
                    <img src="https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&amp;fit=crop&amp;w=560&amp;q=80" width="260" alt="Boho interior after AI redesign" style="display:block;width:100%;max-width:260px;height:160px;object-fit:cover;border:0;" />
                    <p style="margin:0;padding:6px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;color:#6EC6C6;letter-spacing:0.08em;text-transform:uppercase;background:rgba(0,0,0,0.3);">Boho &#10022;</p>
                  </td>
                </tr>
              </table>

              <p style="margin:14px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:rgba(255,255,255,0.55);text-align:center;">All three rendered in under 35 seconds. <a href="${cta}" style="color:#6EC6C6;text-decoration:none;font-weight:600;">Try yours &rarr;</a></p>
            </td>
          </tr>

          <!-- Quick start card -->
          <tr>
            <td style="padding:0 32px 36px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.07);border-radius:16px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase;">Quick start</p>
                    <ol style="margin:0;padding:0 0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.78);">
                      <li>Upload a photo of any room (empty rooms work too).</li>
                      <li>Pick a style — Japandi, Industrial, Boho, Modern Minimal&hellip;</li>
                      <li>Watch your space transform in 25&ndash;35 seconds.</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support note -->
          <tr>
            <td style="padding:0 32px 28px 32px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.5);">Render didn&rsquo;t quite land? Click <strong style="color:rgba(255,255,255,0.78);font-weight:600;">Retry at no cost</strong> on the result page &mdash; re-runs are free. Or just reply to this email and a real human will read it.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 30px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.4);">
                    <a href="${APP_URL}/Studio" style="color:rgba(255,255,255,0.55);text-decoration:none;">Studio</a>&nbsp;&middot;&nbsp;<a href="${APP_URL}/Help" style="color:rgba(255,255,255,0.55);text-decoration:none;">Help &amp; FAQ</a>&nbsp;&middot;&nbsp;<a href="${APP_URL}/Pricing" style="color:rgba(255,255,255,0.55);text-decoration:none;">Pricing</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:rgba(255,255,255,0.28);">
                    Sent because you signed up for Ambient Space. Reply to this email any time &mdash; we read everything.<br />
                    &copy; 2026 Ambient Space. <a href="${APP_URL}" style="color:rgba(255,255,255,0.4);text-decoration:none;">ambientspace.ai</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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

  // 1. Atomic claim — stamp `welcome_email_sent_at` BEFORE doing any work
  //    that has visible side effects (sending the email). Two browser tabs,
  //    a `getSession()` poll racing with the `onAuthStateChange`
  //    INITIAL_SESSION event, and a TOKEN_REFRESHED event 50 minutes later
  //    will all hit this endpoint concurrently. The previous "read → check
  //    null → send → stamp" flow let multiple of those calls slip past the
  //    null check and fire 3–5 emails. The CAS update fixes that: only the
  //    request whose UPDATE actually flips a NULL to a timestamp wins;
  //    everyone else gets back zero rows and bails.
  //
  //    We pull `full_name` in the same query so the email template knows the
  //    user's name without a second round-trip.
  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from('profiles')
    .update({ welcome_email_sent_at: claimedAt })
    .eq('id', user.id)
    .is('welcome_email_sent_at', null)
    .select('id, full_name')
    .maybeSingle();

  if (claimErr) {
    // eslint-disable-next-line no-console
    console.error('[welcomeEmail] claim update failed', claimErr);
    return json(res, 500, { error: 'Could not check welcome state' });
  }
  if (!claimed) {
    // Someone else already claimed the welcome slot — either a previous
    // session or a parallel call from another tab. Idempotent success.
    return json(res, 200, { sent: false, reason: 'already_sent' });
  }
  const profile = claimed;

  // 2. Rollback helper — if Resend fails after we've claimed, we must
  //    re-clear the column so a future retry can succeed. Otherwise the
  //    user gets zero welcome emails because we marked-as-sent before the
  //    actual send.
  const rollbackClaim = async () => {
    await supabaseAdmin
      .from('profiles')
      .update({ welcome_email_sent_at: null })
      .eq('id', user.id)
      .eq('welcome_email_sent_at', claimedAt);
  };

  // 3. Pull current credits + plan to tailor copy.
  const { data: credits } = await supabaseAdmin
    .from('user_credits')
    .select('credits_remaining, plan_type')
    .eq('user_id', user.id)
    .maybeSingle();

  const planType = credits?.plan_type || 'free';
  const creditCount = credits?.credits_remaining ?? 2;

  // 4. No Resend key? Stamp is already in place from the claim, so we just
  //    log and return — future calls hit the "already_sent" path naturally.
  if (!RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[welcomeEmail] RESEND_API_KEY missing — skipping send for', user.email);
    return json(res, 200, { sent: false, reason: 'resend_not_configured' });
  }

  // 5. Send.
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
        // Reply-To routes "Reply" in the user's mail client to the support
        // inbox even when From is a `noreply@` style address. Falls back to
        // the From address (Resend default) if SUPPORT_EMAIL isn't set.
        ...(SUPPORT_EMAIL ? { reply_to: SUPPORT_EMAIL } : {}),
        subject,
        text,
        html,
        // Light tags so we can filter in the Resend dashboard later.
        tags: [
          { name: 'category',  value: 'welcome' },
          { name: 'plan_type', value: planType },
        ],
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      // eslint-disable-next-line no-console
      console.error('[welcomeEmail] Resend rejected', r.status, body.slice(0, 300));
      // Roll back the claim so the next session can retry. Without this the
      // user gets ZERO welcome emails because the claim already stamped.
      await rollbackClaim();
      return json(res, 502, { error: 'Email provider rejected the send', detail: body.slice(0, 200) });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[welcomeEmail] Resend fetch threw', err);
    await rollbackClaim();
    return json(res, 502, { error: 'Email provider unreachable' });
  }

  // 6. Send succeeded. The claim already stamped welcome_email_sent_at; no
  //    second update needed.
  return json(res, 200, { sent: true, plan_type: planType, credits: creditCount });
}
