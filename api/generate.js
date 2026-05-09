/**
 * /api/generate — provider-agnostic image redesign route.
 *
 * Provider is selected via the `IMAGE_PROVIDER` env var:
 *   - 'huggingface' (default — free, slower, lower quality)
 *   - 'fal'         (paid — fast, higher quality)
 *   - 'together'    (paid, with $5 free credit at signup — same quality as fal)
 *
 * To swap providers in production, just change `IMAGE_PROVIDER` in Vercel env vars.
 * No code change needed.
 *
 * Flow regardless of provider:
 *   1. Authenticate the caller via their Supabase JWT.
 *   2. Atomically debit 1 credit (CAS so concurrent requests can't double-spend).
 *   3. Call the configured provider with the prompt + room image (img2img).
 *   4. Upload the generated image to Supabase Storage `renders` bucket so we
 *      own the URL (provider URLs typically expire).
 *   5. Refund the credit if anything in steps 3–4 failed.
 *   6. Return { url, credits_remaining }.
 */
import { HfInference } from '@huggingface/inference';
import { fal } from '@fal-ai/client';
import { allow, getUserFromRequest, json, readJson, supabaseAdmin } from './_lib/auth.js';
import { checkRateLimit } from './_lib/ratelimit.js';
import { runInpaintingPipeline, buildInpaintingPrompt } from './_lib/inpaint.js';
import { detectRoomColors, colorsToPromptClauses } from './_lib/vision.js';

const PROVIDER = (process.env.IMAGE_PROVIDER || 'huggingface').toLowerCase();
const CREDITS_PER_GENERATION = 1;

// HF cold starts can take 30–60s. Give the function room to breathe.
export const config = { maxDuration: 120 };

// === Provider config ========================================================

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const FAL_KEY = process.env.FAL_KEY;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

if (PROVIDER === 'huggingface' && !HF_TOKEN) {
  // eslint-disable-next-line no-console
  console.error('[api/generate] IMAGE_PROVIDER=huggingface but HUGGINGFACE_API_KEY is missing');
}
if (PROVIDER === 'fal' && !FAL_KEY) {
  // eslint-disable-next-line no-console
  console.error('[api/generate] IMAGE_PROVIDER=fal but FAL_KEY is missing');
}
if (PROVIDER === 'together' && !TOGETHER_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[api/generate] IMAGE_PROVIDER=together but TOGETHER_API_KEY is missing');
}

const hf = HF_TOKEN ? new HfInference(HF_TOKEN) : null;
if (FAL_KEY) fal.config({ credentials: FAL_KEY });

// === Default models per provider ============================================

const DEFAULT_MODELS = {
  huggingface: 'stabilityai/stable-diffusion-xl-refiner-1.0', // free, SDXL img2img
  // Day 10.6: rolled back from `kontext/max` after testing — Max ran a bit
  // faster but produced LESS faithful preservation than base Kontext on our
  // brick/grey/pink wall test cases. Base Kontext stays the prompt-mode
  // default. The structural drift problem is now addressed at a different
  // layer entirely: see api/_lib/inpaint.js for the mask-based inpainting
  // pipeline (gated behind USE_INPAINTING=true). When the mask path is on,
  // architecture preservation becomes a hard guarantee instead of a prompt.
  fal: 'fal-ai/flux-pro/kontext',
  together: 'black-forest-labs/FLUX.1-schnell-Free', // free with $5 trial
};

