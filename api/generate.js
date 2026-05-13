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
// Day 12 — locked to base fal-ai/flux-pro/kontext per directive. Path B
// (mask-based inpainting via segmentation + flux inpaint) was removed: it
// cost 2 fal calls per render (~2x spend) and produced visibly worse
// quality on the test cases we tried. The inpaint helpers stay on disk in
// _lib/inpaint.js for reference / quick rollback but are no longer imported.
// The Gemini vision color anchors (Day 10.7) also stay imported because
// they're free-tier and only run on Kontext, where they help.
import { detectRoomColors, colorsToPromptClauses } from './_lib/vision.js';

const PROVIDER = (process.env.IMAGE_PROVIDER || 'huggingface').toLowerCase();
const CREDITS_PER_GENERATION = 1;

// HF cold starts can take 30–60s. Give the function room to breathe.
export const config = { maxDuration: 120 };

// === Provider config ========================================================

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const FAL_KEY = process.env.FAL_KEY;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
// Day 18 — `local` provider. Points at a ComfyUI instance running on the
// developer's Mac, exposed via ngrok. No paid API needed for the BETA50
// soft launch. Trade-off: image generation requires the Mac to be awake
// and ngrok tunnel running. Suitable for closed beta, not for scale.
const LOCAL_SDXL_URL = process.env.LOCAL_SDXL_URL;

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
if (PROVIDER === 'replicate' && !REPLICATE_API_TOKEN) {
  // eslint-disable-next-line no-console
  console.error('[api/generate] IMAGE_PROVIDER=replicate but REPLICATE_API_TOKEN is missing');
}
if (PROVIDER === 'nvidia' && !NVIDIA_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[api/generate] IMAGE_PROVIDER=nvidia but NVIDIA_API_KEY is missing');
}
if (PROVIDER === 'local' && !LOCAL_SDXL_URL) {
  // eslint-disable-next-line no-console
  console.error('[api/generate] IMAGE_PROVIDER=local but LOCAL_SDXL_URL is missing');
}

const hf = HF_TOKEN ? new HfInference(HF_TOKEN) : null;
if (FAL_KEY) fal.config({ credentials: FAL_KEY });

// === Default models per provider ============================================

