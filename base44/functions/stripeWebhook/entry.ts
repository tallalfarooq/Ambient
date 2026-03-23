import Stripe from 'npm:stripe';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = 'Ambient Space <hello@ambientspace.ai>';
const APP_URL = 'https://ambientspace.ai';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;

  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userEmail = session.metadata.user_email;
    const appId = session.metadata.base44_app_id;

    // Create Base44 client with app ID from session metadata
    const headers = new Headers(req.headers);
    headers.set('Base44-App-Id', appId);
    const modifiedReq = new Request(req.url, {
      method: req.method,
      headers: headers,
    });
    const base44 = createClientFromRequest(modifiedReq);

    try {
      const planType = session.metadata.plan_type;
      const creditsToAdd = parseInt(session.metadata.credits || '0');

      if (!planType || !creditsToAdd) {
        console.error('Missing plan metadata');
        return Response.json({ error: 'Missing plan metadata' }, { status: 400 });
      }

      const existingCredits = await base44.asServiceRole.entities.UserCredits.filter({
        user_email: userEmail
      });

      if (existingCredits.length > 0) {
        const current = existingCredits[0];
        await base44.asServiceRole.entities.UserCredits.update(current.id, {
          credits_remaining: current.credits_remaining + creditsToAdd,
          plan_type: planType,
          total_purchased: current.total_purchased + creditsToAdd,
          last_purchase_date: new Date().toISOString(),
        });
      } else {
        await base44.asServiceRole.entities.UserCredits.create({
          user_email: userEmail,
          credits_remaining: creditsToAdd,
          plan_type: planType,
          total_purchased: creditsToAdd,
          last_purchase_date: new Date().toISOString(),
        });
      }

      console.log(`Added ${creditsToAdd} credits (${planType} plan) for ${userEmail}`);

      // Send payment confirmation email
      await sendPaymentConfirmationEmail(userEmail, planType, creditsToAdd);
    } catch (error) {
      console.error('Error updating credits:', error);
      return Response.json({ error: 'Failed to update credits' }, { status: 500 });
    }
  }

  return Response.json({ received: true });
});

async function sendPaymentConfirmationEmail(email, planType, credits) {
  if (!RESEND_API_KEY) { console.error('RESEND_API_KEY missing'); return; }

  const planNames = { basic: 'Basic', pro: 'Pro' };
  const planName = planNames[planType] || planType;
  const generations = Math.floor(credits / 2);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: `Payment confirmed — welcome to ${planName} ✦`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Payment Confirmed</title></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:48px 20px 40px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:36px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;">Ambient&nbsp;<span style="color:#6EC6C6;">Space</span></span>
        </td></tr>
        <tr>
          <td style="background:linear-gradient(135deg,#1B8FA0 0%,#C9963A 100%);border-radius:24px;padding:44px 40px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.65);">Payment confirmed</p>
            <h1 style="margin:0 0 14px;font-size:30px;font-weight:900;color:#ffffff;line-height:1.2;">You're on ${planName} ✦</h1>
            <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.85);line-height:1.7;">Your credits are ready. Time to design something beautiful.</p>
            <a href="${APP_URL}/Studio" style="display:inline-block;background:#ffffff;color:#0A0A0B;font-size:15px;font-weight:800;padding:15px 36px;border-radius:14px;text-decoration:none;">Start designing →</a>
          </td>
        </tr>
        <tr><td style="padding:20px 0 4px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background:#111114;border:1px solid rgba(27,143,160,0.25);border-radius:16px;padding:24px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.3);">What you got</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:10px;"><span style="font-size:14px;color:rgba(255,255,255,0.5);">Plan</span></td>
                  <td align="right"><span style="font-size:14px;font-weight:700;color:#ffffff;">${planName}</span></td>
                </tr>
                <tr>
                  <td style="padding-bottom:10px;"><span style="font-size:14px;color:rgba(255,255,255,0.5);">Credits added</span></td>
                  <td align="right"><span style="font-size:14px;font-weight:700;color:#6EC6C6;">${credits}</span></td>
                </tr>
                <tr>
                  <td><span style="font-size:14px;color:rgba(255,255,255,0.5);">Full generations</span></td>
                  <td align="right"><span style="font-size:14px;font-weight:700;color:#C9963A;">${generations}</span></td>
                </tr>
              </table>
            </td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="padding:28px 0 0;">
          <a href="${APP_URL}/Studio" style="display:inline-block;background:linear-gradient(135deg,#1B8FA0,#C9963A);color:#ffffff;font-size:15px;font-weight:800;padding:15px 44px;border-radius:14px;text-decoration:none;">Open Studio</a>
        </td></tr>
        <tr><td align="center" style="padding:36px 0 0;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.18);">© 2026 AmbientSpace.ai · <a href="mailto:support@ambientspace.ai" style="color:rgba(255,255,255,0.35);text-decoration:none;">support@ambientspace.ai</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[stripeWebhook] Email send failed:', err);
  } else {
    console.log('[stripeWebhook] Confirmation email sent to', email);
  }
}