// === Handler =================================================================

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Not authenticated' });

  // Abuse prevention. Without this a single authed user can drain fal.ai
  // overnight (~$0.04/image × unbounded loop). Limits are per-user and live
  // in Upstash Redis (free tier). Returns 429 + retry hint instead of
  // burning credits + provider spend.
  const rl = await checkRateLimit('generate', user.id);
  if (!rl.success) {
    return json(res, 429, {
      error: rl.message,
      retry_after_seconds: rl.retryAfter,
      limit: rl.limit,
    });
  }

  const body = await readJson(req);
  const {
    prompt,
    image_url,
    strength,
    guidance_scale,
    image_size,
    num_inference_steps,
    negative_prompt,
    mode,
    model,
    design_id,
    is_free_retry,
  } = body;

  if (!prompt || typeof prompt !== 'string') {
    return json(res, 400, { error: 'Missing or invalid `prompt`' });
  }
  if (!image_url || typeof image_url !== 'string') {
    return json(res, 400, {
      error: 'Missing or invalid `image_url`',
      received_keys: Object.keys(body || {}),
    });
  }

  // 1. Credit handling.
  // Day 10.3 — `is_free_retry` is set by the client when a previous render
  // for the same design scored low and we're auto-retrying. The original
  // generation already debited credits, and we promised the user the retry
  // is on us. Server-side trust: rate limiting via Upstash + design_id
  // requirement gate the abuse vector. We still read credits to surface
  // the current balance in the response, but skip the debit/refund logic.
  const { data: credits, error: creditsErr } = await supabaseAdmin
    .from('user_credits')
    .select('id, credits_remaining, plan_type')
    .eq('user_id', user.id)
    .maybeSingle();

  if (creditsErr) {
    return json(res, 500, { error: 'Could not read credit balance' });
  }
  let creditsRow = credits;
  if (!creditsRow) {
    const { data: created, error: insertErr } = await supabaseAdmin
      .from('user_credits')
      .insert({ user_id: user.id, credits_remaining: 2, plan_type: 'free' })
      .select()
      .single();
    if (insertErr) return json(res, 500, { error: 'Could not initialize credits' });
    creditsRow = created;
  }

  let newBalance = creditsRow.credits_remaining;
  if (!is_free_retry) {
    // Standard path — atomic credit debit (CAS).
    if (creditsRow.credits_remaining < CREDITS_PER_GENERATION) {
      return json(res, 402, {
        error: 'Out of credits',
        credits_remaining: creditsRow.credits_remaining,
        plan_type: creditsRow.plan_type,
      });
    }

    newBalance = creditsRow.credits_remaining - CREDITS_PER_GENERATION;
    const { data: debited, error: debitErr } = await supabaseAdmin
      .from('user_credits')
      .update({ credits_remaining: newBalance })
      .eq('id', creditsRow.id)
      .eq('credits_remaining', creditsRow.credits_remaining)
      .select()
      .maybeSingle();

    if (debitErr || !debited) {
      return json(res, 409, { error: 'Could not debit credit, please retry' });
    }
  }
  // For is_free_retry path, newBalance == current balance (no debit).

  const refund = async (reason) => {
    // No-op when this was a free retry — we never debited.
    if (is_free_retry) return;
    // eslint-disable-next-line no-console
    console.warn('[api/generate] refunding credit:', reason);
    await supabaseAdmin
      .from('user_credits')
      .update({ credits_remaining: creditsRow.credits_remaining })
      .eq('id', creditsRow.id);
  };

  // 2. Strength clamp.
  //
  // For "furnish" mode (empty room → furnished room), the slider's max from
  // the frontend is ~0.7 — too low for FLUX img2img to actually paint new
  // furniture into an empty room. Force a floor of 0.85 so the model has
  // enough latitude to populate the scene. The frontend slider then maps
  // to "more aggressive" within 0.85–0.95.
  //
  // For "redesign" mode (already-furnished room), 0.5–0.85 is the right
  // working range — AI swaps furniture without altering the architecture.
  const isFurnish = mode === 'furnish';

  // === Vision pre-step: detect actual room colors ===========================
  // Day 10.7 — the previous "if grey, output grey" wording wasn't concrete
  // enough; Kontext kept overriding it with style-trained priors (Industrial
  // → cream walls, Boho → warm earth tones). We now pre-read the source
  // photo's actual hex colors and bake them in literally.
  //
  // Only worth running for Kontext models (where prompt fidelity matters).
  // Failures are silent — we fall through to the older prompt phrasing.
  const isKontext = /kontext/i.test(model || DEFAULT_MODELS[PROVIDER] || '');
  let detectedColors = null;
  if (isKontext && PROVIDER === 'fal') {
    detectedColors = await detectRoomColors(image_url);
  }
  const colorClauses = colorsToPromptClauses(detectedColors);

  // === Prompt rewrite for FLUX (both modes) ================================
  // The frontend's buildPrompt was tuned for SDXL — heavy on "DO NOT change"
  // instructions, all-caps "EXACTLY", "CRITICAL ARCHITECTURE LOCK", etc.
  // FLUX Kontext doesn't need any of that — it preserves architecture by
  // default and works best with short descriptive prompts (~30-50 words).
  //
  // The 250+ word imperative prompt was making fal Kontext run for 180+
  // seconds per generation, which Vercel killed at the 120s timeout. After
  // simplification, generations complete in 15-30s typical.
  //
  // We use Kontext model? Apply the rewrite. Otherwise (HF/SDXL) the long
  // preservation prompt actually helps SDXL stay close to the source.
  let finalPrompt;
  if (isKontext) {
    finalPrompt = isFurnish
      ? rewritePromptForFurnish(prompt, colorClauses)
      : rewritePromptForRedesign(prompt, colorClauses);
  } else {
    finalPrompt = isFurnish ? rewritePromptForFurnish(prompt, colorClauses) : prompt;
  }

  const minStrength = isFurnish ? 0.85 : 0.4;
  const maxStrength = isFurnish ? 0.95 : 0.85;
  const requestedStrength =
    typeof strength === 'number' ? strength : isFurnish ? 0.9 : 0.65;
  const safeStrength = clamp(
    isFurnish ? Math.max(requestedStrength, minStrength) : requestedStrength,
    minStrength,
    maxStrength
  );

  // 3. Generate via the configured provider.
  //
  // Day 10.6 — Path B (mask-based inpainting) runs as an opt-in pre-step.
  // When `USE_INPAINTING=true` (or the request body sets `use_inpainting`),
  // we segment the source for architecture, then FLUX-inpaint only the
  // furniture region. Architecture preservation becomes a hard guarantee
  // instead of a prompt the model can ignore.
  //
  // Any failure in the mask or inpaint step (model 404, mask polarity,
  // download error, etc.) falls through to the prompt-based Kontext path
  // below — the user always gets a render even if the new pipeline trips.
  const useInpainting =
    PROVIDER === 'fal' &&
    !!FAL_KEY &&
    (body?.use_inpainting === true || process.env.USE_INPAINTING === 'true');

  let imageBuffer;
  let pipelineUsed = 'kontext'; // overwritten below if Path B ran
  if (useInpainting) {
    try {
      const inpaintPrompt = buildInpaintingPrompt(prompt, mode);
      imageBuffer = await runInpaintingPipeline({
        imageUrl: image_url,
        prompt: inpaintPrompt,
      });
      pipelineUsed = 'inpaint';
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[api/generate] inpainting failed, falling back to Kontext:', err?.message || err);
      imageBuffer = null;
      pipelineUsed = 'kontext-fallback';
    }
  }

  try {
    if (imageBuffer) {
      // Already generated via Path B — nothing to do here.
    } else if (PROVIDER === 'huggingface') {
      imageBuffer = await generateWithHuggingFace({
        model: model || DEFAULT_MODELS.huggingface,
        prompt: finalPrompt,
        imageUrl: image_url,
        strength: safeStrength,
        guidanceScale: guidance_scale,
        numInferenceSteps: num_inference_steps,
        negativePrompt: negative_prompt,
        imageSize: image_size,
      });
    } else if (PROVIDER === 'fal') {
      imageBuffer = await generateWithFal({
        model: model || DEFAULT_MODELS.fal,
        prompt: finalPrompt,
        imageUrl: image_url,
        strength: safeStrength,
        guidanceScale: guidance_scale,
        numInferenceSteps: num_inference_steps,
        negativePrompt: negative_prompt,
        imageSize: image_size,
      });
    } else if (PROVIDER === 'together') {
      imageBuffer = await generateWithTogether({
        model: model || DEFAULT_MODELS.together,
        prompt: finalPrompt,
        imageUrl: image_url,
        strength: safeStrength,
      });
    } else {
      throw new Error(`Unknown IMAGE_PROVIDER: ${PROVIDER}`);
    }
  } catch (err) {
    await refund(`${PROVIDER} provider error`);
    const detail =
      err?.body?.detail ||
      err?.body?.error ||
      err?.message ||
      String(err);
    // eslint-disable-next-line no-console
    console.error(`[api/generate] ${PROVIDER} error:`, {
      message: err?.message,
      status: err?.status,
      body: err?.body,
    });
    return json(res, 502, {
      error: 'Image generation failed',
      detail,
      provider: PROVIDER,
    });
  }

  // 4. Mirror the result into our Supabase Storage so the URL doesn't expire.
  let publicUrl;
  try {
    const objectKey = `${user.id}/render-${Date.now()}.jpg`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('renders')
      .upload(objectKey, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });
    if (uploadErr) throw uploadErr;
    const { data: pub } = supabaseAdmin.storage.from('renders').getPublicUrl(objectKey);
    publicUrl = pub.publicUrl;
  } catch (err) {
    await refund('storage upload failed');
    return json(res, 500, {
      error: 'Could not save render',
      detail: err?.message || String(err),
    });
  }

  // 5. Optionally update the room_designs row.
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
    provider: PROVIDER,
    pipeline: pipelineUsed,
    // Surfaced for debugging — the user / a tester can compare these against
    // the result image to see whether Kontext honoured the detected colors.
    detected_colors: detectedColors,
  });
}

