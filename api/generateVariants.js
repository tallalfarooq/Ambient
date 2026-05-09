/**
 * /api/generateVariants — fan out 4 parallel Kontext generations.
 *
 * Day 8.4 — "Compare 4 styles side-by-side". One click, 8 credits, 4
 * thumbnails. Drives Pro upgrades (Basic only has 10 generations) and
 * eliminates the "I picked the wrong style" regret loop.
 *
 * Flow:
 *   1. Authenticate + check credits (need 8).
 *   2. Atomically debit 8 credits.
 *   3. Fan out 4 fal.subscribe calls in parallel, one per style.
 *   4. Mirror each successful image into Supabase Storage.
 *   5. Insert 4 room_designs rows linked by a single variant_group_id.
 *   6. Refund per-failed-variant on partial failure (rare).
 *
 * Returns { variant_group_id, variants: [{id, style, url}, ...] }.
 *
 * Each variant is a real room_designs row so it can be saved/shared/iterated
 * independently. The variant_group_id lets the UI render them as a 2x2 grid.
 */
import { fal } from '@fal-ai/client';
import { allow, getUserFromRequest, json, readJson, supabaseAdmin } from './_lib/auth.js';
import { checkRateLimit } from './_lib/ratelimit.js';

export const config = { maxDuration: 300 }; // four 60s generations could overlap

const FAL_KEY = process.env.FAL_KEY;
if (FAL_KEY) fal.config({ credentials: FAL_KEY });

// Day 10.6 — back to base Kontext after kontext/max produced LESS faithful
// preservation in side-by-side testing (faster but worse on wall colors).
// Variants use the prompt-based path; the new mask-based pipeline is wired
// into /api/generate only for now (see api/_lib/inpaint.js).
const KONTEXT_MODEL = 'fal-ai/flux-pro/kontext';

const VALID_STYLES = ['Japandi', 'Scandinavian', 'Mid-Century Modern', 'Industrial', 'Boho', 'Modern Minimal', 'Cottagecore', 'Art Deco'];
const CREDITS_PER_VARIANT = 2;
const NUM_VARIANTS = 4;