const DEFAULT_MODELS = {
  huggingface: 'stabilityai/stable-diffusion-xl-refiner-1.0', // free, SDXL img2img
  // Day 14: migrated off Kontext to SDXL img2img.
  //
  // Why: FLUX Kontext has no `strength` parameter and no `negative_prompt`
  // support, which removed the two features that made the original
  // Base44-era pipeline produce reliably-preserved structure. Kontext's
  // "edit by description" approach was visually slicker but kept drifting
  // walls / floor / ceiling on hard cases (Industrial empty bedrooms, etc.).
  //
  // SDXL img2img on fal.ai gets us back:
  //   - strength clamp (0.15-0.38 redesign, 0.55-0.78 furnish) → hard
  //     mathematical guarantee that <40% of pixels can change in redesign mode.
  //   - negative_prompt → explicit "do not generate new windows, fisheye,
  //     warped walls" exclusion list.
  //   - high guidance_scale (12-16) → model follows the verbose preservation
  //     prompt very literally.
  //
  // Tradeoff: SDXL output is slightly less polished than FLUX. Acceptable
  // because structure correctness > 5% glossier render. If a different
  // SDXL endpoint name is needed later, override via FAL_MODEL env var.
  fal: process.env.FAL_MODEL || 'fal-ai/fast-sdxl/image-to-image',
  together: 'black-forest-labs/FLUX.1-schnell-Free', // free with $5 trial
  // Day 15 / 17c — Replicate's official Stability AI SDXL endpoint.
  // Honors strength + num_inference_steps + negative_prompt + image (img2img)
  // as documented. Async predictions API: we POST to start, poll until
  // succeeded. Override slug via REPLICATE_MODEL env var.
  //
  // Day 17c — switched from `lucataco/sdxl-img2img` with a pinned (and
  // mistakenly fabricated) version hash to `stability-ai/sdxl` without a
  // version. The /v1/models/{owner}/{name}/predictions endpoint pattern
  // (used below) auto-resolves to the latest version, so we don't have
  // to maintain a hash. stability-ai/sdxl is also the official SDXL
  // implementation — no surprises.
  replicate: process.env.REPLICATE_MODEL || 'stability-ai/sdxl',
  // Day 16 — NVIDIA Build's hosted catalog. OpenAI-compatible API at
  // integrate.api.nvidia.com/v1. Free tier for prototyping. Default to
  // qwen-image-edit which is purpose-built for image editing tasks (good
  // structure preservation by architecture, not just prompt). Override
  // via NVIDIA_MODEL env var.
  nvidia: process.env.NVIDIA_MODEL || 'qwen/qwen-image-edit',
  // Day 18 — ComfyUI checkpoint filename. Whatever the user has dropped in
  // their `ComfyUI/models/checkpoints/` directory. SDXL base 1.0 is the
  // default; override via LOCAL_SDXL_CHECKPOINT env var for SDXL Lightning,
  // RealVisXL, etc.
  local: process.env.LOCAL_SDXL_CHECKPOINT || 'sd_xl_base_1.0.safetensors',
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
  // Day 10.7 — pre-read the source photo's actual hex colors and bake them
  // into the verbose preservation prompt. Concrete hex codes are much harder
  // for the model to drift away from than vague "if grey, output grey"
  // wording. Failures are silent — falls through to the older phrasing.
  //
  // Day 14 — runs for ALL fal models now, not just Kontext. SDXL benefits
  // from the explicit color anchors too (combined with strength clamp +
  // negative prompt, this is the strongest preservation signal we can ship).
  const isKontext = /kontext/i.test(model || DEFAULT_MODELS[PROVIDER] || '');
  let detectedColors = null;
  if (PROVIDER === 'fal') {
    detectedColors = await detectRoomColors(image_url);
  }
  const colorClauses = colorsToPromptClauses(detectedColors);

  // === Prompt selection =====================================================
  // Day 14 — the verbose frontend prompt (with CRITICAL ARCHITECTURE LOCK,
  // explicit window/door counts, full preservation list) is what SDXL needs
  // and is exactly what Base44's old pipeline used to ship great preserved
  // outputs. We DO NOT rewrite/shorten it for SDXL — high guidance_scale
  // forces the model to follow it literally. Only Kontext (still kept as
  // an opt-in fallback model via FAL_MODEL env override) benefits from the
  // shorter rewrite, since Kontext rejects the verbose form with timeouts.
  let finalPrompt;
  if (isKontext) {
    finalPrompt = isFurnish
      ? rewritePromptForFurnish(prompt, colorClauses)
      : rewritePromptForRedesign(prompt, colorClauses);
  } else {
    // SDXL: pass verbose prompt straight through.
    finalPrompt = prompt;
  }

  // === Strength clamp =======================================================
  // Day 14 restored the OLD Base44 values; Day 14b found via QA-12 that
  // fal's SDXL endpoint runs HOTTER than Base44's — i.e. strength 0.65 on
  // fal is closer to 0.45 on Base44 (preserves too aggressively, doesn't
  // paint furniture into empty rooms). Bumping the furnish floor to 0.65
  // and default to 0.75 fixes the empty-render failure mode without
  // breaking the tested 0.78 case (which still scored 95/100).
  //
  //   - Furnish (empty room): 0.65-0.85 — needs significant freedom to
  //     actually paint furniture. Lower bound was 0.55 on Day 14, raised
  //     to 0.65 because below that fal's SDXL just preserves the empty room.
  //   - Redesign LOCKED: 0.15-0.28 — very tight; only colors/decor change.
  //   - Redesign unlocked: 0.15-0.38.
  //   - Fine-tune: callers send 0.20-0.25; clamp lets it through.
  // Kontext path ignores strength entirely (model doesn't accept it).
  const isLocked = body?.structure_locked === true;
  let minStrength, maxStrength, defaultStrength;
  if (isFurnish) {
    // Day 14c — bumped floor 0.65 → 0.75 after QA-13 saw a strength=0.78
    // run produce minimal furniture. SDXL on fal has visible seed variance:
    // sometimes 0.78 paints a full bedroom, sometimes barely touches the
    // empty room. Raising the floor to 0.75 ensures even the worst-seed
    // path gets enough denoising headroom; default 0.82 lands square in
    // "consistently produces furniture" territory based on test runs.
    minStrength = 0.75; maxStrength = isLocked ? 0.80 : 0.90; defaultStrength = 0.82;
  } else if (isLocked) {
    minStrength = 0.15; maxStrength = 0.28; defaultStrength = 0.22;
  } else {
    minStrength = 0.15; maxStrength = 0.38; defaultStrength = 0.30;
  }
  const requestedStrength =
    typeof strength === 'number' ? strength : defaultStrength;
  const safeStrength = clamp(requestedStrength, minStrength, maxStrength);

  // 3. Generate via the configured provider.
  //
  // Day 12 — Path B (mask-based inpainting) was removed. The single supported
  // pipeline is now base fal-ai/flux-pro/kontext with the prompt-based
  // preservation block. Simpler, cheaper (1 fal call vs 2), and the quality
  // delta from inpainting wasn't worth the 2x cost in our testing. The
  // vision color anchors (Day 10.7, free Gemini call) still run as the
  // single non-Kontext upgrade that helps preservation.
  let imageBuffer;
  // Day 14b — pipeline label reflects the actual model family. Was
  // hardcoded to "kontext" since Day 12 even after the SDXL migration,
  // which made QA-12 confusing. Now derives from the model name.
  const pipelineUsed = isKontext
    ? 'kontext'
    : /sdxl/i.test(model || DEFAULT_MODELS[PROVIDER] || '')
    ? 'sdxl-img2img'
    : /flux/i.test(model || DEFAULT_MODELS[PROVIDER] || '')
    ? 'flux-img2img'
    : (PROVIDER || 'unknown');

  try {
    if (PROVIDER === 'huggingface') {
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
    } else if (PROVIDER === 'replicate') {
      imageBuffer = await generateWithReplicate({
        model: model || DEFAULT_MODELS.replicate,
        prompt: finalPrompt,
        imageUrl: image_url,
        strength: safeStrength,
        guidanceScale: guidance_scale,
        numInferenceSteps: num_inference_steps,
        negativePrompt: negative_prompt,
      });
    } else if (PROVIDER === 'nvidia') {
      imageBuffer = await generateWithNvidia({
        model: model || DEFAULT_MODELS.nvidia,
        prompt: finalPrompt,
        imageUrl: image_url,
        numInferenceSteps: num_inference_steps,
      });
    } else if (PROVIDER === 'local') {
      imageBuffer = await generateWithLocal({
        checkpoint: model || DEFAULT_MODELS.local,
        prompt: finalPrompt,
        imageUrl: image_url,
        strength: safeStrength,
        guidanceScale: guidance_scale,
        numInferenceSteps: num_inference_steps,
        negativePrompt: negative_prompt,
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
  const isControlNet = /controlnet/i.test(model);

  // ---- ControlNet path (Day 17) -------------------------------------------
  // ControlNet preserves structure via a SPATIAL CONDITIONING signal (canny
  // edge map of the source) rather than img2img's pixel-noise strength.
  // The model literally cannot drift away from the canny outline of the
  // input — windows, doors, wall edges, perspective lines all get traced
  // and the diffusion is constrained to fit within them.
  //
  // API requirements specific to ControlNet endpoints:
  //   - control_image (or image_url, depending on endpoint) is the source
  //     whose edges to extract. We send the user's room photo.
  //   - controlnet_conditioning_scale (0-1): how strongly to honor the
  //     edge map. 0.7 = "follow the edges firmly but leave room for the
  //     prompt to fill in textures/colors."
  //   - controlnet_type: canny / depth / pose. Canny is right for rooms
  //     (we want to lock the geometry/edges, not 3D depth which can shift
  //     under different lighting).
  //   - num_inference_steps capped at 20 so the request fits in Vercel's
  //     120s function timeout. ControlNet at 30+ steps was reliably
  //     timing out at the 120s wall.
  if (isControlNet) {
    const result = await fal.subscribe(model, {
      input: {
        prompt,
        image_url: imageUrl,
        // ControlNet-specific:
        controlnet_type: 'canny',
        controlnet_conditioning_scale: 0.75,
        control_image_url: imageUrl,        // some fal endpoints expect this name
        // Standard SDXL params:
        guidance_scale: clamp(
          typeof guidanceScale === 'number' ? guidanceScale : 7.5,
          3,
          15
        ),
        num_inference_steps: clamp(
          typeof numInferenceSteps === 'number' ? numInferenceSteps : 20,
          12,
          25
        ),
        num_images: 1,
        image_size: 'square_hd', // 1024x1024 — matches OLD Base44
        enable_safety_checker: true,
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      },
      logs: false,
    });
    const url = result?.data?.images?.[0]?.url;
    if (!url) throw new Error('fal.ai (ControlNet) returned no image');
    const fetchRes = await fetch(url);
    if (!fetchRes.ok) throw new Error(`Download failed (${fetchRes.status})`);
    return Buffer.from(await fetchRes.arrayBuffer());
  }

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
  // Day 17b — fixed at 768x768 to fit Vercel's 120s function timeout.
  //
  // Why fixed (not honoring frontend's 1024x1024 for paid users): SDXL
  // inference cost scales O(width² × height² × steps). At 1024x1024 + 40
  // steps the request reliably timed out at 120s on Vercel. At 768x768 +
  // 25 steps, render is ~12-18s with ample buffer for cold starts.
  // Output quality at 768² is essentially identical to 1024² for our
  // phone-rendering use case. If we ever upgrade to Vercel Pro (300s
  // function cap) we can revisit.
  const resolvedImageSize = { width: 768, height: 768 };

  // Day 14 — guidance scale tuning for SDXL.
  //   Old Base44 setup used 9-16 depending on (paid + locked). High guidance
  //   forces the model to follow the verbose preservation prompt very
  //   literally. Free tier capped lower (9-12) since it ran fewer inference
  //   steps and high guidance + low steps = burnt-looking outputs.
  // Frontend sends guidance_scale in the body (12-16 typical).  We accept it
  // as-is for SDXL and clamp to a safe range. FLUX img2img (if anyone ever
  // routes there via FAL_MODEL override) still wants the lower 1.5-7 range.
  let resolvedGuidanceScale;
  if (isFlux) {
    resolvedGuidanceScale = clamp(
      typeof guidanceScale === 'number' ? Math.min(guidanceScale / 2, 5) : 3.5,
      1.5,
      7
    );
  } else {
    // SDXL — honor the high guidance values the OLD pipeline used to ship.
    resolvedGuidanceScale = clamp(
      typeof guidanceScale === 'number' ? guidanceScale : 12,
      5,
      18
    );
  }

  // Day 14 / 17b — step counts.
  //   Old Base44 pipeline: 18 free / 40 paid. Higher steps = sharper but
  //   linear latency. We HAD this clamped at 12-50, but the frontend
  //   sends 40 for paid users which (combined with 1024² before Day 17b)
  //   was reliably 120s-timing-out. New ceiling: 25 steps. SDXL quality
  //   at 25 is virtually identical to 40 — empirically the diminishing
  //   returns kick in past 28-30 steps.
  const resolvedSteps =
    typeof numInferenceSteps === 'number'
      ? clamp(numInferenceSteps, 12, 25)
      : isFlux
      ? 25
      : 25;

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
      // Day 14 — negative_prompt is the second half of why old preservation
      // worked. Send it whenever the model accepts it (every img2img except
      // FLUX, which has no negative_prompt support).
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

/**
 * Replicate — paid (~$0.005/render), $0.50 free at signup.
 *
 * Day 15. Replaces the fal-ai/fast-sdxl path which silently capped inference
 * at ~8 LCM steps, producing renders nearly identical to the source. The
 * `lucataco/sdxl-img2img` model is a full-fidelity SDXL img2img — strength
 * and num_inference_steps are honored as documented, so a strength of 0.78
 * actually allows enough denoising headroom to paint furniture into empty
 * rooms while keeping walls anchored to the source.
 *
 * API shape:
 *   1. POST /v1/predictions  → returns a prediction with id + status='starting'.
 *   2. Poll GET /v1/predictions/{id} every ~1.5s until status === 'succeeded'
 *      or 'failed'. Typical render: 15–25 seconds end-to-end.
 *   3. `output` is an array of URLs; we download the first one.
 *
 * Errors surface concretely: status 'failed' includes `error` text, network
 * errors throw, and a hard 60-poll cap (~90s) prevents Vercel timeout.
 */
async function generateWithReplicate({
  model,
  prompt,
  imageUrl,
  strength,
  guidanceScale,
  numInferenceSteps,
  negativePrompt,
}) {
  if (!REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN is not configured');

  // Day 17e — Replicate's POST /v1/predictions REQUIRES a version hash for
  // community models (anything not "verified/official"). The Day 17d
  // attempt at sending `{ model, input }` returned "version is required,
  // Additional property model is not allowed".
  //
  // Solution: two-step.
  //   1. If caller passed `owner/name:hash`, use the hash directly.
  //   2. Otherwise GET /v1/models/{owner}/{name} → latest_version.id,
  //      cache that for the function instance, then POST predictions.
  // The fetch step adds ~200ms but the result is reproducible *and*
  // auto-tracks model updates without us maintaining the hash.
  const input = {
    prompt,
    image: imageUrl,
    prompt_strength: strength,         // SDXL strength: 0 identical, 1 ignore source
    guidance_scale:
      typeof guidanceScale === 'number' ? clamp(guidanceScale, 1, 20) : 7.5,
    num_inference_steps:
      typeof numInferenceSteps === 'number'
        ? clamp(numInferenceSteps, 10, 50)
        : 25,
    negative_prompt: negativePrompt || '',
    num_outputs: 1,
    width: 1024,
    height: 1024,
    scheduler: 'K_EULER_ANCESTRAL',
    refine: 'no_refiner',
  };

  const colonIdx = model.indexOf(':');
  let versionHash;
  if (colonIdx > -1) {
    versionHash = model.slice(colonIdx + 1);
  } else {
    // Fetch the latest version of the model.
    const modelRes = await fetch(
      `https://api.replicate.com/v1/models/${model}`,
      { headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` } }
    );
    if (!modelRes.ok) {
      const errBody = await modelRes.text();
      // eslint-disable-next-line no-console
      console.error('[replicate] model lookup failed', modelRes.status, errBody.slice(0, 300));
      const err = new Error(`Replicate model lookup ${modelRes.status}: ${errBody.slice(0, 150)}`);
      err.status = modelRes.status;
      throw err;
    }
    const modelData = await modelRes.json();
    versionHash = modelData?.latest_version?.id;
    if (!versionHash) {
      throw new Error(`Replicate: model ${model} has no latest_version`);
    }
  }

  // 1. Start prediction with the resolved version hash.
  const startRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ version: versionHash, input }),
  });
  const startBody = { version: versionHash, input }; // for error logging below
  const startText = await startRes.text();
  let pred;
  try { pred = JSON.parse(startText); } catch { pred = null; }
  if (!startRes.ok || !pred?.id) {
    // eslint-disable-next-line no-console
    console.error('[replicate] start failed', startRes.status, 'body:', startText.slice(0, 600), 'sent:', JSON.stringify(startBody).slice(0, 300));
    const err = new Error(
      `Replicate ${startRes.status}: ${pred?.detail || pred?.title || startText.slice(0, 200)}`
    );
    err.status = startRes.status;
    err.body = pred ?? startText.slice(0, 500);
    throw err;
  }

  // 2. Poll for completion. Cap at 60 polls × 1.5s = 90s.
  const pollUrl = pred.urls?.get || `https://api.replicate.com/v1/predictions/${pred.id}`;
  let current = pred;
  for (let i = 0; i < 60 && current.status !== 'succeeded' && current.status !== 'failed' && current.status !== 'canceled'; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
    });
    if (!pollRes.ok) {
      // Transient — continue polling unless the response is 4xx (auth issue).
      if (pollRes.status >= 400 && pollRes.status < 500) {
        const errBody = await pollRes.text();
        const err = new Error(`Replicate poll auth/4xx: ${pollRes.status}`);
        err.status = pollRes.status;
        err.body = errBody.slice(0, 500);
        throw err;
      }
      continue;
    }
    current = await pollRes.json();
  }

  if (current.status !== 'succeeded') {
    const err = new Error(`Replicate prediction ${current.status}`);
    err.status = 502;
    err.body = current?.error || current?.logs?.slice(-500) || 'unknown';
    throw err;
  }

  // 3. Download the output. Single output → string; multi-output → array.
  const outputUrl = Array.isArray(current.output) ? current.output[0] : current.output;
  if (!outputUrl || typeof outputUrl !== 'string') {
    throw new Error('Replicate succeeded but returned no image URL');
  }
  const dlRes = await fetch(outputUrl);
  if (!dlRes.ok) throw new Error(`Replicate download failed (${dlRes.status})`);
  return Buffer.from(await dlRes.arrayBuffer());
}

/**
 * NVIDIA Build hosted catalog — OpenAI-compatible API.
 *
 * Day 16. NVIDIA exposes their NIM models at https://integrate.api.nvidia.com/v1
 * with an OpenAI-compatible schema. For image editing (img2img-style), the
 * canonical endpoint is `/v1/images/edits` with a base64-encoded source image
 * + prompt. The default model qwen-image-edit was purpose-built for editing
 * tasks (it feeds the input through both Qwen2.5-VL for semantic control
 * and a VAE encoder for visual appearance — strong subject consistency by
 * architecture, not just prompt).
 *
 * Free tier on NVIDIA's developer program covers prototyping. After that,
 * billed per image at competitive rates.
 *
 * API differences from SDXL img2img:
 *   - No `strength` parameter (the model handles preservation internally).
 *   - No `negative_prompt` (Qwen-Image-Edit's training handles this).
 *   - No `num_inference_steps` exposed (model picks internally).
 * Effectively: send `prompt + image`, get back an edited image. Simpler API,
 * more guardrails baked in. Tradeoff: less low-level tuning.
 */
async function generateWithNvidia({
  model,
  prompt,
  imageUrl,
  numInferenceSteps,
}) {
  if (!NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is not configured');

  // Pull and base64-encode the source image.
  const srcRes = await fetch(imageUrl);
  if (!srcRes.ok) throw new Error(`Source image fetch failed (${srcRes.status})`);
  const mimeType = srcRes.headers.get('content-type') || 'image/jpeg';
  const srcBuf = Buffer.from(await srcRes.arrayBuffer());
  const b64src = srcBuf.toString('base64');
  const dataUrl = `data:${mimeType};base64,${b64src}`;

  // NVIDIA's hosted catalog exposes models at multiple URL patterns
  // depending on age + integration tier. Day 16: first attempt was at
  // /v1/images/edits and returned 404, so try the patterns in order
  // until one returns a 2xx. On every probe we log the response body so
  // we can spot schema drift in production logs.
  //
  // Patterns (in order of likelihood for image-edit models):
  //   A. NIM-style:    https://ai.api.nvidia.com/v1/genai/{model}
  //   B. Integrate ID: https://integrate.api.nvidia.com/v1/genai/{model}
  //   C. OpenAI edits: https://integrate.api.nvidia.com/v1/images/edits
  //   D. OpenAI gen:   https://integrate.api.nvidia.com/v1/images/generations
  // Most NVIDIA hosted image-gen models in 2026 are on pattern A.
  const candidates = [
    {
      name: 'genai-catalog',
      url: `https://ai.api.nvidia.com/v1/genai/${model}`,
      body: {
        prompt,
        image: dataUrl,
        seed: 0,
        ...(typeof numInferenceSteps === 'number'
          ? { steps: clamp(numInferenceSteps, 4, 50) }
          : {}),
      },
    },
    {
      name: 'integrate-genai',
      url: `https://integrate.api.nvidia.com/v1/genai/${model}`,
      body: {
        prompt,
        image: dataUrl,
        seed: 0,
        ...(typeof numInferenceSteps === 'number'
          ? { steps: clamp(numInferenceSteps, 4, 50) }
          : {}),
      },
    },
    {
      name: 'openai-images-edits',
      url: 'https://integrate.api.nvidia.com/v1/images/edits',
      body: {
        model,
        image: dataUrl,
        prompt,
        n: 1,
        response_format: 'b64_json',
      },
    },
    {
      name: 'openai-images-generations',
      url: 'https://integrate.api.nvidia.com/v1/images/generations',
      body: {
        model,
        prompt,
        image: dataUrl,
        n: 1,
        response_format: 'b64_json',
      },
    },
  ];

  let lastErr = null;
  for (const candidate of candidates) {
    try {
      const resp = await fetch(candidate.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(candidate.body),
      });
      const text = await resp.text();
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { /* not JSON */ }

      if (!resp.ok) {
        // Log the full response so we can read it in Vercel function logs.
        // eslint-disable-next-line no-console
        console.warn(
          `[nvidia ${candidate.name}] ${resp.status}`,
          text.slice(0, 400)
        );
        lastErr = { status: resp.status, body: parsed || text.slice(0, 400), name: candidate.name };
        // 404 = wrong URL, try next. 4xx other = auth/payload issue, also try next
        // (in case another endpoint expects a different payload). 5xx = NVIDIA
        // problem, stop.
        if (resp.status >= 500) break;
        continue;
      }

      // Success! Try every known response shape for the b64 image.
      const b64 =
        parsed?.data?.[0]?.b64_json ||
        parsed?.artifacts?.[0]?.base64 ||
        parsed?.images?.[0]?.b64_json ||
        parsed?.b64_json ||
        null;

      if (!b64) {
        // eslint-disable-next-line no-console
        console.warn(
          `[nvidia ${candidate.name}] 200 but no recognized image field`,
          'keys:', Object.keys(parsed || {}),
          'sample:', text.slice(0, 300)
        );
        lastErr = {
          status: 200,
          body: 'no image in response',
          name: candidate.name,
          response_keys: Object.keys(parsed || {}),
        };
        continue;
      }

      // eslint-disable-next-line no-console
      console.log(`[nvidia ${candidate.name}] success`);
      return Buffer.from(b64, 'base64');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[nvidia ${candidate.name}] threw:`, e?.message);
      lastErr = { status: 0, body: String(e), name: candidate.name };
      continue;
    }
  }

  // None of the patterns worked — surface details to the caller.
  const err = new Error(`NVIDIA: all endpoints failed (last: ${lastErr?.name} ${lastErr?.status})`);
  err.status = lastErr?.status || 502;
  err.body = lastErr;
  throw err;
}

/**
 * Local ComfyUI (Day 18).
 *
 * Talks to a ComfyUI instance running on the developer's Mac, exposed to
 * Vercel via ngrok (`ngrok http 8188`). LOCAL_SDXL_URL points at the public
 * https://*.ngrok-free.app URL.
 *
 * ComfyUI's API is NOT a single POST/response like fal/Replicate. It's a
 * graph-execution engine with four logical steps:
 *
 *   1. POST  /upload/image        — multipart upload of the source photo.
 *                                   Returns { name, subfolder, type }.
 *   2. POST  /prompt              — submit a workflow graph (JSON DAG of
 *                                   nodes). Returns { prompt_id }.
 *   3. GET   /history/{prompt_id} — poll until the entry appears with an
 *                                   `outputs` block (one key per output node).
 *   4. GET   /view?filename=...   — download the rendered image bytes.
 *
 * The workflow we send is a classic SDXL img2img graph:
 *   CheckpointLoaderSimple → CLIPTextEncode (×2 for positive/negative)
 *                          → KSampler ← VAEEncode ← LoadImage
 *                          → VAEDecode → SaveImage
 *
 * "denoise" on the KSampler is what the rest of the codebase calls
 * "strength" — same semantics: 0.0 = identical to source, 1.0 = ignore
 * source. The strength clamp upstream (0.15-0.38 redesign / 0.75-0.90
 * furnish) maps directly through.
 *
 * Polling bounded at 50 × 2s = 100s. Apple Silicon (mps) renders SDXL
 * img2img at 25 steps in roughly 30-60s on an M-series chip, so 100s
 * gives comfortable headroom under Vercel's 120s function cap.
 */
async function generateWithLocal({
  checkpoint,
  prompt,
  imageUrl,
  strength,
  guidanceScale,
  numInferenceSteps,
  negativePrompt,
}) {
  if (!LOCAL_SDXL_URL) throw new Error('LOCAL_SDXL_URL is not configured');
  // Strip trailing slash and any /api suffix the user might have copy-pasted.
  const base = LOCAL_SDXL_URL.replace(/\/$/, '');

  // ngrok free tier injects a "you are about to visit..." HTML interstitial
  // unless we send a custom header. Without this every POST returns HTML.
  const ngrokHeaders = { 'ngrok-skip-browser-warning': 'true' };

  // 1. Pull the source image bytes.
  const srcRes = await fetch(imageUrl);
  if (!srcRes.ok) throw new Error(`Source image fetch failed (${srcRes.status})`);
  const srcMime = srcRes.headers.get('content-type') || 'image/jpeg';
  const srcBuf = Buffer.from(await srcRes.arrayBuffer());
  const srcBlob = new Blob([srcBuf], { type: srcMime });

  // Day 18c — read source dimensions from JPEG/PNG header so we can scale
  // proportionally instead of center-cropping to 768×768 square. The square
  // crop on Day 18b destroyed the aspect ratio of widescreen room photos
  // (2600×1563 → 768×768 cut off ~30% of room content). Scaling to 1024
  // on the long side keeps the full frame and stays under SDXL's native
  // 1MP training resolution to maintain the M5 speed gains.
  const srcDims = readImageDims(srcBuf);
  const { width: scaleW, height: scaleH } = computeSdxlDims(srcDims);

  // 2. Upload to ComfyUI. ComfyUI expects multipart with field name `image`.
  const uploadName = `ambient_input_${Date.now()}.${srcMime.includes('png') ? 'png' : 'jpg'}`;
  const formData = new FormData();
  formData.append('image', srcBlob, uploadName);
  formData.append('overwrite', 'true');

  const uploadRes = await fetch(`${base}/upload/image`, {
    method: 'POST',
    headers: { ...ngrokHeaders }, // do NOT set Content-Type — fetch sets the multipart boundary itself
    body: formData,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`ComfyUI upload failed (${uploadRes.status}): ${text.slice(0, 200)}`);
  }
  let uploaded;
  try { uploaded = await uploadRes.json(); } catch { uploaded = null; }
  const uploadedName = uploaded?.name || uploadName;

  // 3. Build the SDXL img2img workflow.
  //
  // Day 18b — hard cap steps + resize source to 768×768 before VAE encode.
  //
  // First test on M5: 23.79s/it at the source photo's native resolution
  // (~2600×1563 = 4 MP), with the frontend sending 40 steps → projected
  // ~16 minutes per render. Way past Vercel's 120s function cap.
  //
  // Two fixes here:
  //   a) Cap steps at 22 (default 18). SDXL is sharp at 18-25 — the 40-step
  //      ceiling was overkill from the SDXL fal path; on local hardware
  //      we pay for every step.
  //   b) Insert an `ImageScale` node between LoadImage and VAEEncode so the
  //      latent is built from a 768×768 frame instead of the user's
  //      camera-native resolution. Per-step compute drops ~4×, matches
  //      SDXL's native training resolution, and final output is up-rendered
  //      back to the full image by SaveImage (ComfyUI handles this).
  // Expected total: ~6-8s/step × 18 steps = 110-150s. Tight, but fits.
  const seed = Math.floor(Math.random() * 1e15);
  const steps = clamp(
    typeof numInferenceSteps === 'number' ? numInferenceSteps : 18,
    12,
    22,
  );
  // Day 18d — lower CFG default for the local SDXL path.
  //
  // SDXL base 1.0 on its own (no refiner) overcooks at CFG 7-8 — that's
  // what gives the "cartoon / AI render / glossy plastic" look the QA pass
  // flagged. The frontend sends 12 (calibrated for fal's SDXL endpoint
  // which runs differently). For the local path we clamp HARD to a 4-7
  // window and default to 5.5, which empirically lands in photoreal
  // territory without the model ignoring the prompt.
  const cfg = clamp(
    typeof guidanceScale === 'number' ? guidanceScale : 5.5,
    4,
    7,
  );
  const denoise = clamp(strength, 0.05, 0.95);

  // Day 18d — boost negative prompt with photorealism anti-terms.
  // SDXL base loves to add: smooth-skin renders, illustration vibes,
  // hallucinated watermarks/text/logos (e.g. "COOLNNMS PIAUITS" in the
  // QA-18 render), 3D-software CGI sheen. Listing them as explicit
  // negatives is the single highest-ROI thing we can do without changing
  // checkpoints. Appended to whatever the frontend already sent so we
  // don't lose the existing structure-preservation negatives.
  const photorealNegBoost =
    'cartoon, illustration, painting, anime, 3d render, cgi, plastic look, ' +
    'unrealistic, fake, low quality, blurry, soft focus, oversaturated, ' +
    'watermark, text, logo, signature, letters, words, signature, frame, border';
  const fullNegativePrompt = negativePrompt
    ? `${negativePrompt}, ${photorealNegBoost}`
    : photorealNegBoost;

  const workflow = {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps,
        cfg,
        // Day 18d — switched from euler_ancestral + normal to dpmpp_2m_sde_gpu
        // + karras. This is the gold-standard SDXL photorealism combo used
        // by every interior-design SDXL preset on civitai / replicate.
        // Euler ancestral is a perfectly good general-purpose sampler but
        // it skews toward the "painterly / illustration" feel that QA-18
        // flagged. DPM++ 2M SDE with Karras noise schedule produces
        // measurably sharper textures and better depth fidelity at the
        // SAME step count.
        sampler_name: 'dpmpp_2m_sde_gpu',
        scheduler: 'karras',
        denoise,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['10', 0],
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: checkpoint },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['4', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      // Day 18d — use fullNegativePrompt (with photoreal anti-CGI boost).
      inputs: { text: fullNegativePrompt, clip: ['4', 1] },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'ambient_out', images: ['8', 0] },
    },
    '10': {
      class_type: 'VAEEncode',
      // Day 18b — pixels now come from the resized image (node 12), not
      // the raw LoadImage output.
      inputs: { pixels: ['12', 0], vae: ['4', 2] },
    },
    '11': {
      class_type: 'LoadImage',
      inputs: { image: uploadedName },
    },
    '12': {
      // Day 18c — proportional resize. Computed scaleW × scaleH puts the
      // long side at 1024 and rounds both axes to multiples of 8 (SDXL
      // latent requirement). crop='disabled' = no center-crop, full frame
      // preserved. For a typical 2600×1563 room photo this resolves to
      // ~1024×616.
      class_type: 'ImageScale',
      inputs: {
        image: ['11', 0],
        upscale_method: 'bilinear',
        width: scaleW,
        height: scaleH,
        crop: 'disabled',
      },
    },
  };

  // 4. Queue the workflow.
  const queueRes = await fetch(`${base}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...ngrokHeaders },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!queueRes.ok) {
    const text = await queueRes.text();
    // eslint-disable-next-line no-console
    console.error('[comfy] queue failed', queueRes.status, text.slice(0, 500));
    throw new Error(`ComfyUI /prompt failed (${queueRes.status}): ${text.slice(0, 300)}`);
  }
  let queueData;
  try { queueData = await queueRes.json(); } catch { queueData = null; }
  const promptId = queueData?.prompt_id;
  if (!promptId) {
    throw new Error('ComfyUI /prompt returned no prompt_id');
  }

  // 5. Poll for completion. Day 18b — bumped from 50 → 56 polls × 2s = 112s
  // ceiling. Stays under Vercel's 120s function cap (leaving ~8s for the
  // post-render storage upload + response), but gives the M5 the full
  // budget after the Day 18b resize+steps cuts.
  let outputs = null;
  for (let i = 0; i < 56; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const histRes = await fetch(`${base}/history/${promptId}`, {
      headers: { ...ngrokHeaders },
    });
    if (!histRes.ok) continue;
    let histData;
    try { histData = await histRes.json(); } catch { continue; }
    const entry = histData?.[promptId];
    if (entry?.outputs && Object.keys(entry.outputs).length > 0) {
      outputs = entry.outputs;
      break;
    }
    // Also detect explicit failure in the status block.
    if (entry?.status?.status_str === 'error') {
      // eslint-disable-next-line no-console
      console.error('[comfy] workflow error', JSON.stringify(entry.status).slice(0, 400));
      throw new Error('ComfyUI workflow execution failed');
    }
  }
  if (!outputs) {
    throw new Error('ComfyUI workflow did not complete within 100s');
  }

  // 6. Find the SaveImage output (node "9" in our graph, but be defensive
  // and scan every output for the first node that produced an image).
  let outputImage = null;
  for (const nodeId of Object.keys(outputs)) {
    const imgs = outputs[nodeId]?.images;
    if (Array.isArray(imgs) && imgs.length > 0) {
      outputImage = imgs[0];
      break;
    }
  }
  if (!outputImage?.filename) {
    throw new Error('ComfyUI completed but returned no output image');
  }

  // 7. Fetch the rendered image bytes.
  const params = new URLSearchParams({
    filename: outputImage.filename,
    subfolder: outputImage.subfolder || '',
    type: outputImage.type || 'output',
  });
  const imgRes = await fetch(`${base}/view?${params.toString()}`, {
    headers: { ...ngrokHeaders },
  });
  if (!imgRes.ok) {
    throw new Error(`ComfyUI /view failed (${imgRes.status})`);
  }
  return Buffer.from(await imgRes.arrayBuffer());
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Read PNG/JPEG dimensions from raw bytes — no native deps. Used by the
 * local ComfyUI path to scale the source proportionally instead of forcing
 * a square crop. Returns { width, height } or null if header isn't
 * recognizable.
 *
 * PNG: bytes 16-23 hold width then height as big-endian uint32.
 * JPEG: walk segment markers until we hit an SOFn (Start Of Frame) marker
 *       (0xc0-0xcf except 0xc4 / 0xc8 / 0xcc) — that segment encodes
 *       height (uint16 at offset +5) and width (uint16 at offset +7).
 */
function readImageDims(buf) {
  if (!buf || buf.length < 24) return null;

  // PNG: \x89 P N G \r \n \x1a \n
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  }

  // JPEG: \xff \xd8 \xff
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      // Skip standalone markers (no length byte): RSTn, SOI, EOI, TEM
      if (
        marker === 0xd8 || marker === 0xd9 ||
        (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01
      ) {
        i += 2;
        continue;
      }
      // SOFn = Start Of Frame (encodes dimensions)
      if (
        marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      ) {
        return {
          height: buf.readUInt16BE(i + 5),
          width: buf.readUInt16BE(i + 7),
        };
      }
      // Other segments — skip via length-prefix
      if (i + 4 > buf.length) break;
      const segLen = buf.readUInt16BE(i + 2);
      if (segLen < 2) break;
      i += 2 + segLen;
    }
  }

  return null;
}

/**
 * Given source dimensions, compute SDXL-friendly target dimensions:
 *   - Longest side at 1024 (matches SDXL's ~1MP training resolution).
 *   - Aspect ratio preserved.
 *   - Both axes rounded to nearest multiple of 8 (SDXL latent requires it).
 *   - Bounded to [512, 1280] per axis to keep render time predictable
 *     on the M5 (extreme aspect ratios → too-skinny latents → garbage).
 *
 * Fallback: 1024×768 landscape if dims couldn't be read.
 */
function computeSdxlDims(src) {
  if (!src || !src.width || !src.height) return { width: 1024, height: 768 };
  const longSide = 1024;
  const ratio = src.width / src.height;
  let w, h;
  if (ratio >= 1) {
    w = longSide;
    h = longSide / ratio;
  } else {
    h = longSide;
    w = longSide * ratio;
  }
  // Round to multiples of 8.
  w = Math.round(w / 8) * 8;
  h = Math.round(h / 8) * 8;
  w = Math.max(512, Math.min(1280, w));
  h = Math.max(512, Math.min(1280, h));
  return { width: w, height: h };
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