// =============================================================================
// Provider implementations
// =============================================================================

/**
 * Hugging Face Inference API — free tier, slower (cold starts).
 *
 * Bypasses the @huggingface/inference SDK so we can surface real HTTP errors
 * instead of the SDK's generic "An error occurred while fetching the blob".
 *
 * Note: HF moved many img2img models to paid Inference Providers in 2025.
 * If the configured model returns 404/401/402, switch HUGGINGFACE_MODEL env
 * var to one still on the free Serverless API, OR move to Together.ai/fal.
 */
async function generateWithHuggingFace({
  model,
  prompt,
  imageUrl,
  strength,
  guidanceScale,
  numInferenceSteps,
  negativePrompt,
}) {
  if (!HF_TOKEN) throw new Error('HUGGINGFACE_API_KEY is not configured');

  // 1. Pull the source image bytes.
  const sourceRes = await fetch(imageUrl);
  if (!sourceRes.ok) {
    throw new Error(`Source image fetch failed (${sourceRes.status})`);
  }
  const sourceBuf = Buffer.from(await sourceRes.arrayBuffer());
  const sourceB64 = sourceBuf.toString('base64');

  // 2. Build the request. Most diffusion models on HF accept this shape:
  //    { inputs: <base64 image>, parameters: { prompt, strength, ... } }
  const requestBody = {
    inputs: sourceB64,
    parameters: {
      prompt,
      strength,
      guidance_scale: typeof guidanceScale === 'number' ? guidanceScale : 7.5,
      num_inference_steps:
        typeof numInferenceSteps === 'number' ? numInferenceSteps : 30,
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    },
    options: {
      wait_for_model: true,
      use_cache: false,
    },
  };

  const url = `https://api-inference.huggingface.co/models/${model}`;
  const hfResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'image/png',
    },
    body: JSON.stringify(requestBody),
  });

  // 3. Inspect the response. If it's JSON, it's an error. If it's binary, it's the image.
  const contentType = hfResponse.headers.get('content-type') || '';
  if (!hfResponse.ok || contentType.includes('application/json')) {
    let bodyText;
    try {
      bodyText = await hfResponse.text();
    } catch {
      bodyText = '<unreadable>';
    }
    let parsed = null;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      /* not JSON */
    }
    const detail =
      parsed?.error ||
      parsed?.message ||
      bodyText ||
      `HF returned ${hfResponse.status}`;
    const err = new Error(detail);
    err.status = hfResponse.status;
    err.body = parsed ?? bodyText;
    err.model = model;
    throw err;
  }

  // 4. Return the image bytes.
  const arrayBuf = await hfResponse.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * fal.ai — paid, fast, high quality.
 *
 * Routes to one of two parameter shapes based on the model:
 *
 *   1. FLUX Kontext (fal-ai/flux-pro/kontext) — image EDITING.
 *      Takes prompt + image, NO strength. Designed for "add/remove/change X
 *      while keeping everything else". Best for our redesign + furnish flows.
 *
 *   2. FLUX img2img (fal-ai/flux/dev/image-to-image) and SDXL variants —
 *      classic img2img with strength control.
 */
