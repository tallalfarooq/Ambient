/**
 * Shared Stripe client + plan catalog.
 *
 * The Price IDs come from Vercel env vars; the credit amount per pack is
 * hardcoded here. The server is the source of truth for "$X = N credits" —
 * never accept a credit count from the client.
 */
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  // eslint-disable-next-line no-console
  console.error('[stripe] Missing STRIPE_SECRET_KEY env var');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY ?? 'sk_missing', {
  apiVersion: '2024-09-30.acacia',
});

/**
 * Plan catalog. Keyed by short slug (used in client-side calls from Pricing.jsx).
 * Each plan maps to:
 *   - the Price ID env var (set in Vercel)
 *   - how many credits to grant when purchase completes
 *   - a human label for receipts/UI
 *
 * IMPORTANT: keys here MUST match the `id` values in Pricing.jsx PLANS array.
 * The `free` plan never reaches this code (the UI button is disabled or routes
 * to /login), so it's intentionally absent.
 */
export const PLANS = {
  basic: {
    label: 'Basic Pack',
    priceIdEnv: 'STRIPE_PRICE_BASIC',
    credits: 20,
    planTier: 'basic',
  },
  pro: {
    label: 'Pro Pack',
    priceIdEnv: 'STRIPE_PRICE_PRO',
    credits: 100,
    planTier: 'pro',
  },
};

export function getPlanPriceId(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return null;
  return process.env[plan.priceIdEnv] || null;
}
