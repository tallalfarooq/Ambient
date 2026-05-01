/**
 * /api/llm — Claude wrapper for InvokeLLM calls.
 *
 * Used by:
 *   - StepFindSimilar.jsx (identify a furniture item from a user photo)
 *   - Design.jsx (detect 8–12 furniture items in a generated render with bboxes)
 *
 * Body shape (Base44-compatible):
 *   {
 *     prompt: string,                  // user prompt or instruction
 *     response_json_schema?: object,   // optional JSON Schema for structured output
 *     file_urls?: string[],            // optional image URLs for vision
 *     model?: 'claude-sonnet-4-6' |    // optional override (default = sonnet)
 *             'claude-haiku-4-5-20251001'
 *   }
 *
 * Response:
 *   On structured output:  the parsed JSON object (unwrapped from Claude's tool call)
 *   On freeform text:      { text: string }
 */
import Anthropic from '@anthropic-ai/sdk';
import { allow, getUserFromRequest, json, readJson } from './_lib/auth.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  // eslint-disable-next-line no-console
  console.error('[api/llm] Missing ANTHROPIC_API_KEY env var');
}

const DEFAULT_MODEL = 'claude-sonnet-4-6';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Not authenticated' });

  const { prompt, response_json_schema, file_urls, model } = await readJson(req);
  if (!prompt || typeof prompt !== 'string') {
    return json(res, 400, { error: 'Missing or invalid `prompt`' });
  }

  // Build the message content. If file_urls present, use multimodal.
  const content = [];
  if (Array.isArray(file_urls)) {
    for (const url of file_urls) {
      if (typeof url !== 'string') continue;
      content.push({
        type: 'image',
        source: { type: 'url', url },
      });
    }
  }
  content.push({ type: 'text', text: prompt });

  try {
    // If a JSON schema is provided, use Anthropic's tool-use to force structured output.
    if (response_json_schema && typeof response_json_schema === 'object') {
      const result = await anthropic.messages.create({
        model: model || DEFAULT_MODEL,
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
        return json(res, 502, {
          error: 'LLM did not return structured output',
          stop_reason: result.stop_reason,
        });
      }
      // Return the structured payload directly so component code can use it as-is.
      return json(res, 200, toolUse.input);
    }

    // Freeform text response.
    const result = await anthropic.messages.create({
      model: model || DEFAULT_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    });
    const text = result.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return json(res, 200, { text });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/llm] error:', err);
    return json(res, 500, {
      error: 'LLM call failed',
      detail: err?.message || String(err),
    });
  }
}