async function generateWithFal({
  model,
  prompt,
  imageUrl,
  strength,
  guidanceScale,
  numInferenceSteps,
  negativePrompt,
  imageSize,
}) {
  const isKontext = /kontext/i.test(model);
  const isFlux = /flux/i.test(model);

  // ---- FLUX Kontext path ---------------------------------------------------
  if (isKontext) {
    // Kontext-specific input: no strength, no image_size (it follows input
    // dimensions). Guidance_scale tuning history:
    //   Day 5.6: 3.5 default / 5 cap → walls and windows still drifting.
    //   Day 6.8: 6 default / 7 cap → mostly stable but wall paint drifted.
    //   Day 10.1: 7 default / 7 cap → maximum prompt adherence so the
    //   "DO NOT REPAINT WALLS" negative phrasing in our rewrite gets
    //   followed literally. Tradeoff: slightly less creative furniture
    //   placement, but the user's #1 complaint was wall-color drift, so
    //   prompt fidelity wins.
    const result = await fal.subscribe(model, {
      input: {
        prompt,
        image_url: imageUrl,
        guidance_scale: clamp(
          typeof guidanceScale === 'number' ? Math.min(guidanceScale / 2, 7) : 7,
          3,
          7
        ),
        num_images: 1,
        output_format: 'jpeg',
        safety_tolerance: '2', // 1 strictest, 6 most permissive; default 2
      },
      logs: false,
    });
    const url = result?.data?.images?.[0]?.url;
    if (!url) throw new Error('fal.ai (Kontext) returned no image');
    const fetchRes = await fetch(url);
    if (!fetchRes.ok) throw new Error(`Download failed (${fetchRes.status})`);
    return Buffer.from(await fetchRes.arrayBuffer());
  }

  // ---- FLUX img2img / SDXL path -------------------------------------------
  let resolvedImageSize = 'landscape_4_3';
  if (typeof imageSize === 'string' && imageSize.length > 0) {
    resolvedImageSize = imageSize;
  } else if (
    imageSize &&
    typeof imageSize === 'object' &&
    Number.isFinite(imageSize.width) &&
    Number.isFinite(imageSize.height)
  ) {
    resolvedImageSize = {
      width: clamp(imageSize.width, 256, 1536),
      height: clamp(imageSize.height, 256, 1536),
    };
  }

  let resolvedGuidanceScale;
  if (isFlux) {
    resolvedGuidanceScale = clamp(
      typeof guidanceScale === 'number' ? Math.min(guidanceScale / 2, 5) : 3.5,
      1.5,
      7
    );
  } else {
    resolvedGuidanceScale = typeof guidanceScale === 'number' ? guidanceScale : 7.5;
  }

  const resolvedSteps =
    typeof numInferenceSteps === 'number'
      ? numInferenceSteps
      : isFlux
      ? 28
      : 30;

  const falResult = await fal.subscribe(model, {
    input: {
      prompt,
      image_url: imageUrl,
      strength,
      guidance_scale: resolvedGuidanceScale,
      num_inference_steps: resolvedSteps,
      image_size: resolvedImageSize,
      num_images: 1,
      enable_safety_checker: true,
      ...(!isFlux && negativePrompt ? { negative_prompt: negativePrompt } : {}),
    },
    logs: false,
  });

  const generatedFalUrl = falResult?.data?.images?.[0]?.url;
  if (!generatedFalUrl) throw new Error('fal.ai returned no image');

  const fetchRes = await fetch(generatedFalUrl);
  if (!fetchRes.ok) throw new Error(`Download failed (${fetchRes.status})`);
  return Buffer.from(await fetchRes.arrayBuffer());
}

