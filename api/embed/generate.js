/**
 * /api/embed/generate — B2B embed widget API.
 *
 * Day 7.5 — the consumer Studio uses /api/generate with a Supabase JWT.
 * Partners (real-estate platforms, retailers) instead authenticate with an
 * API key in the X-Ambient-Key header. This route:
 *
 *   1. Validates the API key against partner_keys.
 *   2. Checks the partner's monthly_quota is not exhausted.
 *   3. Calls fal.ai Kontext with the provided source_url + brief.
 *   4. Mirrors the result into Supabase Storage (partner-scoped path).
 *   5. Logs a row in partner_renders and increments renders_used.
 *
 * Returns the public URL + remaining quota. Designed to be called from a
 * static <script> on a partner's listing page (see /public/embed.js).
 *
 * CORS is permissive on this route ONLY — partners can call it from any
 * origin, since the API key is the trust boundary. We still record the
 * Origin header for abuse tracing.
 *
 * NOT yet shipped to production-ready: this is the skeleton. To go live:
 *   - Issue real partner_keys rows manually.
 *   - Hash keys at rest.
 *   - Add per-IP rate limiting on top of per-key.
 *   - Build a /partner-dashboard page so partners can see their usage.
 */
import { fal } from '@fal-ai/client';
import { json, readJson, supabaseAdmin } from '../_lib/auth.js';

export const config = { maxDuration: 120 };

const FAL_KEY = process.env.FAL_KEY;
if (FAL_KEY) fal.config({ credentials: FAL_KEY });

const KONTEXT_MODEL = 'fal-ai/flux-pro/kontext';

// CORS preflight — must allow * for partner sites we don't pre-register.
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Ambient-Key');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  // 1. Validate API key.
  const apiKey =
    req.headers['x-ambient-key'] ||
    req.headers['X-Ambient-Key'] ||
    req.headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string') {
    return json(res, 401, { error: 'Missing X-Ambient-Key header' });
  }

  const { data: partner, error: partnerErr } = await supabaseAdmin
    .from('partner_keys')
    .select('id, partner_name, monthly_quota, renders_used, per_render_usd, is_active')
    .eq('key', apiKey)
    .maybeSingle();

  if (partnerErr || !partner) {
    return json(res, 401, { error: 'Invalid API key' });
  }
  if (!partner.is_active) {
    return json(res, 403, { error: 'API key disabled' });
  }
  if (partner.renders_used >= partner.monthly_quota) {
    return json(res, 429, {
      error: 'Monthly quota exhausted',
      monthly_quota: partner.monthly_quota,
    });
  }

  // 2. Read input.
  const body = await readJson(req);
  const { source_url, style, brief } = body || {};
  if (!source_url || typeof source_url !== 'string') {
    return json(res, 400, { error: 'Missing source_url' });
  }
  const chosenStyle = (style || 'modern').toString().slice(0, 40);
  const chosenBrief = (brief || '').toString().slice(0, 300);

  // 3. Build a structure-preservation prompt — same shape as the consumer
  //    flow so partners get the same quality. No user fine-tune fields here
  //    (yet); embed v1 is full restyle only.
  const prompt =
    `Edit this exact room photo. ` +
    `PRESERVE — keep these IDENTICAL to the source photo: walls, wall paint color, windows (count, positions, sizes), doors (count, positions), floor material and floor color, ceiling, camera angle, perspective, room dimensions. ` +
    `Do not add, remove, or relocate any window or door. Do not change room shape. ` +
    `CHANGE: Replace furniture, upholstery, lighting fixtures, rugs, and decor objects. ` +
    `Apply ${chosenStyle} interior design style to the new furniture and decor. ` +
    (chosenBrief ? `Partner brief: ${chosenBrief}. ` : '') +
    `photorealistic interior photograph, natural light, magazine quality.`;

  // 4. Call fal.ai Kontext.
  let imageBuffer;
  try {
    const result = await fal.subscribe(KONTEXT_MODEL, {
      input: {
        prompt,
        image_url: source_url,
        guidance_scale: 6,
        num_images: 1,
        output_format: 'jpeg',
        safety_tolerance: '2',
      },
      logs: false,
    });
    const url = result?.data?.images?.[0]?.url;
    if (!url) throw new Error('Kontext returned no image');
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Download failed (${r.status})`);
    imageBuffer = Buffer.from(await r.arrayBuffer());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/embed/generate] fal error:', err);
    return json(res, 502, { error: 'Generation failed', detail: err?.message });
  }

  // 5. Mirror to Supabase Storage under partner-scoped path.
  const objectKey = `embed/${partner.id}/${Date.now()}.jpg`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('renders')
    .upload(objectKey, imageBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });
  if (uploadErr) {
    return json(res, 500, { error: 'Storage upload failed', detail: uploadErr.message });
  }
  const { data: pub } = supabaseAdmin.storage.from('renders').getPublicUrl(objectKey);
  const publicUrl = pub.publicUrl;

  // 6. Log + increment quota.
  await supabaseAdmin.from('partner_renders').insert({
    partner_id: partner.id,
    source_url,
    result_url: publicUrl,
    prompt_brief: chosenBrief,
    cost_usd: partner.per_render_usd,
  });
  await supabaseAdmin
    .from('partner_keys')
    .update({ renders_used: partner.renders_used + 1 })
    .eq('id', partner.id);

  return json(res, 200, {
    url: publicUrl,
    style: chosenStyle,
    quota_remaining: partner.monthly_quota - partner.renders_used - 1,
  });
}
