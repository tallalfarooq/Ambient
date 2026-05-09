/**
 * Path B — mask-based inpainting pipeline.
 *
 * Day 10.6. After three iterations of prompt engineering on FLUX Kontext
 * (Day 5.6, 6.8, 10.1) and a model swap to Kontext-MAX (Day 10.5) failed to
 * stop wall-color drift, we move structure preservation out of the prompt
 * layer entirely. The new pipeline:
 *
 *   1. Run a text-prompted segmentation model on the source photo to get a
 *      mask of the architecture: walls, ceiling, floor, windows, doors.
 *   2. Pass the source image + that mask + a style-only prompt to a FLUX
 *      inpainting model. The model is *physically incapable* of changing
 *      pixels outside the mask. Architecture is therefore preserved by
 *      construction, not by prompt.
 *
 * That removes the entire class of "you said preserve walls but they're
 * pink now" failures. Tradeoffs:
 *   - 2 fal calls per generation (~10–15s extra latency).
 *   - Furniture placement is constrained to the mask polygon, which can be
 *     awkward in tight rooms. We mitigate this by also masking out small
 *     flat surfaces in some configurations.
 *   - Mask quality is a new failure mode (e.g. ambiguous wall/window
 *     boundaries). On any failure here we fall back to the prompt-based
 *     Kontext path so the user still gets a render.
 *
 * Gating: opt-in via env var `USE_INPAINTING=true` or per-request
 * `body.use_inpainting === true`. Default OFF until we've shipped enough
 * real renders to compare quality side-by-side.
 *
 * Model choices are env-overridable so the fal.ai catalog can churn without
 * a code deploy:
 *   - FAL_SEGMENT_MODEL  (default: 'fal-ai/evf-sam')
 *   - FAL_INPAINT_MODEL  (default: 'fal-ai/flux-general/inpainting')
 *
 * Known good alternates if a default 404s on fal:
 *   - Segmentation:  'fal-ai/grounded-sam', 'fal-ai/florence-2-large/referring-expression-segmentation'
 *   - Inpainting:    'fal-ai/flux/dev/inpainting', 'fal-ai/flux-pro/v1/redux-inpaint'
 */
import { fal } from '@fal-ai/client';

const SEGMENT_MODEL = process.env.FAL_SEGMENT_MODEL || 'fal-ai/evf-sam';
const INPAINT_MODEL = process.env.FAL_INPAINT_MODEL || 'fal-ai/flux-general/inpainting';

// Architecture targets. Dot-separated phrasing works for grounded-DINO-style
// detectors; comma works for Florence/EVF. We send both joined by ". " so
// either parser interprets correctly.
const ARCHITECTURE_PROMPT = 'wall. ceiling. floor. window. door. window frame. door frame.';

/**
 * Returns the URL of a binary mask where the ARCHITECTURE pixels are white.
 * For inpainting we want the inverse (furniture area white), so the caller
 * passes `invert_mask: true` to the inpaint model.
 *
 * Shape-tolerant: different fal seg models return masks under different
 * field names. We probe a list and use the first hit.
 */
export async function getArchitectureMaskUrl(imageUrl) {
  const result = await fal.subscribe(SEGMENT_MODEL, {
    input: {
      image_url: imageUrl,
      // Both common parameter names are sent; the model ignores the one it
      // doesn't recognise. (evf-sam uses `prompt`, florence uses `text_input`,
      // grounded-sam uses `text_prompt`.)
      prompt: ARCHITECTURE_PROMPT,
      text_prompt: ARCHITECTURE_PROMPT,
      text_input: ARCHITECTURE_PROMPT,
    },
    logs: false,
  });

  const url =
    result?.data?.image?.url ||
    result?.data?.mask?.url ||
    result?.data?.images?.[0]?.url ||
    result?.data?.masks?.[0]?.url ||
    result?.data?.combined_mask?.url ||
    null;

  if (!url) {
    // eslint-disable-next-line no-console
    console.warn('[inpaint] segmentation result had no recognisable mask URL', {
      model: SEGMENT_MODEL,
      keys: Object.keys(result?.data || {}),
    });
    throw new Error('Segmentation returned no mask');
  }
  return url;
}

/**
 * Run FLUX inpainting on the source image, masked so only the furniture
 * area can be repainted.
 *
 * The mask we hand in marks ARCHITECTURE white. FLUX inpainting's convention
 * is "white = paint here", so we ask the model to invert via `invert_mask`.
 * If a particular flux endpoint doesn't honour that flag, the resulting
 * render will paint *over* walls instead of furniture — that's the obvious
 * visual signal to flip the mask client-side or in pre-processing.
 */
