/**
 * /api/createCheckout — create a Stripe Checkout Session for buying a credit pack.
 *
 * Body: { plan: 'starter' | 'pro' | 'studio' }
 * Returns: { url: <stripe checkout url> }
 *
 * The frontend redirects the browser to that URL. Stripe handles payment.
 * On success, Stripe sends a webhook to /api/stripeWebhook which credits
 * the user's user_credits row. Stripe also redirects the browser back to
 * `/Pricing?success=true` (success_url) or `/Pricing?canceled=true` (cancel_url).
 */
import { allow, getUserFromRequest, json, readJson, supabaseAdmin } from './_lib/auth.js';
import { stripe, PLANS, getPlanPriceId } from './_lib/stripe.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Not authenticated' });

  const { plan } = await readJson(req);
  const planConfig = PLANS[plan];
  if (!planConfig) {
    return json(res, 400, {
      error: 'Unknown plan',
      available_plans: Object.keys(PLANS),
    });
  }

  const priceId = getPlanPriceId(plan);
  if (!priceId) {
    return json(res, 500, {
      error: `Stripe Price ID not configured for plan "${plan}"`,
      hint: `Set ${planConfig.priceIdEnv} in Vercel env vars`,
    });
  }

  // Look up (or lazy-create) the user's stripe_customer_id.
  // Storing it on user_credits avoids creating a new Stripe customer per checkout.
  const { data: creditsRow } = await supabaseAdmin
    .from('user_credits')
    .select('id, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let stripeCustomerId = creditsRow?.stripe_customer_id || null;
  if (!stripeCustomerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;
      if (creditsRow?.id) {
        await supabaseAdmin
          .from('user_credits')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', creditsRow.id);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[api/createCheckout] customer create failed:', err);
      return json(res, 502, {
        error: 'Could not create Stripe customer',
        detail: err?.message,
      });
    }
  }

  // Build success/cancel URLs from the request origin so it works on
  // localhost, ambient-smoky.vercel.app, and ambientspace.ai alike.
  const origin =
    req.headers.origin ||
    `https://${req.headers.host || 'ambientspace.ai'}`;
  const successUrl = `${origin}/Pricing?success=true&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/Pricing?canceled=true`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // one-off purchase, not subscription
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Critical: metadata flows through to webhook so we know who bought what
      metadata: {
        supabase_user_id: user.id,
        plan_key: plan,
        credits_granted: String(planConfig.credits),
        plan_tier: planConfig.planTier,
      },
      payment_intent_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_key: plan,
        },
      },
      allow_promotion_codes: true,
    });

    return json(res, 200, {
      url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/createCheckout] session create failed:', err);
    return json(res, 502, {
      error: 'Could not create checkout session',
      detail: err?.message,
    });
  }
}