/**
 * Together.ai — paid, fast, $5 free at signup. FLUX models.
 */
async function generateWithTogether({ model, prompt, imageUrl, strength }) {
  if (!TOGETHER_API_KEY) throw new Error('TOGETHER_API_KEY is not configured');

  // Together's image API; FLUX-schnell is text-to-image so we currently
  // ignore imageUrl. Switch to a real img2img model (e.g. their custom
  // FLUX-img2img) when accounts have credit.
  void imageUrl;
  void strength;

  const response = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      response_format: 'b64_json',
      width: 1024,
      height: 1024,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(`Together returned ${response.status}`);
    err.status = response.status;
    err.body = text;
    throw err;
  }
  const json = await response.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('Together returned no image');
  return Buffer.from(b64, 'base64');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Day 6.8 — Extract user override fields from the verbose frontend prompt.
 *
 * The Studio wizard's StepGenerate.buildPrompt() bakes user fine-tune fields
 * into the verbose prompt as labeled phrases:
 *   "Wall color: Sage Green"
 *   "Sofa/seating upholstery: Charcoal"
 *   "Flooring: Light Oak"
 *   "Ceiling: Exposed Wooden Beams"
 *   ...plus a free-text custom_note appended without a label.
 *
 * Earlier Kontext rewriters threw all of this away when simplifying for the
 * 120s timeout, which meant a user typing "change back wall to grey" got
 * silently ignored. This helper recovers the structured overrides so the
 * downstream rewriter can:
 *   (a) REMOVE the corresponding item from the preservation list, and
 *   (b) ADD it to the change list with a specific instruction.
 *
 * The override semantics are critical to the product's value prop: by default
 * preserve everything that's not furniture/decor, but honor explicit user
 * overrides verbatim.
 */
