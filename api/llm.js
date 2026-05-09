/**
 * /api/llm — provider-agnostic LLM call with vision + structured-output support.
 *
 * Used by:
 *   - StepFindSimilar.jsx (identify a furniture item from a user photo)
 *   - Design.jsx           (detect 8–12 furniture items in a generated render)
 *
 * Provider is chosen via the `LLM_PROVIDER` env var:
 *   - 'gemini'    (default — FREE tier: 15 RPM, 1500 RPD, 1M TPM)
 *   - 'groq'      (FREE tier with rate limits, fastest inference)
 *   - 'anthropic' (paid — Claude Sonnet, best quality, no free tier)
 *
 * For launch on a budget, set LLM_PROVIDER=gemini and only GEMINI_API_KEY.
 * Get a key at https://aistudio.google.com/app/apikey (free, instant).
 *
 * Body shape:
 *   {
 *     prompt: string,
 *     response_json_schema?: object,
 *     file_urls?: string[],
 *     model?: string,    // provider-specific model override
 *   }
 *
 * Response:
 *   - When response_json_schema is provided: the parsed JSON object directly
 *   - Otherwise:                              { text: string }
 */
import Anthropic from '@anthropic-ai/sdk';
import { allow, getUserFromRequest, json, readJson } from './_lib/auth.js';

const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (PROVIDER === 'anthropic' && !ANTHROPIC_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[api/llm] LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY missing');
}
if (PROVIDER === 'gemini' && !GEMINI_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[api/llm] LLM_PROVIDER=gemini but GEMINI_API_KEY missing');
}
if (PROVIDER === 'groq' && !GROQ_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[api/llm] LLM_PROVIDER=groq but GROQ_API_KEY missing');
}

const DEFAULT_MODELS = {
  // Gemini 2.0 Flash — vision + structured output, generous free tier.
  gemini: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  // Llama 4 Scout — Groq's current default vision model. Llama 3.2 Vision was
  // decommissioned. If Groq decommissions this one too, set GROQ_MODEL in
  // Vercel env (no code change needed). Check https://console.groq.com/docs/models
  // for the current vision-capable list.
  groq: process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
  // Claude Sonnet — paid, highest quality.
  anthropic: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
};

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

export const config = { maxDuration: 30 };

// Day 9.5 — structure-preservation scoring is folded into /api/llm via an
// action='score-structure' mode. Previously it lived in /api/scoreStructure
// but Vercel Hobby caps deployments at 12 functions. Both endpoints are
// vision LLM calls so the consolidation is natural.

// Day 10.1 — STRICT scoring. The previous version routinely returned 95/100
// even when wall paint had drifted from grey to orange. This rewrite forces
// the LLM to inspect each architectural element individually, anchors with
// worked examples for color drift, and pulls scores down hard for paint
// changes — wall color is the #1 thing users notice and the #1 thing
// Kontext drifts on.
const STRUCTURE_SCORE_PROMPT = `You are a STRICT QA reviewer evaluating whether an AI interior-design tool preserved the source room's structure. Be harsh — drift hurts users.

You will see TWO images:
1. SOURCE — the original room photo the user uploaded (may be empty or furnished).
2. RESULT — the AI-generated redesign of that same room.

EXPECTED CHANGES (do NOT penalize): furniture, upholstery, lighting fixtures, rugs, decorative objects, soft furnishings.

EXPECTED PRESERVATION (MUST match between source and result, penalize if different):
A. Wall paint color — exact hue match required. If source wall is grey and result wall is orange/blue/green/warm tones, this is a CRITICAL failure.
B. Wall structure — same wall positions, same number of walls visible.
C. Windows — same count, same positions, same sizes, same surrounding frames.
D. Doors — same count, same positions.
E. Floor material and color — same wood/tile/concrete, same tone.
F. Ceiling — same shape, same height, same fixtures (beams, trays, etc.).
G. Camera angle and perspective — the photo should appear taken from the same vantage point with the same lens.
H. Room footprint — same overall dimensions and shape.

WORKED EXAMPLES (anchor your scoring to these):
• Source has grey accent wall, result has orange accent wall, everything else preserved → score 55/100. Wall paint drift is critical.
• Source has 2 windows on left wall, result has 1 window on left wall → score 40/100. Window count drift is critical.
• Source has light hardwood, result has dark walnut, everything else preserved → score 60/100. Floor color drift is critical.
• Source perspective shifted slightly (camera nudged 15°), but walls/windows/floor preserved → score 75/100. Mild perspective drift.
• Everything matches except minor lighting tone difference → score 95/100.

SCORING RUBRIC (apply each independently, then take the minimum):
- 95–100 = perfect: only furniture/decor changed; A-H all match.
- 80–94  = very minor drift in one of A-H (e.g., paint shade off by 5%, window slightly resized).
- 60–79  = ONE of A-H clearly drifted (e.g., wall color visibly different, but other elements preserved).
- 40–59  = TWO+ of A-H drifted, or one major drift (e.g., wall color completely different).
- 20–39  = Multiple architectural drifts; user struggles to recognize their room.
- 0–19   = Totally different room.

Return ONLY a JSON object:
{
  "score": <number 0-100>,
  "summary": "<one short sentence describing what was preserved vs. drifted, mention specific colors/elements>",
  "drifted_elements": ["wall paint color", "left window", ...]
}`;