function buildVariantPrompt(style, room, mode) {
  const verb = mode === 'furnish' ? 'Add furniture, upholstery, lighting fixtures, rugs, and decor objects to the empty room' : 'Replace furniture, upholstery, lighting fixtures, rugs, and decor objects';
  return (
    `Edit this exact ${room || 'room'} photo. ` +
    `PRESERVE — keep these IDENTICAL to the source photo: walls, wall paint color, windows (count, positions, sizes), doors (count, positions), floor material and floor color, ceiling, camera angle, perspective, room dimensions. ` +
    `Do not add, remove, or relocate any window or door. ` +
    `CHANGE: ${verb}. Apply ${style} interior design style to the new furniture and decor. ` +
    `photorealistic interior photograph, natural light, magazine quality.`
  );
}

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Not authenticated' });

  // Same per-user rate limit family as /api/generate. A variant call counts
  // as ONE rate-limit hit — not four — since all four generations are tied
  // to a single user action.
  const rl = await checkRateLimit('generate', user.id);
  if (!rl.success) {
    return json(res, 429, { error: rl.message, retry_after_seconds: rl.retryAfter, limit: rl.limit });
  }

  const body = await readJson(req);
  const { image_url, room_type, mode, styles } = body || {};
  if (!image_url || typeof image_url !== 'string') {
    return json(res, 400, { error: 'Missing or invalid image_url' });
  }

  // Pick 4 styles. If the client supplied a list, validate + dedupe; else
  // default to a curated quartet that maximises visual diversity.
  let chosenStyles;
  if (Array.isArray(styles) && styles.length >= 1) {
    const filtered = [...new Set(styles)].filter((s) => VALID_STYLES.includes(s));
    chosenStyles = filtered.slice(0, NUM_VARIANTS);
  }
  if (!chosenStyles || chosenStyles.length === 0) {
    chosenStyles = ['Japandi', 'Industrial', 'Boho', 'Mid-Century Modern'];
  }
  while (chosenStyles.length < NUM_VARIANTS) {
    const next = VALID_STYLES.find((s) => !chosenStyles.includes(s));
    if (!next) break;
    chosenStyles.push(next);
  }

  // Atomic credit debit (CAS) for ALL variants up-front. Rare partial
  // failures get refunded individually below.
  const totalCreditsNeeded = chosenStyles.length * CREDITS_PER_VARIANT;
  const { data: credits, error: creditsErr } = await supabaseAdmin
    .from('user_credits')
    .select('id, credits_remaining, plan_type')
    .eq('user_id', user.id)
    .maybeSingle();
  if (creditsErr) return json(res, 500, { error: 'Could not read credit balance' });
  if (!credits) return json(res, 402, { error: 'No credit row — refresh and retry' });
  if (credits.credits_remaining < totalCreditsNeeded) {
    return json(res, 402, {
      error: `Need ${totalCreditsNeeded} credits to compare ${chosenStyles.length} styles. You have ${credits.credits_remaining}.`,
      credits_remaining: credits.credits_remaining,
    });
  }

  const newBalance = credits.credits_remaining - totalCreditsNeeded;
  const { data: debited, error: debitErr } = await supabaseAdmin
    .from('user_credits')
    .update({ credits_remaining: newBalance })
    .eq('id', credits.id)
    .eq('credits_remaining', credits.credits_remaining)
    .select()
    .maybeSingle();
  if (debitErr || !debited) return json(res, 409, { error: 'Could not debit credits, please retry' });

  // Generate variants in parallel.
  const variantGroupId = crypto.randomUUID();
  const results = await Promise.allSettled(
    chosenStyles.map(async (style) => {
      const prompt = buildVariantPrompt(style, room_type, mode);
      const result = await fal.subscribe(KONTEXT_MODEL, {
        input: {
          prompt,
          image_url,
          guidance_scale: 6,
          num_images: 1,
          output_format: 'jpeg',
          safety_tolerance: '2',
        },
        logs: false,
      });
      const url = result?.data?.images?.[0]?.url;
      if (!url) throw new Error('No image returned');

      const r = await fetch(url);
      if (!r.ok) throw new Error(`Download failed (${r.status})`);
      const buf = Buffer.from(await r.arrayBuffer());

      const objectKey = `${user.id}/variant-${variantGroupId}-${style.replace(/\s+/g, '_')}.jpg`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('renders')
        .upload(objectKey, buf, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
          upsert: false,
        });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabaseAdmin.storage.from('renders').getPublicUrl(objectKey);

      // Save a room_designs row for this variant.
      const designRecipe = {
        style,
        room_type: room_type || null,
        room_mode: mode || 'redesign',
        recipe_version: 1,
      };
      const { data: row } = await supabaseAdmin
        .from('room_designs')
        .insert({
          name: `${style} variant`,
          style,
          room_type: room_type || null,
          room_image_url: image_url,
          generated_render_url: pub.publicUrl,
          generation_prompt: prompt,
          design_recipe: designRecipe,
          variant_group_id: variantGroupId,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      return { id: row?.id, style, url: pub.publicUrl };
    })
  );

  // Refund credits for any failed variants.
  const successful = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const failedCount = results.length - successful.length;
  if (failedCount > 0) {
    const refundAmount = failedCount * CREDITS_PER_VARIANT;
    await supabaseAdmin
      .from('user_credits')
      .update({ credits_remaining: newBalance + refundAmount })
      .eq('id', credits.id);
    // eslint-disable-next-line no-console
    console.warn(`[generateVariants] ${failedCount} variant(s) failed, refunded ${refundAmount} credits`);
  }

  if (successful.length === 0) {
    return json(res, 502, { error: 'All variants failed to generate. Credits refunded.' });
  }

  return json(res, 200, {
    variant_group_id: variantGroupId,
    variants: successful,
    credits_remaining: newBalance + (failedCount * CREDITS_PER_VARIANT),
  });
}
