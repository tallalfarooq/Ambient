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
    fal:       present(process.env.FAL_KEY),
    replicate: present(process.env.REPLICATE_API_TOKEN),
    nvidia:    present(process.env.NVIDIA_API_KEY),
    gemini:    present(process.env.GEMINI_API_KEY),
    stripe:    present(process.env.STRIPE_SECRET_KEY),
    redis:     present(process.env.UPSTASH_REDIS_REST_URL) === 'configured'
      && present(process.env.UPSTASH_REDIS_REST_TOKEN) === 'configured'
      ? 'configured' : 'missing',
    resend:    present(process.env.RESEND_API_KEY),
    // Day 18 — local ComfyUI via ngrok. "configured" iff LOCAL_SDXL_URL is set.
    local:     present(process.env.LOCAL_SDXL_URL),
  };

  // Day 16 — "OK" requires Supabase + Gemini + WHICHEVER image provider is
  // currently active. fal / replicate / nvidia / local are interchangeable;
  // only the active one needs to be configured.
  const provider = (process.env.IMAGE_PROVIDER || 'huggingface').toLowerCase();
  const providerKey =
    provider === 'replicate' ? 'replicate'
    : provider === 'nvidia'  ? 'nvidia'
    : provider === 'local'   ? 'local'
    : 'fal';
  const critical = ['supabase', 'gemini', providerKey];
  const ok = critical.every((k) => services[k] === 'configured');

  res.status(ok ? 200 : 503).json({
    ok,
    timestamp: new Date().toISOString(),
    services,
    image_provider: (process.env.IMAGE_PROVIDER || 'huggingface').toLowerCase(),
    pipeline: {
      // Day 16 — pipeline reflects the ACTIVE provider's default model.
      fal_model: process.env.FAL_MODEL || 'fal-ai/fast-sdxl/image-to-image',
      replicate_model: process.env.REPLICATE_MODEL || 'stability-ai/sdxl',
      nvidia_model: process.env.NVIDIA_MODEL || 'qwen/qwen-image-edit',
      mode: 'sdxl-img2img',
      preservation: 'strength-clamp + negative-prompt + verbose-prompt',
    },
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
  });
}