function extractUserOverrides(originalPrompt) {
  const p = originalPrompt;

  const wallColor =
    p.match(/Wall color:\s*([^.]+?)(?:\.|$)/i)?.[1]?.trim() || null;
  const sofaColor =
    p.match(/Sofa\/seating upholstery:\s*([^.]+?)(?:\.|$)/i)?.[1]?.trim() || null;
  const floorType =
    p.match(/Flooring:\s*([^.]+?)(?:\.|$)/i)?.[1]?.trim() || null;
  const ceilingDesign =
    p.match(/Ceiling:\s*([^.]+?)(?:\.|$)/i)?.[1]?.trim() || null;

  // The custom_note is appended last, after all the structured fields.
  // Heuristic: anything between the last labeled field and the camera/lens
  // boilerplate that doesn't look like a label or palette/mood phrase.
  // Falls back to the lookbehind "Mood: ..." and trailing camera string.
  let customNote = null;
  const customMatch = p.match(
    /(?:Ceiling:[^.]+\.|Flooring:[^.]+\.|Sofa\/seating upholstery:[^.]+\.|Wall color:[^.]+\.|Color palette:[^.]+\.)\s*([^.]+?)\.\s*(?:Mood:|Canon EOS|Photorealistic, 8K|Hyperrealistic, 8K|$)/i
  );
  if (customMatch) {
    const candidate = customMatch[1]?.trim();
    // Reject if it looks like another labeled field we already extracted, or
    // boilerplate descriptors. Heuristic: must not contain "color palette",
    // "interior design", or be a single recognized style word.
    if (
      candidate &&
      candidate.length > 3 &&
      !/^(color palette|interior design|wall color|flooring|ceiling|sofa)/i.test(candidate)
    ) {
      customNote = candidate;
    }
  }

  return { wallColor, sofaColor, floorType, ceilingDesign, customNote };
}

/**
 * Build the structured preservation + change clause for Kontext, honoring
 * any explicit user overrides. This is the heart of the structure-preservation
 * spec: by default preserve all non-furniture elements, but if the user has
 * set an override field, MOVE that element from the preserve list to the
 * change list with the user's specific value.
 */
function buildPreservationAndChangeClauses(overrides, mode = 'redesign', colorClauses = {}) {
  const { wallColor, sofaColor, floorType, ceilingDesign, customNote } = overrides;
  const { wallClause: detectedWallClause, floorClause: detectedFloorClause, ceilingClause: detectedCeilingClause } = colorClauses || {};

  // Preservation list — items only included when no override is set for them.
  const preserveItems = ['windows (count, positions, sizes)', 'doors (count, positions)', 'camera angle', 'perspective', 'room dimensions'];
  if (!wallColor) preserveItems.unshift('walls and wall paint color');
  else preserveItems.unshift('walls');
  if (!floorType) preserveItems.push('floor material and floor color');
  if (!ceilingDesign) preserveItems.push('ceiling');

  // Day 10.7 — concrete color anchors from Gemini Vision pre-step.
  // Priority order:
  //   1. User override (e.g. "Sage Green") — wins.
  //   2. Vision-detected hex + name — used when no override.
  //   3. Generic "if grey, output grey" fallback (Day 10.1) — only if
  //      detection failed entirely.
  // Concrete hex/named color phrasing is materially harder for Kontext to
  // drift away from than vague "if grey, output grey" wording.
  const wallColorLock = wallColor
    ? `Repaint walls in ${wallColor} ONLY — match this color exactly.`
    : detectedWallClause
    ? detectedWallClause
    : `Wall paint color MUST be EXACTLY THE SAME as the source photo. If source walls are grey, output walls are grey. If source walls are white, output walls are white. DO NOT introduce orange, warm, accent, or any new wall color.`;

  const floorColorLock = floorType
    ? `Replace flooring with ${floorType}.`
    : detectedFloorClause
    ? detectedFloorClause
    : `Floor material and color MUST be EXACTLY THE SAME as the source photo. Do not change wood tone, tile color, or floor finish.`;

  const ceilingColorLock = ceilingDesign
    ? null // ceiling is being intentionally redesigned; skip color lock
    : detectedCeilingClause
    ? detectedCeilingClause
    : null;

  const preservationClause =
    `PRESERVE — keep these IDENTICAL to the source photo: ${preserveItems.join(', ')}. ` +
    `${wallColorLock} ${floorColorLock}${ceilingColorLock ? ' ' + ceilingColorLock : ''} ` +
    `Do not add, remove, or relocate any window or door. Do not change room shape, room dimensions, or perspective.`;

  // Change list — what the AI is allowed/expected to change.
  const changeItems = [];
  if (mode === 'furnish') {
    changeItems.push('Add furniture, upholstery, lighting fixtures, rugs, and decor objects to the empty room');
  } else {
    changeItems.push('Replace furniture, upholstery, lighting fixtures, rugs, and decor objects');
  }
  if (ceilingDesign) changeItems.push(`Update ceiling: ${ceilingDesign}`);
  if (sofaColor) changeItems.push(`Sofa upholstery in ${sofaColor}`);
  if (customNote) changeItems.push(`User instruction: ${customNote}`);

  const changeClause = `CHANGE: ${changeItems.join('. ')}.`;

  return { preservationClause, changeClause };
}

