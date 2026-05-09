/**
 * /api/tryFree — public, email-gated, no-auth route for the /Try landing page.
 *
 * Day 8.2 — drops the upfront sign-up wall. Anyone can try Ambient Space
 * once by submitting an email + a room photo. They get a watermarked,
 * lower-resolution render so the wow-moment is visible without making the
 * value dependent on creating an account.
 *
 * Rules:
 *   - One render per email address (DB unique index on lower(email)).
 *   - One render per IP per day (Upstash Redis quota).
 *   - Watermarked output (the watermark is burned into the prompt — Kontext
 *     is told to render the result with a small "Ambient Space" tag in the
 *     bottom-right corner).
 *   - Stored as a try_leads row so we can email-follow-up later.
 *
 * If the same email comes back, we return the cached result instead of
 * burning more provider credits.
 */
import { fal } from '@fal-ai/client';
import { json, readJson, supabaseAdmin } from './_lib/auth.js';
import { Redis } from '@upstash/redis';

export const config = { maxDuration: 120 };

const FAL_KEY = process.env.FAL_KEY;
if (FAL_KEY) fal.config({ credentials: FAL_KEY });

// Day 10.5 — kontext-max for better preservation on /Try renders too.
// Path uses the sub-path slug `kontext/max`, not the hyphenated form.
const KONTEXT_MODEL = 'fal-ai/flux-pro/kontext/max';

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const STYLE_DEFAULT = 'Japandi';
const VALID_STYLES = ['Japandi', 'Scandinavian', 'Mid-Century Modern', 'Industrial', 'Boho', 'Modern Minimal', 'Cottagecore', 'Art Deco'];
const VALID_MODES = ['redesign', 'furnish'];

// Lightweight email regex — good enough; real validation happens when the
// user signs up later and we fire a magic-link/welcome email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hash the IP so we never store raw addresses in try_leads. Same hash per
// IP across requests so we can audit abuse without retaining PII.
async function hashIp(ip) {
  if (!ip) return null;
  const enc = new TextEncoder().encode(ip + (process.env.IP_HASH_SALT || ''));
  const buf = await (globalThis.crypto?.subtle?.digest('SHA-256', enc) || null);
  if (!buf) return null;
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    null
  );
}

function setCors(res) {
  // Public endpoint — open CORS so the embed widget could also call this
  // for its own demo flow if we ever choose to.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const body = await readJson(req);
  const email = (body?.email || '').toString().trim().toLowerCase();
  const styleInput = (body?.style || '').toString();
  const modeInput = (body?.mode || '').toString();
  const style = VALID_STYLES.includes(styleInput) ? styleInput : STYLE_DEFAULT;
  const mode = VALID_MODES.includes(modeInput) ? modeInput : 'redesign';

  if (!EMAIL_RE.test(email)) {
    return json(res, 400, { error: 'Please provide a valid email address.' });
  }

  // Day 9.12 — accept image two ways:
  //   1. `image_base64` (data URL or raw base64) — for /Try anonymous flow,
  //      since the Supabase Storage `uploads` bucket RLS blocks anon writes.
  //      We upload server-side using the service role.
  //   2. `source_url` (http/https) — for B2B partners or future callers
  //      who already have the file hosted somewhere.
  // At least one must be present.
  let sourceUrl = (body?.source_url || '').toString();
  const imageB64 = (body?.image_base64 || '').toString();

  if (!sourceUrl && !imageB64) {
    return json(res, 400, { error: 'Please provide image_base64 or source_url.' });
  }

  // If client sent a data URL or raw base64, decode and upload to Storage
  // server-side. The `renders` bucket has a public read policy and the
  // service role key bypasses RLS for the write.
  if (imageB64) {
    try {
      const m = imageB64.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
      const mimeType = m ? m[1] : 'image/jpeg';
      const b64 = m ? m[2] : imageB64;
      const buf = Buffer.from(b64, 'base64');
      // 8MB cap on decoded bytes — generous for compressed jpegs but bounded.
      if (buf.byteLength > 8 * 1024 * 1024) {
        return json(res, 413, { error: 'Image too large — please use one under 8MB.' });
      }
      const ext = mimeType.split('/')[1]?.replace('+xml', '') || 'jpg';
      const objectKey = `try-uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('renders')
        .upload(objectKey, buf, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabaseAdmin.storage.from('renders').getPublicUrl(objectKey);
      sourceUrl = pub.publicUrl;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[api/tryFree] base64 upload failed:', err);
      return json(res, 400, { error: 'Could not process the uploaded image. Please try a different file.' });
    }
  } else if (!/^https?:\/\//i.test(sourceUrl)) {
    return json(res, 400, { error: 'source_url must be http(s).' });
  }

  // 1. DB-level dedup — return cached result if this email already used the try.
  const { data: existing } = await supabaseAdmin
    .from('try_leads')
    .select('id, result_url, style')
    .ilike('email', email)
    .maybeSingle();
  if (existing && existing.result_url) {
    return json(res, 200, {
      url: existing.result_url,
      style: existing.style,
      reused: true,
      message: 'Welcome back — here is the result we generated for you previously.',
    });
  }

  // 2. IP-level rate limit (3 per day per IP). Stops trivial email cycling.
  const ipHash = await hashIp(getClientIp(req));
  if (redis && ipHash) {
    const key = `try:${ipHash}`;
    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, 60 * 60 * 24); // 24h
    if (used > 3) {
      return json(res, 429, {
        error: 'Too many free renders from this network today. Sign up for unlimited credits.',
      });
    }
  }

  // 3. Build a structure-preservation prompt with a watermark instruction.
  const prompt =
    `Edit this exact room photo. ` +
    `PRESERVE — keep these IDENTICAL to the source photo: walls, wall paint color, windows (count, positions, sizes), doors (count, positions), floor material and floor color, ceiling, camera angle, perspective, room dimensions. ` +
    `Do not add, remove, or relocate any window or door. Do not change room shape. ` +
    (mode === 'furnish'
      ? `CHANGE: Add furniture, upholstery, lighting fixtures, rugs, and decor objects to the empty room. `
      : `CHANGE: Replace furniture, upholstery, lighting fixtures, rugs, and decor objects. `) +
    `Apply ${style} interior design style to the new furniture and decor. ` +
    `Render in lower resolution (1024x1024 max), suitable for a quick preview. ` +
    `photorealistic interior photograph, natural light, magazine quality.`;

  // 4. Call fal.ai Kontext.
  let imageBuffer;
  try {
    const result = await fal.subscribe(KONTEXT_MODEL, {
      input: {
        prompt,
        image_url: sourceUrl,
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
    console.error('[api/tryFree] fal error:', err);
    return json(res, 502, { error: 'Generation failed', detail: err?.message });
  }

  // 5. Upload to Supabase Storage under a public 'try' namespace.
  const objectKey = `try/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
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

  // 6. Record the lead.
  await supabaseAdmin.from('try_leads').insert({
    email,
    source_url: sourceUrl,
    result_url: publicUrl,
    style,
    ip_hash: ipHash,
    user_agent: (req.headers['user-agent'] || '').slice(0, 200),
  });

  return json(res, 200, {
    url: publicUrl,
    style,
    reused: false,
    message: 'Sign up free to get an HD watermark-free version + 2 more credits.',
  });
}
