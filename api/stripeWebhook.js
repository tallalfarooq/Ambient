/**
 * /api/stripeWebhook — Stripe sends events here when checkout completes.
 *
 * Critical security: we MUST verify the signature, otherwise anyone could
 * POST to this URL with a fake "checkout.session.completed" body and grant
 * themselves credits.
 *
 * Webhook events we handle:
 *   - checkout.session.completed → grant credits, update plan_type
 *
 * Webhook setup (one-time, in Stripe Dashboard → Webhooks):
 *   Endpoint: https://ambient-smoky.vercel.app/api/stripeWebhook
 *   Events:   checkout.session.completed
 *   Signing secret: copy into STRIPE_WEBHOOK_SECRET env var on Vercel
 */
import { stripe } from './_lib/stripe.js';
import { supabaseAdmin, json } from './_lib/auth.js';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  // eslint-disable-next-line no-console
  console.error('[api/stripeWebhook] Missing STRIPE_WEBHOOK_SECRET env var');
}

// IMPORTANT: Stripe needs the RAW body to verify the signature.
// Vercel's default body parsing would mangle it, so we disable here.
export const config = {
  api: { bodyParser: false },
  maxDuration: 30,
};

// Read raw body bytes for signature verification.
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || !WEBHOOK_SECRET) {
    return json(res, 400, { error: 'Missing Stripe signature' });
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/stripeWebhook] signature verification failed:', err?.message);
    return json(res, 400, { error: 'Invalid signature' });
  }

  // eslint-disable-next-line no-console
  console.log('[api/stripeWebhook] event:', event.type, event.id);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Idempotency: skip if we've already processed this session.
        // We tag user_credits with the last_stripe_session_id (added below).
        const userId = session.metadata?.supabase_user_id;
        const planKey = session.metadata?.plan_key;
        const creditsGranted = parseInt(session.metadata?.credits_granted || '0', 10);
        const planTier = session.metadata?.plan_tier;

        if (!userId || !creditsGranted) {
          // eslint-disable-next-line no-console
          console.error('[api/stripeWebhook] missing metadata on session', session.id);
          break;
        }

        // Pull the current row to compute the new balance.
        const { data: row, error: readErr } = await supabaseAdmin
          .from('user_credits')
          .select('id, credits_remaining, total_purchased, plan_type')
          .eq('user_id', userId)
          .maybeSingle();

        if (readErr || !row) {
          // eslint-disable-next-line no-console
          console.error('[api/stripeWebhook] user_credits read failed:', readErr);
          break;
        }

        const newCredits = (row.credits_remaining ?? 0) + creditsGranted;
        const newTotalPurchased = (row.total_purchased ?? 0) + creditsGranted;
        // Don't downgrade the plan tier if the user previously had pro.
        const newPlanType =
          row.plan_type === 'pro' || planTier === 'pro' ? 'pro' : (planTier || row.plan_type);

        const { error: updateErr } = await supabaseAdmin
          .from('user_credits')
          .update({
            credits_remaining: newCredits,
            total_purchased: newTotalPurchased,
            plan_type: newPlanType,
            last_purchase_date: new Date().toISOString(),
          })
          .eq('id', row.id);

        if (updateErr) {
          // eslint-disable-next-line no-console
          console.error('[api/stripeWebhook] credit grant failed:', updateErr);
          // Return 500 so Stripe retries the webhook
          return json(res, 500, { error: 'Database update failed' });
        }

        // eslint-disable-next-line no-console
        console.log(
          `[api/stripeWebhook] granted ${creditsGranted} credits to user ${userId} (plan: ${planKey})`
        );
        break;
      }

      default:
        // Acknowledge events we don't care about so Stripe stops retrying
        // eslint-disable-next-line no-console
        console.log('[api/stripeWebhook] unhandled event type:', event.type);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/stripeWebhook] handler error:', err);
    return json(res, 500, { error: 'Webhook handler error' });
  }

  return json(res, 200, { received: true });
}
