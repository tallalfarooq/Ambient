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
// Day 19e — Three-provider vision fallback chain in priority order:
//   1. Groq (Llama 3.2 Vision)   — FREE tier, fast, no rate-limit issues in
//                                   testing. Set as PRIMARY because Gemini's
//                                   1500/day shared with prod kept 429-ing.
//   2. Gemini (Flash)             — FREE tier, 1500/day. Used as fallback.
//   3. Claude (Haiku/Sonnet)      — Paid. Last resort if both free tiers fail.
//
// Every function (analyzeScene, detectRoomColors) walks the chain and uses
// the first provider whose request succeeds. Failures are silent and
// fall through.
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_VISION_MODEL || 'claude-haiku-4-5-20251001';

/**
 * Call Groq's OpenAI-compatible chat completions endpoint with vision.
 * Returns the assistant message text, or throws.
 * Used by both analyzeScene and detectRoomColors.
 */
async function callGroqVision({ mimeType, buf, instruction }) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');
  const dataUrl = `data:${mimeType};base64,${buf.toString('base64')}`;
  const body = {
    model: GROQ_MODEL,
    temperature: 0.1,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUrl } },
        { type: 'text', text: instruction + '\n\nReturn ONLY a JSON object. No prose, no markdown fences.' },
      ],
    }],
  };
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Groq ${resp.status}: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(text);
  const candidateText = parsed?.choices?.[0]?.message?.content || '';
  if (!candidateText) throw new Error('empty response');
  // Some Groq models still wrap JSON in fences despite response_format
  const clean = candidateText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  return JSON.parse(clean);
}

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
  if (!imageUrl) return null;

  // Fetch the source image and inline as base64 (both Gemini and Claude need bytes).
  let mimeType;
  let buf;
  try {
    const r = await fetch(imageUrl);
    if (!r.ok) throw new Error(`source fetch ${r.status}`);
    mimeType = r.headers.get('content-type') || 'image/jpeg';
    buf = Buffer.from(await r.arrayBuffer());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[vision] source image fetch failed:', err?.message || err);
    return null;
  }

  // Flat color schema instruction used by Groq + Claude (Gemini uses native schema)
  const flatColorInstruction = COLOR_DETECTION_PROMPT + '\n\nReturn ONLY the JSON object using this flat schema (no nested objects):\n{"walls_hex": "#XXXXXX", "walls_name": "...", "walls_confidence": "high|medium|low", "ceiling_hex": "...", "ceiling_name": "...", "ceiling_confidence": "...", "floor_hex": "...", "floor_name": "...", "floor_confidence": "...", "trim_hex": "...", "trim_name": "...", "trim_confidence": "..."}';

  // === Attempt 1: Groq (PRIMARY) ============================================
  if (GROQ_API_KEY) {
    try {
      const flat = await callGroqVision({ mimeType, buf, instruction: flatColorInstruction });
      // eslint-disable-next-line no-console
      console.log('[vision] colors detected via Groq');
      return unflatten(flat);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[vision] Groq color detection failed (will try Gemini):', err?.message || err);
    }
  }

  // === Attempt 2: Gemini =====================================================
  if (GEMINI_API_KEY) {
    try {
      const body = {
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: buf.toString('base64') } },
            { text: COLOR_DETECTION_PROMPT },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
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
      return unflatten(JSON.parse(candidateText));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[vision] Gemini color detection failed (will try Claude):', err?.message || err);
    }
  }

  // === Attempt 3: Claude Vision =============================================
  if (ANTHROPIC_API_KEY) {
    try {
      const claudeBody = {
        model: ANTHROPIC_MODEL,
        max_tokens: 512,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: buf.toString('base64') } },
            { type: 'text', text: COLOR_DETECTION_PROMPT + '\n\nReturn ONLY the JSON object using the flat schema: walls_hex, walls_name, walls_confidence, ceiling_hex, ceiling_name, ceiling_confidence, floor_hex, floor_name, floor_confidence, trim_hex, trim_name, trim_confidence. No prose, no markdown fences.' },
          ],
        }],
      };
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(claudeBody),
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(`Claude ${resp.status}: ${text.slice(0, 200)}`);
      const parsed = JSON.parse(text);
      const candidateText = parsed?.content?.[0]?.text || '';
      if (!candidateText) throw new Error('empty response');
      const clean = candidateText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
      return unflatten(JSON.parse(clean));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[vision] Claude color detection also failed:', err?.message || err);
    }
  }

  // eslint-disable-next-line no-console
  console.warn('[vision] no vision providers available or all failed — returning null');
  return null;
}