export async function runInpainting({ imageUrl, maskUrl, prompt, guidanceScale = 4.5, steps = 28 }) {
  const result = await fal.subscribe(INPAINT_MODEL, {
    input: {
      image_url: imageUrl,
      mask_url: maskUrl,
      prompt,
      // Treat the architecture mask as "preserve" instead of "paint".
      invert_mask: true,
      guidance_scale: guidanceScale,
      num_inference_steps: steps,
      num_images: 1,
      output_format: 'jpeg',
      enable_safety_checker: true,
    },
    logs: false,
  });

  const url = result?.data?.images?.[0]?.url;
  if (!url) {
    // eslint-disable-next-line no-console
    console.warn('[inpaint] inpaint result had no image URL', {
      model: INPAINT_MODEL,
      keys: Object.keys(result?.data || {}),
    });
    throw new Error('Inpainting returned no image');
  }
  return url;
}

/**
 * One-shot helper: source image + style prompt → inpainted image bytes.
 *
 * Throws on any sub-step failure so the caller can fall back to the
 * prompt-based Kontext path.
 */
export async function runInpaintingPipeline({ imageUrl, prompt, guidanceScale, steps }) {
  const maskUrl = await getArchitectureMaskUrl(imageUrl);
  const resultUrl = await runInpainting({ imageUrl, maskUrl, prompt, guidanceScale, steps });
  const r = await fetch(resultUrl);
  if (!r.ok) throw new Error(`Inpaint download failed (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}

/**
 * Build a prompt for the inpainting region only. Because the mask
 * physically protects architecture, the prompt doesn't need any
 * "PRESERVE walls/floor/ceiling" language — that vocabulary historically
 * confused the model into either over-painting or under-painting.
 *
 * Reuses the existing extraction patterns from generate.js's
 * extractUserOverrides + style/room/palette grabs, but emits a much
 * shorter prompt focused on what should appear in the masked region.
 */
export function buildInpaintingPrompt(verbosePrompt, mode) {
  const p = verbosePrompt || '';

  const styleMatch =
    p.match(/Apply\s+([\w\s-]+?)\s+interior design style/i) ||
    p.match(/(?:add realistic |Apply )([\w-]+)(?:-style| interior| style)/i) ||
    p.match(/\b(Japandi|Scandinavian|Mid-century|Modern|Industrial|Bohemian|Minimalist|Coastal|Farmhouse|Art Deco|Cottagecore|Contemporary|Maximalist|Boho)\b/i);
  const style = styleMatch?.[1]?.trim() || 'modern';

  const roomMatch = p.match(/to this\s+([\w\s]+?)(?:[:.]|$)/i);
  const room = roomMatch?.[1]?.trim().toLowerCase() || 'room';

  const includeMatch = p.match(/Include:\s*([^.]+)\./i);
  const furnitureList = includeMatch?.[1]?.trim();

  const paletteMatch = p.match(/Color palette:\s*([^.]+?)(?:\.|$)/i);
  const palette = paletteMatch?.[1]?.trim();

  const moodMatch = p.match(/Mood:\s*([^.]+?)(?:\.|$)/i);
  const mood = moodMatch?.[1]?.trim();

  // User overrides — same labels as extractUserOverrides but inlined here
  // so this module stays import-self-contained.
  const sofaColor = p.match(/Sofa\/seating upholstery:\s*([^.]+?)(?:\.|$)/i)?.[1]?.trim();
  const customNote = p.match(
    /(?:Ceiling:[^.]+\.|Flooring:[^.]+\.|Sofa\/seating upholstery:[^.]+\.|Wall color:[^.]+\.|Color palette:[^.]+\.)\s*([^.]+?)\.\s*(?:Mood:|Canon EOS|Photorealistic, 8K|Hyperrealistic, 8K|$)/i
  )?.[1]?.trim();

  const lead =
    mode === 'furnish'
      ? `Newly furnished ${room} in ${style} interior design style.`
      : `${room} freshly redesigned in ${style} interior design style — new furniture, upholstery, lighting, rugs, decor.`;

  const parts = [
    lead,
    sofaColor ? `Sofa upholstery in ${sofaColor}.` : null,
    furnitureList ? `Pieces: ${furnitureList}.` : null,
    palette ? `Accent colors: ${palette}.` : null,
    mood ? `Mood: ${mood.toLowerCase()}.` : null,
    customNote && customNote.length > 3 ? `${customNote}.` : null,
    'photorealistic interior photograph, natural light, magazine quality, 8k.',
  ].filter(Boolean);

  return parts.join(' ');
}
