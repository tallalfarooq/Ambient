/**
 * Vision pre-step for /api/generate.
 *
 * Day 10.6 (revision) — after Path A (kontext-max) and Path B (mask
 * inpainting) both produced unhappy renders, we're staying on prompt-only
 * structure preservation but giving the prompt much harder constraints.
 *
 * The previous wording — "If source walls are grey, output walls are grey"
 * — was vague enough that the model still defaulted to its style-trained
 * priors (Industrial → cream walls, Boho → warm earth tones, etc.) and
 * silently overrode the source.
 *
 * The fix: detect the source room's actual paint colors with Gemini Vision
 * before generating, then pass those concrete values straight into the
 * prompt: "Walls are #3D3D40 (medium-dark grey). Repaint walls in #3D3D40
 * (medium-dark grey)." Concrete hex values + named colors are much harder
 * for Kontext to drift away from.
 *
 * Cost: one Gemini Flash call (free tier) + ~1.5s of latency.
 * Failure: returns null so the caller falls back to the older prompt.
 */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const COLOR_DETECTION_PROMPT = `You are inspecting a room photo. Return the dominant paint and material colors of the architectural elements ONLY (not furniture, not decor, not soft furnishings).

For each element below, return:
  - hex: a 6-digit hex code closest to the dominant color in that element
  - name: a short human-readable color name (e.g. "warm white", "medium grey", "light oak")
  - confidence: "high" | "medium" | "low"

If an element is not visible in the photo, set confidence to "low" and your best guess.

Elements to score:
  - walls         (the painted wall surface; if multiple wall colors, return the dominant one)
  - ceiling       (the ceiling surface)
  - floor         (the floor material — color of the wood/tile/carpet, not throw rugs)
  - trim          (window/door frames, baseboards — usually white but may be black/dark)

Be precise. The hex code matters more than the name.`;

// Day 12 — flat schema. Gemini's `responseSchema` dialect rejects deeply
// nested objects-of-objects with required arrays — in QA-10 the live
// /api/generate response showed `detected_colors: null` for every render
// because the previous nested shape never validated. Flat keys
// (walls_hex, walls_name, …) all serialize cleanly. The clause-builder
// downstream re-assembles the structure.
const COLOR_SCHEMA = {
  type: 'object',
  properties: {
    walls_hex:        { type: 'string' },
    walls_name:       { type: 'string' },
    walls_confidence: { type: 'string' },
    ceiling_hex:        { type: 'string' },
    ceiling_name:       { type: 'string' },
    ceiling_confidence: { type: 'string' },
    floor_hex:        { type: 'string' },
    floor_name:       { type: 'string' },
    floor_confidence: { type: 'string' },
    trim_hex:        { type: 'string' },
    trim_name:       { type: 'string' },
    trim_confidence: { type: 'string' },
  },
  required: [
    'walls_hex', 'walls_name', 'walls_confidence',
    'ceiling_hex', 'ceiling_name', 'ceiling_confidence',
    'floor_hex', 'floor_name', 'floor_confidence',
    'trim_hex', 'trim_name', 'trim_confidence',
  ],
};

// Re-shape Gemini's flat response back into the {walls:{hex,name,confidence}…}
// structure the rest of the codebase expects.
function unflatten(flat) {
  if (!flat) return null;
  const els = ['walls', 'ceiling', 'floor', 'trim'];
  const out = {};
  for (const el of els) {
    out[el] = {
      hex: flat[`${el}_hex`] || null,
      name: flat[`${el}_name`] || null,
      confidence: flat[`${el}_confidence`] || 'low',
    };
  }
  return out;
}

/**
 * Detect the architectural colors of a room photo. Returns
 *   { walls: { hex, name, confidence }, ceiling: ..., floor: ..., trim: ... }
 * or null on failure.
 */
export async function detectRoomColors(imageUrl) {
  if (!GEMINI_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[vision] GEMINI_API_KEY missing — skipping color detection');
    return null;
  }
  if (!imageUrl) return null;

  try {
    // Fetch the source image and inline as base64 (Gemini doesn't accept URLs).
    const r = await fetch(imageUrl);
    if (!r.ok) throw new Error(`source fetch ${r.status}`);
    const mimeType = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());

    const body = {
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: buf.toString('base64') } },
          { text: COLOR_DETECTION_PROMPT },
        ],
      }],
      generationConfig: {
        temperature: 0.1, // very low — we want deterministic color reads
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
        responseSchema: COLOR_SCHEMA,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${text.slice(0, 200)}`);

    const parsed = JSON.parse(text);
    const candidateText = parsed?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!candidateText) throw new Error('empty response');
    // Day 12 — the schema is flat now (walls_hex / walls_name / …); reshape
    // back to the nested form the prompt clause builder expects.
    return unflatten(JSON.parse(candidateText));
  } catch (err) {
    // Non-fatal — caller falls back to the older preservation phrasing.
    // eslint-disable-next-line no-console
    console.warn('[vision] color detection failed:', err?.message || err);
    return null;
  }
}

/**
 * Format a detected-colors object into prompt-ready clauses.
 *
 * Returns { wallClause, floorClause, ceilingClause } — short imperative
 * sentences ready to drop into the preservation block. Returns nulls for
 * any element where the model wasn't confident.
 */
export function colorsToPromptClauses(colors) {
  if (!colors) return { wallClause: null, floorClause: null, ceilingClause: null };

  const fmt = (c) => {
    if (!c || c.confidence === 'low') return null;
    const hex = c.hex && c.hex.startsWith('#') ? c.hex.toUpperCase() : c.hex ? `#${c.hex.replace('#', '').toUpperCase()}` : null;
    const name = c.name?.trim();
    if (!hex && !name) return null;
    if (hex && name) return `${name} (${hex})`;
    return hex || name;
  };

  const wallDesc    = fmt(colors.walls);
  const floorDesc   = fmt(colors.floor);
  const ceilingDesc = fmt(colors.ceiling);

  const wallClause = wallDesc
    ? `Walls in source are ${wallDesc}. Output walls MUST be ${wallDesc} — match this color exactly. Do not lighten, darken, or shift hue.`
    : null;
  const floorClause = floorDesc
    ? `Floor in source is ${floorDesc}. Output floor MUST be ${floorDesc} — match this color and material exactly.`
    : null;
  const ceilingClause = ceilingDesc
    ? `Ceiling in source is ${ceilingDesc}. Output ceiling MUST be ${ceilingDesc}.`
    : null;

  return { wallClause, floorClause, ceilingClause };
}