// ============================================================================
// Day 19b — analyzeScene
//
// Rich scene-aware analysis. Where detectRoomColors only captured paint colors,
// analyzeScene captures the full architectural inventory: windows (count,
// position, framing), wall features, floor material+pattern, ceiling, doorways,
// perspective, lighting, and existing furniture. This is the "the model knows
// what's in the picture" half of the hybrid (Canny + scene description)
// architecture used by REimagineHome / Spacely / Collov.
//
// Cost: one Gemini Flash call (~$0 free tier, ~2s latency).
// Failure: returns null so the caller falls back to color-only clauses.
// ============================================================================

const SCENE_ANALYSIS_PROMPT = `You are inspecting a room photo for an AI interior-design tool. Return a structured architectural inventory so the downstream generator can preserve the room's structure exactly while restyling the interior.

Be precise. Be SHORT. This goes into a prompt; brevity wins.

Capture, in order:
  - perspective: one short phrase. e.g. "wide-angle eye-level interior, ~110° FOV", "narrow corner view at eye level".
  - lighting: where the light comes from + character. e.g. "bright natural daylight from right windows", "warm artificial overhead light, dim daylight from left".
  - walls: array of 1-4 short descriptions, one per visible wall. Include color + material. e.g. ["white painted left wall", "dark gray accent wall in center, matte paint", "glass curtain wall on right"].
  - windows: array of 0-6 objects. Each: { location, count, size, framing }. e.g. [{ "location": "right wall", "count": 2, "size": "floor-to-ceiling", "framing": "black aluminum mullions" }]. Empty array if none.
  - doorways: array of 0-4 short strings describing visible doorways/openings. e.g. ["open archway on left leading to hallway"]. Empty if none.
  - floor: one phrase. material + color + pattern. e.g. "light oak hardwood plank, horizontal orientation, satin finish".
  - ceiling: one phrase. material + features. e.g. "white flat painted ceiling with recessed downlights", "white ceiling with exposed wood beams running left-right".
  - existing_furniture: array of 0-10 short strings. List visible furniture/decor. Empty array if the room is empty. e.g. ["beige sectional sofa center-left", "low wooden coffee table", "tall floor lamp in corner"].
  - notable_features: array of 0-4 short strings for anything else: fireplaces, built-ins, columns, stairs, art on walls. Empty if none.

Return ONLY the JSON object, no prose.`;

const SCENE_SCHEMA = {
  type: 'object',
  properties: {
    perspective: { type: 'string' },
    lighting: { type: 'string' },
    walls: { type: 'array', items: { type: 'string' } },
    windows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          count: { type: 'integer' },
          size: { type: 'string' },
          framing: { type: 'string' },
        },
        required: ['location', 'count', 'size', 'framing'],
      },
    },
    doorways: { type: 'array', items: { type: 'string' } },
    floor: { type: 'string' },
    ceiling: { type: 'string' },
    existing_furniture: { type: 'array', items: { type: 'string' } },
    notable_features: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'perspective', 'lighting', 'walls', 'windows',
    'doorways', 'floor', 'ceiling',
    'existing_furniture', 'notable_features',
  ],
};

/**
 * Analyze a room photo into a structured architectural inventory.
 * Tries Gemini first (free tier, fastest), falls back to Claude Vision if
 * Gemini is missing or returns an error (rate limit, etc).
 * Returns the scene object or null if both providers fail.
 */