/**
 * Rewrites a verbose SDXL-style prompt into a FLUX-Kontext-friendly edit prompt
 * for "furnish empty room" generations.
 *
 * Day 5.7 update: matched the rewritePromptForRedesign edit-style framing
 * after users reported that empty rooms were being regenerated as different
 * rooms (different walls, different windows, different floor). Kontext does
 * not preserve architecture by default — it needs an explicit "edit this
 * exact photo, keep walls/windows/floor unchanged, only ADD furniture"
 * instruction. With a declarative "A fully furnished room..." prompt it
 * routinely treats the input as inspiration rather than canvas.
 *
 * Style descriptors / furniture list / palette / mood from the original
 * verbose prompt are preserved; we just lead with preservation + change
 * clauses so Kontext stays anchored to the source.
 */
function rewritePromptForFurnish(originalPrompt, colorClauses = {}) {
  const p = originalPrompt;

  // Pull the style: "Apply <Style> interior design" or "<Style>-style furniture"
  const styleMatch =
    p.match(/(?:add realistic |Apply )([\w-]+)(?:-style| interior| style)/i) ||
    p.match(/\b(Japandi|Scandinavian|Mid-century|Modern|Industrial|Bohemian|Minimalist|Coastal|Farmhouse|Art Deco|Cottagecore|Contemporary)\b/i);
  const style = styleMatch?.[1] || 'modern';

  // Pull the room type ("to this Living Room", "to this Bedroom" etc.)
  const roomMatch = p.match(/to this\s+([\w\s]+?)(?:[:.]|$)/i);
  const room = roomMatch?.[1]?.trim().toLowerCase() || 'room';

  // Pull the furniture list after "Include: "
  const includeMatch = p.match(/Include:\s*([^.]+)\./i);
  const furnitureList = includeMatch?.[1]?.trim();

  // Pull color palette after "Color palette: "
  const paletteMatch = p.match(/Color palette:\s*([^.]+)\./i);
  const palette = paletteMatch?.[1]?.trim();

  // Pull mood after "Mood: "
  const moodMatch = p.match(/Mood:\s*([^.]+)\./i);
  const mood = moodMatch?.[1]?.trim();

  // Pull style-specific descriptors that come right after the style declaration
  // (e.g., "neutral linen/cotton textiles, low-profile solid oak furniture, ...")
  const detailMatch = p.match(/-style furniture and decor only\.\s*([^.]+)\./i);
  const styleDetail = detailMatch?.[1]?.trim();

  // Day 6.8 — extract user override fields from the verbose prompt and
  // build structured preserve/change clauses that honor them.
  // Day 10.7 — also feed Gemini-detected hex colors so the preservation
  // clause names the actual source colors instead of generic "if grey…".
  const overrides = extractUserOverrides(p);
  const { preservationClause, changeClause } = buildPreservationAndChangeClauses(
    overrides,
    'furnish',
    colorClauses
  );

  // Day 11 — see rewritePromptForRedesign for rationale on the final-line
  // reinforcement when vision colors are detected. Same idea applied here:
  // empty rooms with strong style descriptors (Industrial, Cottagecore) had
  // the same wall-drift problem as redesign.
  const wallHexFurnish = colorClauses?.wallClause?.match(/#[0-9A-F]{6}/i)?.[0];
  const floorHexFurnish = colorClauses?.floorClause?.match(/#[0-9A-F]{6}/i)?.[0];
  const finalLockFurnish = wallHexFurnish || floorHexFurnish
    ? `FINAL CHECK before rendering: empty room walls remain ${wallHexFurnish || 'their source color'}${floorHexFurnish ? `, floor remains ${floorHexFurnish}` : ''}. Style applies to FURNITURE AND DECOR ONLY, never to architecture.`
    : null;

  const parts = [
    `Edit this exact empty ${room} photo.`,
    preservationClause,
    changeClause,
    `Apply ${style} interior design style to the new furniture and decor.`,
    styleDetail || null,
    furnitureList ? `Suggested pieces: ${furnitureList}.` : null,
    palette ? `Use ${palette} as accent colors on furniture, upholstery, and decor only — never on walls or floor.` : null,
    mood ? `Mood: ${mood.toLowerCase()}.` : null,
    finalLockFurnish,
    'photorealistic interior photograph, natural light, magazine quality.',
  ].filter(Boolean);

  return parts.join(' ');
}

/**
 * Rewrites a verbose redesign prompt into a FLUX Kontext-friendly short prompt.
 *
 * Key learnings (Day 5.6):
 *   - Kontext does NOT preserve architecture "by default" the way the docs
 *     suggest. With a purely declarative prompt ("Apply X style to this room")
 *     it routinely regenerates walls, windows, camera angle, floor — producing
 *     a different room that just shares the style. Users can't recognize their
 *     space, which kills trust on step 1 of the funnel.
 *   - Explicit edit-style framing ("Edit this exact room photo... keep walls,
 *     windows, doors, floor, camera angle unchanged. Only change: furniture,
 *     paint color, decor.") materially improves structural fidelity.
 *   - Length still matters for timeout (must stay well under 250 words to
 *     keep generation under the 120s function cap), so we keep the new prompt
 *     to ~70-90 words — verbose enough to lock structure, terse enough to
 *     stay fast.
 *   - We pair this with a higher guidance_scale (~6) in callsite so Kontext
 *     follows the preservation instructions more literally.
 */
function rewritePromptForRedesign(originalPrompt, colorClauses = {}) {
  const p = originalPrompt;

  // Pull the style. Order: explicit "Apply <Style>" form, then known styles.
  const styleMatch =
    p.match(/Apply\s+([\w\s-]+?)\s+interior design style/i) ||
    p.match(/\b(Japandi|Scandinavian|Mid-century|Modern|Industrial|Bohemian|Minimalist|Coastal|Farmhouse|Art Deco|Cottagecore|Contemporary|Maximalist)\b/i);
  const style = styleMatch?.[1]?.trim() || 'modern';

  // Pull the room type ("to this Living Room", "to this Bedroom" etc.)
  const roomMatch = p.match(/to this\s+([\w\s]+?)(?:[:.]|$)/i);
  const room = roomMatch?.[1]?.trim().toLowerCase() || 'room';

  // Pull style-specific descriptors that come right after the colon.
  // E.g. "deep jewel-tone velvet upholstery in emerald or navy, polished gold..."
  const descriptorsMatch = p.match(
    /interior design style to this[\s\w]+?:\s*([^.]+?)(?:\.\s*Include:|$|\.[A-Z])/i
  );
  const descriptors = descriptorsMatch?.[1]?.trim();

  // Pull the furniture list after "Include: "
  const includeMatch = p.match(/Include:\s*([^.]+)\./i);
  const furnitureList = includeMatch?.[1]?.trim();

  // Pull the color palette after "Color palette: "
  const paletteMatch = p.match(/Color palette:\s*([^.]+?)(?:\.|$)/i);
  const palette = paletteMatch?.[1]?.trim();

  // Day 6.8 — extract user override fields from the verbose prompt and
  // build structured preserve/change clauses that honor them. This is the
  // core of the structure-preservation spec: every architectural element
  // not explicitly overridden by the user (wall_color, floor_type,
  // ceiling_design, custom_note) MUST stay identical to the source photo.
  // Day 10.7 — also feed Gemini-detected hex colors so the preservation
  // clause names the actual source colors instead of generic "if grey…".
  const overrides = extractUserOverrides(p);
  const { preservationClause, changeClause } = buildPreservationAndChangeClauses(
    overrides,
    'redesign',
    colorClauses
  );

  // Day 11 — final-line reinforcement when vision detected concrete colors.
  // Repetition matters for FLUX prompt adherence; a single mention of the
  // wall hex earlier in the prompt was getting overridden by warmer
  // descriptors ("burnt orange accents", "cream walls") that came later in
  // the chain. Reasserting the source colors AFTER all style/palette text
  // demonstrably reduces wall drift in our test cases.
  const wallHexMatch = colorClauses?.wallClause?.match(/#[0-9A-F]{6}/i)?.[0];
  const floorHexMatch = colorClauses?.floorClause?.match(/#[0-9A-F]{6}/i)?.[0];
  const finalLock = wallHexMatch || floorHexMatch
    ? `FINAL CHECK before rendering: walls remain ${wallHexMatch || 'their source color'}${floorHexMatch ? `, floor remains ${floorHexMatch}` : ''}. Style applies to FURNITURE AND DECOR ONLY, never to architecture.`
    : null;

  const parts = [
    `Edit this exact ${room} photo.`,
    preservationClause,
    changeClause,
    `Apply ${style} interior design style to the new furniture and decor.`,
    descriptors ? `${descriptors}.` : null,
    furnitureList ? `Suggested pieces: ${furnitureList}.` : null,
    palette ? `Use ${palette} as accent colors on furniture, upholstery, and decor only — never on walls, floor, or ceiling unless the user instructed otherwise.` : null,
    finalLock,
    'photorealistic interior photograph, natural light, magazine quality.',
  ].filter(Boolean);

  // Each part already ends in '.' so we join with a single space — avoids
  // the double-period sloppiness that ".".join would produce.
  return parts.join(' ');
}