const STRUCTURE_SCORE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number' },
    summary: { type: 'string' },
    drifted_elements: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'summary', 'drifted_elements'],
};

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Not authenticated' });

  const body = await readJson(req);
  const action = body?.action;

  // Day 9.5 — score-structure mode. Compares source photo to AI result and
  // returns 0-100 preservation score. Self-contained so the frontend just
  // sends {action:'score-structure', source_url, result_url}.
  if (action === 'score-structure') {
    const { source_url, result_url } = body;
    if (typeof source_url !== 'string' || typeof result_url !== 'string') {
      return json(res, 400, { error: 'Missing source_url or result_url' });
    }
    try {
      const args = {
        prompt: STRUCTURE_SCORE_PROMPT,
        imageUrls: [source_url, result_url],
        response_json_schema: STRUCTURE_SCORE_SCHEMA,
        wantsJson: true,
        model: undefined,
      };
      let result;
      if (PROVIDER === 'gemini')         result = await callGemini(args);
      else if (PROVIDER === 'groq')      result = await callGroq(args);
      else if (PROVIDER === 'anthropic') result = await callAnthropic(args);
      else return json(res, 500, { error: `Unknown LLM_PROVIDER: ${PROVIDER}` });
      return json(res, 200, result);
    } catch (err) {
      // Score failure is non-fatal — frontend treats null score as "skip
      // the badge" rather than surfacing the error to the user. Don't 500.
      // eslint-disable-next-line no-console
      console.error('[api/llm score-structure] error:', err);
      return json(res, 200, { score: null, summary: null, drifted_elements: [] });
    }
  }

  // Default mode — generic vision LLM call with optional JSON schema.
  const { prompt, response_json_schema, file_urls, model } = body;
  if (!prompt || typeof prompt !== 'string') {
    return json(res, 400, { error: 'Missing or invalid `prompt`' });
  }

  const wantsJson =
    response_json_schema && typeof response_json_schema === 'object';
  const imageUrls = Array.isArray(file_urls) ? file_urls.filter((u) => typeof u === 'string') : [];

  try {
    let result;
    if (PROVIDER === 'gemini') {
      result = await callGemini({ prompt, imageUrls, response_json_schema, wantsJson, model });
    } else if (PROVIDER === 'groq') {
      result = await callGroq({ prompt, imageUrls, response_json_schema, wantsJson, model });
    } else if (PROVIDER === 'anthropic') {
      result = await callAnthropic({ prompt, imageUrls, response_json_schema, wantsJson, model });
    } else {
      return json(res, 500, { error: `Unknown LLM_PROVIDER: ${PROVIDER}` });
    }
    return json(res, 200, result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[api/llm ${PROVIDER}] error:`, err);
    return json(res, 502, {
      error: 'LLM call failed',
      detail: err?.message || String(err),
      provider: PROVIDER,
    });
  }
}

// =============================================================================
// Gemini (Google AI Studio) — FREE tier
// =============================================================================

async function callGemini({ prompt, imageUrls, response_json_schema, wantsJson, model }) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

  const chosenModel = model || DEFAULT_MODELS.gemini;

  // Gemini doesn't accept image URLs — it needs inlineData (base64). Fetch
  // each image and inline it. This is what Anthropic was doing implicitly via
  // its URL-source support; Gemini wants it explicit.
  const parts = [];
  for (const url of imageUrls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const mimeType = r.headers.get('content-type') || 'image/jpeg';
      const buf = Buffer.from(await r.arrayBuffer());
      parts.push({
        inlineData: { mimeType, data: buf.toString('base64') },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[gemini] could not fetch image:', url, e?.message);
    }
  }
  parts.push({ text: prompt });

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  };

  // Gemini supports JSON Schema natively for structured output. The schema
  // language is mostly compatible with JSON Schema draft-07 but Gemini drops
  // a few unsupported fields (e.g. additionalProperties) — passing as-is is
  // generally safe; if it complains we strip them.
  if (wantsJson) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = stripUnsupportedSchemaFields(response_json_schema);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${GEMINI_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* not json */ }

  if (!resp.ok) {
    const detail = parsed?.error?.message || text || `Gemini ${resp.status}`;
    throw new Error(detail);
  }

  const candidate = parsed?.candidates?.[0];
  const candidateText = candidate?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!candidateText) {
    throw new Error('Gemini returned empty response');
  }
  if (wantsJson) {
    try {
      return JSON.parse(candidateText);
    } catch {
      throw new Error('Gemini returned non-JSON despite responseSchema');
    }
  }
  return { text: candidateText };
}

// Gemini's JSON Schema dialect doesn't accept some draft-07 fields. Strip the
// ones it rejects so users can pass standard schemas.
function stripUnsupportedSchemaFields(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(stripUnsupportedSchemaFields);
  const cleaned = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'additionalProperties' || k === '$schema' || k === '$id' || k === 'definitions') continue;
    cleaned[k] = stripUnsupportedSchemaFields(v);
  }
  return cleaned;
}

// =============================================================================
// Groq — Llama 3.2 Vision, FREE tier with rate limits
// =============================================================================

async function callGroq({ prompt, imageUrls, response_json_schema, wantsJson, model }) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');

  const chosenModel = model || DEFAULT_MODELS.groq;
  const messages = [];

  // Groq accepts OpenAI-style messages with image_url inline.
  const userContent = [];
  for (const url of imageUrls) {
    userContent.push({ type: 'image_url', image_url: { url } });
  }
  // For structured output we ask the model to ONLY return JSON in a system msg
  // since Groq doesn't yet support strict JSON Schema mode for vision models.
  if (wantsJson) {
    messages.push({
      role: 'system',
      content:
        'You MUST respond with ONLY a valid JSON object matching this schema. ' +
        'No prose, no code fences, no commentary — just the JSON.\n\n' +
        'Schema: ' + JSON.stringify(response_json_schema),
    });
  }
  userContent.push({ type: 'text', text: prompt });
  messages.push({ role: 'user', content: userContent });

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: chosenModel,
      messages,
      max_tokens: 4096,
      temperature: 0.4,
      ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  const text = await resp.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* not json */ }

  if (!resp.ok) {
    const detail = parsed?.error?.message || text || `Groq ${resp.status}`;
    throw new Error(detail);
  }

  const content = parsed?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty response');

  if (wantsJson) {
    try {
      return JSON.parse(content);
    } catch {
      // Some Llama Vision responses include code fences — strip and retry.
      const stripped = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      try { return JSON.parse(stripped); }
      catch { throw new Error('Groq returned non-JSON content'); }
    }
  }
  return { text: content };
}

// =============================================================================
// Anthropic Claude — paid, highest quality
// =============================================================================

async function callAnthropic({ prompt, imageUrls, response_json_schema, wantsJson, model }) {
  if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not configured');

  const chosenModel = model || DEFAULT_MODELS.anthropic;
  const content = [];
  for (const url of imageUrls) {
    content.push({ type: 'image', source: { type: 'url', url } });
  }
  content.push({ type: 'text', text: prompt });

  if (wantsJson) {
    const result = await anthropic.messages.create({
      model: chosenModel,
      max_tokens: 4096,
      tools: [
        {
          name: 'respond',
          description: 'Provide a structured response matching the schema.',
          input_schema: response_json_schema,
        },
      ],
      tool_choice: { type: 'tool', name: 'respond' },
      messages: [{ role: 'user', content }],
    });
    const toolUse = result.content.find((b) => b.type === 'tool_use');
    if (!toolUse) {
      throw new Error(`Claude did not return a tool_use (stop_reason: ${result.stop_reason})`);
    }
    return toolUse.input;
  }

  const result = await anthropic.messages.create({
    model: chosenModel,
    max_tokens: 4096,
    messages: [{ role: 'user', content }],
  });
  const text = result.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return { text };
}
