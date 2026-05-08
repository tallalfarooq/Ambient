/**
 * /api/scoreStructure — quick structure-preservation check.
 *
 * Day 7.3 — the structure-preservation prompt fixes (Day 5.6, 5.7, 5.8, 6.8)
 * dramatically improved fidelity but Kontext occasionally still drifts. Rather
 * than asking the user to eyeball every render, we run a vision-LLM judge
 * after each generation:
 *
 *   "Compare these two photos. The first is the source room. The second is
 *    an AI redesign of the same room with new furniture. Score 0–100 how
 *    well the redesign preserved the room's structure (walls, windows,
 *    doors, floor, ceiling, camera angle, perspective). Furniture/decor
 *    changes are expected — don't penalize them. Output JSON."
 *
 * If the score is < 70, the UI surfaces a "Re-render with stronger
 * preservation" button that retries with reinforced wording. This is a
 * self-healing loop on the worst failure mode of the product.
 *
 * Cheap to run — Gemini Flash 2.0 / Llama 4 Scout vision are both free or
 * near-free per call. Scored asynchronously so the user sees their result
 * immediately and the score appears once ready.
 */
import { allow, getUserFromRequest, json, readJson } from './_lib/auth.js';

export const config = { maxDuration: 30 };

const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const PROMPT = `You are evaluating whether an AI interior-design tool preserved the source room's structure.

You will see TWO images:
1. SOURCE — the original empty or furnished room photo the user uploaded.
2. RESULT — the AI-generated redesign of that same room.

The redesign is EXPECTED to change furniture, upholstery, lighting fixtures, rugs, and decorative objects. Do NOT penalize those changes.

The redesign is EXPECTED to PRESERVE these architectural elements (these MUST match between source and result):
- Walls and wall paint color (unless the user explicitly asked to repaint walls)
- Windows: same count, same positions, same sizes
- Doors: same count, same positions
- Floor material and floor color (unless the user asked to change flooring)
- Ceiling shape and height
- Camera angle and perspective (the photo should look taken from the same vantage)
- Overall room dimensions and shape

Score from 0 to 100, where:
- 95–100 = essentially perfect structural match; only furniture/decor changed
- 70–94  = minor drift (e.g., a window slightly resized, wall color shifted slightly)
- 40–69  = noticeable structural changes (e.g., a window moved, walls repainted differently, perspective shifted)
- 0–39   = totally different room; user would not recognize their space

Return ONLY a JSON object:
{
  "score": <number 0-100>,
  "summary": "<one short sentence describing what was preserved vs. drifted>",
  "drifted_elements": ["element1", "element2", ...]   // empty array if nothing drifted
}`;

const RESPONSE_SCHEMA = {
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

  const { source_url, result_url } = await readJson(req);
  if (typeof source_url !== 'string' || typeof result_url !== 'string') {
    return json(res, 400, { error: 'Missing source_url or result_url' });
  }

  try {
    if (PROVIDER === 'gemini') {
      const result = await callGemini([source_url, result_url]);
      return json(res, 200, result);
    } else if (PROVIDER === 'groq') {
      const result = await callGroq([source_url, result_url]);
      return json(res, 200, result);
    }
    return json(res, 500, { error: `Unsupported LLM_PROVIDER: ${PROVIDER}` });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/scoreStructure] error:', err);
    // Score failure is non-fatal — frontend treats missing score as "not yet
    // available" and just doesn't show the banner. Don't 500 the user.
    return json(res, 200, { score: null, summary: null, drifted_elements: [] });
  }
}

async function callGemini(imageUrls) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  const parts = [];
  for (const url of imageUrls) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Image fetch failed (${r.status}): ${url}`);
    const mimeType = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    parts.push({ inlineData: { mimeType, data: buf.toString('base64') } });
  }
  parts.push({ text: PROMPT });

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${text}`);
  const parsed = JSON.parse(text);
  const content = parsed?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
  if (!content) throw new Error('Empty Gemini response');
  return JSON.parse(content);
}

async function callGroq(imageUrls) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');
  const model = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

  const userContent = [
    ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
    { type: 'text', text: PROMPT },
  ];

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You MUST respond with ONLY a valid JSON object. No prose, no code fences. Schema: ' +
            JSON.stringify(RESPONSE_SCHEMA),
        },
        { role: 'user', content: userContent },
      ],
      max_tokens: 512,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Groq ${resp.status}: ${text}`);
  const parsed = JSON.parse(text);
  const content = parsed?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty Groq response');
  // Strip code fences if present.
  const stripped = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  return JSON.parse(stripped);
}