export async function analyzeScene(imageUrl) {
  if (!imageUrl) return null;

  // Fetch the image once — both providers need the bytes.
  let mimeType;
  let buf;
  try {
    const r = await fetch(imageUrl);
    if (!r.ok) throw new Error(`source fetch ${r.status}`);
    mimeType = r.headers.get('content-type') || 'image/jpeg';
    buf = Buffer.from(await r.arrayBuffer());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[vision] source image fetch failed:', err?.message || err);
    return null;
  }

  // === Attempt 1: Groq (PRIMARY — free, fast, no quota issues observed) =====
  if (GROQ_API_KEY) {
    try {
      const result = await callGroqVision({ mimeType, buf, instruction: SCENE_ANALYSIS_PROMPT });
      // eslint-disable-next-line no-console
      console.log('[vision] scene analyzed via Groq');
      return result;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[vision] Groq scene analysis failed (will try Gemini):', err?.message || err);
    }
  }

  // === Attempt 2: Gemini =====================================================
  if (GEMINI_API_KEY) {
    try {
      const body = {
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: buf.toString('base64') } },
            { text: SCENE_ANALYSIS_PROMPT },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseSchema: SCENE_SCHEMA,
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
      // eslint-disable-next-line no-console
      console.log('[vision] scene analyzed via Gemini');
      return JSON.parse(candidateText);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[vision] Gemini scene analysis failed (will try Claude):', err?.message || err);
    }
  }

  // === Attempt 3: Claude Vision =============================================
  if (ANTHROPIC_API_KEY) {
    try {
      const claudeBody = {
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: buf.toString('base64'),
              },
            },
            {
              type: 'text',
              text: SCENE_ANALYSIS_PROMPT + '\n\nReturn ONLY the JSON. No prose, no markdown fences.',
            },
          ],
        }],
      };
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(claudeBody),
      });
      const text = await resp.text();
      if (!resp.ok) throw new Error(`Claude ${resp.status}: ${text.slice(0, 200)}`);
      const parsed = JSON.parse(text);
      const candidateText = parsed?.content?.[0]?.text || '';
      if (!candidateText) throw new Error('empty response');
      // Claude sometimes wraps JSON in ```json ... ``` fences despite asking
      // not to. Strip them defensively.
      const clean = candidateText
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/\s*```\s*$/m, '')
        .trim();
      // eslint-disable-next-line no-console
      console.log('[vision] scene analyzed via Claude (Gemini fallback)');
      return JSON.parse(clean);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[vision] Claude scene analysis also failed:', err?.message || err);
    }
  }

  // eslint-disable-next-line no-console
  console.warn('[vision] no vision providers available or all failed — returning null');
  return null;
}

/**
 * Compile a scene-analysis object into a single prompt-ready preservation
 * block. This is the "tell the model what's in the picture" half of the
 * Canny + scene-description hybrid.
 *
 * Returns a string suitable for embedding in any image generator prompt
 * (FLUX, SDXL, FLUX Pro, etc.). Returns empty string if scene is null.
 */
export function sceneToPromptBlock(scene) {
  if (!scene) return '';

  const parts = [];

  if (scene.perspective) parts.push(scene.perspective);
  if (scene.lighting) parts.push(scene.lighting);

  if (scene.walls?.length) {
    parts.push(`Walls: ${scene.walls.join('; ')}`);
  }

  if (scene.windows?.length) {
    const winStrs = scene.windows.map((w) => {
      const n = w.count > 1 ? `${w.count} ` : '';
      return `${n}${w.size} window${w.count > 1 ? 's' : ''} on ${w.location} with ${w.framing}`;
    });
    parts.push(`Windows: ${winStrs.join('; ')}`);
  } else if (scene.windows && scene.windows.length === 0) {
    parts.push('Windows: none visible');
  }

  if (scene.doorways?.length) {
    parts.push(`Doorways: ${scene.doorways.join('; ')}`);
  }

  if (scene.floor) parts.push(`Floor: ${scene.floor}`);
  if (scene.ceiling) parts.push(`Ceiling: ${scene.ceiling}`);

  if (scene.notable_features?.length) {
    parts.push(`Architectural features: ${scene.notable_features.join('; ')}`);
  }

  if (parts.length === 0) return '';

  return `PRESERVE EXACTLY (do not alter, move, resize, recolor, or remove): ${parts.join('. ')}.`;
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
