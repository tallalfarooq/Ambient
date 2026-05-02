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
  fal: 'fal-ai/fast-sdxl/image-to-image', // ~$0.003/img, SDXL
  together: 'black-forest-labs/FLUX.1-schnell-Free', // free with $5 trial
};

// === Handler =================================================================

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
    negative_prompt,
    mode,
    model,
    design_id,
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

  // 1. Atomic credit debit (CAS).
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

  if (creditsRow.credits_remaining < CREDITS_PER_GENERATION) {
    return json(res, 402, {
      error: 'Out of credits',
      credits_remaining: creditsRow.credits_remaining,
      plan_type: creditsRow.plan_type,
    });
  }

  const newBalance = creditsRow.credits_remaining - CREDITS_PER_GENERATION;
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

  const refund = async (reason) => {
    // eslint-disable-next-line no-console
    console.warn('[api/generate] refunding credit:', reason);
    await supabaseAdmin
      .from('user_credits')
      .update({ credits_remaining: creditsRow.credits_remaining })
      .eq('id', creditsRow.id);
  };

  // 2. Strength clamp — wider range for "furnish empty room" mode.
  const isFurnish = mode === 'furnish';
  const safeStrength = clamp(
    typeof strength === 'number' ? strength : isFurnish ? 0.85 : 0.6,
    0.2,
    isFurnish ? 0.95 : 0.85
  );

  // 3. Generate via the configured provider.
  let imageBuffer;
  try {
    if (PROVIDER === 'huggingface') {
      imageBuffer = await generateWithHuggingFace({
        model: model || DEFAULT_MODELS.huggingface,
        prompt,
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
        prompt,
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
        prompt,
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
  });
}

// =============================================================================
// Provider implementations
// =============================================================================

/**
 * Hugging Face Inference API — free tier, slower (cold starts), SDXL refiner.
 * Returns a Buffer of JPEG bytes.
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
  if (!hf) throw new Error('HUGGINGFACE_API_KEY is not configured');

  // Pull the source image as a Blob for the SDK.
  const sourceRes = await fetch(imageUrl);
  if (!sourceRes.ok) {
    throw new Error(`Source image fetch failed (${sourceRes.status})`);
  }
  const sourceBlob = await sourceRes.blob();

  const result = await hf.imageToImage(
    {
      model,
      inputs: sourceBlob,
      parameters: {
        prompt,
        strength,
        guidance_scale: typeof guidanceScale === 'number' ? guidanceScale : 7.5,
        num_inference_steps:
          typeof numInferenceSteps === 'number' ? numInferenceSteps : 30,
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      },
    },
    {
      // Wait through cold-start instead of erroring out with 503.
      wait_for_model: true,
      use_cache: false,
    }
  );

  // Result is a Blob.
  const arrayBuf = await result.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * fal.ai — paid, fast, high quality. Currently using fast-sdxl as a cheap default.
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

  const falResult = await fal.subscribe(model, {
    input: {
      prompt,
      image_url: imageUrl,
      strength,
      guidance_scale: typeof guidanceScale === 'number' ? guidanceScale : 7.5,
      num_inference_steps:
        typeof numInferenceSteps === 'number' ? numInferenceSteps : 30,
      image_size: resolvedImageSize,
      num_images: 1,
      enable_safety_checker: true,
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
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
