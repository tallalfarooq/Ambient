/**
 * /api/health — public service health check.
 *
 * Day 11. Quick readiness probe for ambientspace.ai. Returns a JSON object
 * describing whether the dependencies the product needs are wired up:
 *
 *   {
 *     ok: true,
 *     timestamp: "...",
 *     services: {
 *       supabase: "configured",
 *       fal:      "configured",
 *       gemini:   "configured",
 *       stripe:   "configured",
 *       redis:    "configured" | "missing"
 *     },
 *     image_provider: "fal" | "huggingface" | "together",
 *     pipeline:       { use_inpainting: false, kontext_model: "fal-ai/flux-pro/kontext" }
 *   }
 *
 * No DB calls, no external HTTP — just env-var presence so the route stays
 * cheap and unauthenticated. If you want a deeper probe (Supabase ping, fal
 * model list), add it as a `?deep=1` mode behind a header secret.
 *
 * Used by:
 *   - StatusPage / a future `/status` route
 *   - Vercel uptime monitor
 *   - Manual debugging ("does prod have my GEMINI_API_KEY set?")
 */
export const config = { maxDuration: 10 };

function setCors(res) {
  // Public probe — open CORS so dashboards and uptime tools can hit it.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
}

const present = (v) => (typeof v === 'string' && v.length > 0 ? 'configured' : 'missing');

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const services = {
    supabase: present(process.env.SUPABASE_SERVICE_ROLE_KEY) === 'configured'
      && present(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) === 'configured'
      ? 'configured' : 'missing',
    fal:    present(process.env.FAL_KEY),
    gemini: present(process.env.GEMINI_API_KEY),
    stripe: present(process.env.STRIPE_SECRET_KEY),
    redis:  present(process.env.UPSTASH_REDIS_REST_URL) === 'configured'
      && present(process.env.UPSTASH_REDIS_REST_TOKEN) === 'configured'
      ? 'configured' : 'missing',
    resend: present(process.env.RESEND_API_KEY),
  };

  // The product is "OK" only if the three things a render needs are wired.
  // Stripe / Resend / Redis missing is degraded but not down — record on
  // the response, but still return ok=true so the uptime probe doesn't
  // page the on-call for a missing optional integration.
  const critical = ['supabase', 'fal', 'gemini'];
  const ok = critical.every((k) => services[k] === 'configured');

  res.status(ok ? 200 : 503).json({
    ok,
    timestamp: new Date().toISOString(),
    services,
    image_provider: (process.env.IMAGE_PROVIDER || 'huggingface').toLowerCase(),
    pipeline: {
      // Day 12 — locked to base Kontext. The USE_INPAINTING env var is no
      // longer read by /api/generate; reflected here as a hint to ops that
      // any value set on the dashboard is dead config.
      kontext_model: 'fal-ai/flux-pro/kontext',
      mode: 'prompt-only',
    },
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
  });
}
