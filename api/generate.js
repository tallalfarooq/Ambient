/**
 * /api/generate — fal.ai room redesign with credit-gated access.
 *
 * Flow:
 *   1. Authenticate the caller via their Supabase JWT.
 *   2. Atomically debit 1 credit (CAS so concurrent requests can't double-spend).
 *   3. Call fal.ai with the prompt + room image (img2img).
 *   4. Download the generated image, re-upload to our Supabase Storage `renders`
 *      bucket so we own the URL (fal.ai URLs expire).
 *   5. Refund the credit if anything in steps 3-4 failed.
 *   6. Return { url, credits_remaining }.
 *
 * Body (Base44-compatible, all optional unless noted):
 *   {
 *     prompt: string,                  // REQUIRED — full style+furniture prompt
 *     image_url: string,               // REQUIRED for img2img (room mode)
 *     strength?: number,               // 0..1, defaults 0.6 (img2img only)
 *     guidance_scale?: number,         // defaults 3.5
 *     image_size?: string,             // 'landscape_4_3' (default), 'square_hd', etc.
 *     num_inference_steps?: number,    // defaults 28
 *     mode?: 'redesign' | 'furnish',   // affects strength upper bound
 *     model?: string,                  // override the fal model id
 *     design_id?: string               // optional, for record linkage
 *   }
 */
import { fal } from '@fal-ai/client';
import { allow, getUserFromRequest, json, readJson, supabaseAdmin } from './_lib/auth.js';

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  // eslint-disable-next-line no-console
  console.error('[api/generate] Missing FAL_KEY env var');
}
fal.config({ credentials: FAL_KEY });

// Default to flux-dev img2img — fast, good interior results, ~$0.025/image.
// Override per-request via body.model for experimentation.
const DEFAULT_MODEL = 'fal-ai/flux/dev/image-to-image';
const CREDITS_PER_GENERATION = 1;

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Not authenticated' });

  const body = await readJson(req);
  const {
    prompt,
    image_url,
    strength,
    guidance_scale,
    image_size,
    num_inference_steps,
    mode,
    model,
    design_id,
  } = body;

  if (!prompt || typeof prompt !== 'string') {
    return json(res, 400, { error: 'Missing or invalid `prompt`' });
  }
  if (!image_url || typeof image_url !== 'string') {
    return json(res, 400, { error: 'Missing or invalid `image_url`' });
  }

  // 1. Atomic credit debit with CAS (compare-and-swap).
  const { data: credits, error: creditsErr } = await supabaseAdmin
    .from('user_credits')
    .select('id, credits_remaining, plan_type')
    .eq('user_id', user.id)
    .maybeSingle();

  if (creditsErr) {
    // eslint-disable-next-line no-console
    console.error('[api/generate] credits read failed:', creditsErr);
    return json(res, 500, { error: 'Could not read credit balance' });
  }
  if (!credits) {
    // Should not happen — signup trigger creates this row. Heal it.
    const { data: created, error: insertErr } = await supabaseAdmin
      .from('user_credits')
      .insert({ user_id: user.id, credits_remaining: 2, plan_type: 'free' })
      .select()
      .single();
    if (insertErr) {
      return json(res, 500, { error: 'Could not initialize credits' });
    }
    credits.id = created.id;
    credits.credits_remaining = created.credits_remaining;
    credits.plan_type = created.plan_type;
  }

  if (credits.credits_remaining < CREDITS_PER_GENERATION) {
    return json(res, 402, {
      error: 'Out of credits',
      credits_remaining: credits.credits_remaining,
      plan_type: credits.plan_type,
    });
  }

  const newBalance = credits.credits_remaining - CREDITS_PER_GENERATION;
  const { data: debited, error: debitErr } = await supabaseAdmin
    .from('user_credits')
    .update({ credits_remaining: newBalance })
    .eq('id', credits.id)
    .eq('credits_remaining', credits.credits_remaining) // CAS guard against concurrent debits
    .select()
    .maybeSingle();

  if (debitErr || !debited) {
    return json(res, 409, {
      error: 'Could not debit credit, please retry',
      detail: debitErr?.message,
    });
  }

  // Helper to refund on downstream failure.
  const refund = async (reason) => {
    // eslint-disable-next-line no-console
    console.warn('[api/generate] refunding credit:', reason);
    await supabaseAdmin
      .from('user_credits')
      .update({ credits_remaining: credits.credits_remaining })
      .eq('id', credits.id);
  };

  // Strength clamp — 'furnish' (empty room) gets a wider range than 'redesign'.
  const isFurnish = mode === 'furnish';
  const safeStrength = clamp(
    typeof strength === 'number' ? strength : isFurnish ? 0.85 : 0.6,
    0.2,
    isFurnish ? 0.95 : 0.8
  );

  // 2. Call fal.ai.
  let falResult;
  try {
    falResult = await fal.subscribe(model || DEFAULT_MODEL, {
      input: {
        prompt,
        image_url,
        strength: safeStrength,
        guidance_scale: typeof guidance_scale === 'number' ? guidance_scale : 3.5,
        num_inference_steps:
          typeof num_inference_steps === 'number' ? num_inference_steps : 28,
        image_size: image_size || 'landscape_4_3',
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: false,
    });
  } catch (err) {
    await refund('fal.ai call failed');
    // eslint-disable-next-line no-console
    console.error('[api/generate] fal.ai error:', err);
    return json(res, 502, {
      error: 'Image generation failed',
      detail: err?.message || String(err),
    });
  }

  const generatedFalUrl = falResult?.data?.images?.[0]?.url;
  if (!generatedFalUrl) {
    await refund('no image in fal.ai response');
    return json(res, 502, { error: 'No image returned' });
  }

  // 3. Mirror the image into our Supabase Storage so the URL doesn't expire.
  let publicUrl;
  try {
    const fetchRes = await fetch(generatedFalUrl);
    if (!fetchRes.ok) throw new Error(`Download failed (${fetchRes.status})`);
    const arrayBuf = await fetchRes.arrayBuffer();
    const objectKey = `${user.id}/render-${Date.now()}.jpg`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('renders')
      .upload(objectKey, Buffer.from(arrayBuf), {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });
    if (uploadErr) throw uploadErr;

    const { data: pub } = supabaseAdmin.storage.from('renders').getPublicUrl(objectKey);
    publicUrl = pub.publicUrl;
  } catch (err) {
    await refund('storage upload failed');
    // eslint-disable-next-line no-console
    console.error('[api/generate] storage error:', err);
    return json(res, 500, {
      error: 'Could not save render',
      detail: err?.message || String(err),
    });
  }

  // 4. Optionally update the room_designs row if a design_id was passed.
  if (design_id && typeof design_id === 'string') {
    await supabaseAdmin
      .from('room_designs')
      .update({ generated_render_url: publicUrl, status: 'ready' })
      .eq('id', design_id)
      .eq('created_by', user.id);
  }

  return json(res, 200, {
    url: publicUrl,
    generated_url: publicUrl,
    credits_remaining: newBalance,
    fal_request_id: falResult?.requestId,
  });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
