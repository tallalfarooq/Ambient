#!/usr/bin/env node
/**
 * Day 19d — fal.ai endpoint A/B test harness, version 2.
 *
 * Architecturally-correct comparison of multiple fal.ai endpoints on the
 * SAME source image, with the SAME enriched positive prompt and the SAME
 * negative prompt. Reasons for the rewrite:
 *
 *   1. Day 19c ran with generic "PRESERVE EXACTLY: walls, windows, doorways…"
 *      language. The room never came out preserved because the model had no
 *      concrete facts to anchor to. Now we run BOTH vision passes:
 *        - detectRoomColors() → hex codes for walls / ceiling / floor / trim
 *        - analyzeScene()     → architectural inventory (windows, doorways,
 *                                perspective, lighting, existing furniture)
 *      and bake the facts into the prompt: "preserve the dark gray accent
 *      wall (#3D3D40) on the back wall, two floor-to-ceiling windows with
 *      black aluminum framing on the right wall…"
 *   2. Negative prompts were buried inside the positive prompt as text. Now
 *      they're passed as a separate `negative_prompt` field for endpoints
 *      that natively support it (SDXL family). For endpoints that don't
 *      (FLUX/Qwen/IC-Light), we still append the negatives as language so
 *      every model gets the same guidance.
 *   3. Endpoint mix updated based on Day 19c results:
 *        - kept: qwen-image-edit (75% preservation winner), iclight-v2 (90%
 *          preservation, sparse furniture), flux-pro/v1/canny (control)
 *        - added: fast-sdxl/image-to-image (Day 14-era winner, native
 *          negative_prompt support)
 *        - added: flux-kontext (Day 11-12-era winner per old commit
 *          0dae8eb — vision-detected colors baked into Kontext prompts)
 *
 * --------
 * Setup:
 *   Required: FAL_KEY in .env.local
 *   Optional: GEMINI_API_KEY (preferred), ANTHROPIC_API_KEY (fallback)
 *     If both are missing, scene analysis is skipped and a generic
 *     preservation block is used (worst case).
 *
 * --------
 * Usage:
 *   cd ~/Desktop/Ambient\ Space/Code/ambient
 *   npx dotenv-cli -e .env.local -- node scripts/abTest.mjs \
 *     ./path/to/source-room.jpg japandi
 *
 * --------
 * Output:
 *   ab_test_output/japandi-<timestamp>/
 *     source.jpg               copy of source
 *     scene.json               full scene analysis
 *     colors.json              detected hex colors
 *     prompt.txt               positive + negative prompts sent to endpoints
 *     <endpoint-id>.png        one render per endpoint
 *     index.html               side-by-side comparison page
 *
 * Cost: ~$0.30 per full run (5 endpoints).
 */

import { fal } from '@fal-ai/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeScene,
  sceneToPromptBlock,
  detectRoomColors,
  colorsToPromptClauses,
} from '../api/_lib/vision.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('FAL_KEY is not set. Add it to .env.local or run via:');
  console.error('  npx dotenv-cli -e .env.local -- node scripts/abTest.mjs <image> <style>');
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

// ---------------------------------------------------------------------------
// Negative prompt — shared across all endpoints.
//
// For endpoints that have a native `negative_prompt` field (SDXL family),
// this is passed as a separate param. For endpoints that don't (FLUX/Qwen/
// IC-Light), it's appended to the positive prompt as "AVOID:" language so
// the model still sees the same instructions.
// ---------------------------------------------------------------------------

const NEGATIVE_PROMPT = [
  'text', 'watermark', 'logo', 'signature', 'caption', 'frame', 'border',
  'plastic', 'CGI', 'cartoon', 'illustration', 'rendering', 'animation',
  'blurry', 'soft focus', 'distorted walls', 'warped windows',
  'moved doorways', 'new windows', 'new doors', 'additional architectural features',
  'altered perspective', 'altered ceiling height', 'fisheye',
  'low quality', 'low resolution', 'jpeg artifacts',
].join(', ');

// ---------------------------------------------------------------------------
// Endpoints. Each has a `supportsNativeNegative` flag so the prompt builder
// knows whether to pass `negative_prompt` separately or fold it into the
// positive prompt as language.
// ---------------------------------------------------------------------------

const ENDPOINTS = [
  {
    id: 'flux-kontext',
    label: 'FLUX Kontext (Day 11-12 winner)',
    note: 'Text-based image editing. Best at honoring concrete color/feature instructions. The model that worked well historically with vision-detected hex colors.',
    endpoint: 'fal-ai/flux-pro/kontext',
    supportsNativeNegative: false,
    buildInput: ({ srcUrl, positivePrompt }) => ({
      prompt: positivePrompt,
      image_url: srcUrl,
      aspect_ratio: '16:9',
      output_format: 'png',
      safety_tolerance: '6',
      guidance_scale: 6,
      num_images: 1,
    }),
  },
  {
    id: 'fast-sdxl',
    label: 'fal Fast SDXL img2img (Day 14 winner)',
    note: 'SDXL img2img with native negative_prompt support + strength control. Day 14 baseline restored.',
    endpoint: 'fal-ai/fast-sdxl/image-to-image',
    supportsNativeNegative: true,
    buildInput: ({ srcUrl, positivePrompt, negativePrompt }) => ({
      prompt: positivePrompt,
      negative_prompt: negativePrompt,
      image_url: srcUrl,
      strength: 0.65,
      num_inference_steps: 30,
      guidance_scale: 13,
      num_images: 1,
      image_size: 'landscape_16_9',
    }),
  },
  {
    id: 'qwen-image-edit',
    label: 'Qwen Image Edit (Day 19c winner — 75% preservation)',
    note: 'Edits source pixels directly, not generated from edges. Best preservation in Day 19c.',
    endpoint: 'fal-ai/qwen-image-edit',
    supportsNativeNegative: false,
    buildInput: ({ srcUrl, positivePrompt }) => ({
      prompt: positivePrompt,
      image_url: srcUrl,
      num_inference_steps: 30,
      guidance_scale: 4,
      num_images: 1,
      output_format: 'png',
    }),
  },
  {
    id: 'iclight-v2',
    label: 'IC-Light v2 (interior relighting)',
    note: '90% preservation in Day 19c but sparse furniture. Trying stronger prompt to push more furniture in.',
    endpoint: 'fal-ai/iclight-v2',
    supportsNativeNegative: false,
    buildInput: ({ srcUrl, positivePrompt }) => ({
      prompt: positivePrompt,
      image_url: srcUrl,
      num_inference_steps: 28,
      guidance_scale: 5,
      num_images: 1,
      output_format: 'png',
    }),
  },
  {
    id: 'flux-pro-canny',
    label: 'FLUX Pro + Canny ControlNet',
    note: 'Edge-based structural lock. Premium but lost room shape in Day 19c.',
    endpoint: 'fal-ai/flux-pro/v1/canny',
    supportsNativeNegative: false,
    buildInput: ({ srcUrl, positivePrompt }) => ({
      prompt: positivePrompt,
      control_image_url: srcUrl,
      image_size: 'landscape_16_9',
      num_inference_steps: 20,
      guidance_scale: 15,
      num_images: 1,
      output_format: 'png',
      safety_tolerance: '6',
    }),
  },
];

// ---------------------------------------------------------------------------
// Style preset library.
// ---------------------------------------------------------------------------

const STYLE_PRESETS = {
  japandi: 'japandi interior style: low natural-wood furniture, beige linen sofa, paper lantern pendant lighting, floor cushion seating, indoor plants in ceramic pots, neutral wool area rug, minimalist composition, warm muted earth-tone palette, soft natural light',
  scandinavian: 'scandinavian interior style: light oak furniture, soft wool throws, simple geometric forms, cozy hygge atmosphere, natural materials, indoor plants, mid-tone neutral palette',
  'mid-century': 'mid-century modern interior style: walnut tapered-leg sofa, brass accent lighting, abstract wall art, geometric area rug, mustard and teal accent colors, sculpted forms, 1960s aesthetic',
  industrial: 'industrial loft interior style: exposed brick textures, metal-frame furniture, leather sofa, edison bulb pendant lights, dark wood accents, raw concrete or wood surfaces',
  boho: 'bohemian interior style: layered textiles, woven rattan furniture, macramé wall hanging, abundant plants, warm earth tones, eclectic mix of patterns, vintage rugs',
  'modern-minimal': 'modern minimal interior style: clean lines, monochrome palette, low-profile sectional sofa, sculptural floor lamp, single statement plant, gallery-white walls',
  cottagecore: 'cottagecore interior style: floral upholstery, distressed wood furniture, vintage china, garden flowers in vases, lace details, soft pastel palette, romantic countryside aesthetic',
  'art-deco': 'art deco interior style: geometric brass-and-velvet furniture, mirrored surfaces, bold black-and-gold palette, fluted detailing, statement chandelier, 1920s glamour',
};

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const [sourceArg, styleArg = 'japandi'] = process.argv.slice(2);

if (!sourceArg) {
  console.error('Usage: node scripts/abTest.mjs <source-image> [style]');
  console.error('Available styles:', Object.keys(STYLE_PRESETS).join(', '));
  process.exit(1);
}

const styleKey = styleArg.toLowerCase();
const stylePreset = STYLE_PRESETS[styleKey];
if (!stylePreset) {
  console.error(`Unknown style "${styleArg}". Available:`, Object.keys(STYLE_PRESETS).join(', '));
  process.exit(1);
}

const sourcePath = path.resolve(sourceArg);
if (!await fs.access(sourcePath).then(() => true).catch(() => false)) {
  console.error(`Source image not found: ${sourcePath}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Output directory
// ---------------------------------------------------------------------------

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.join(REPO_ROOT, 'ab_test_output', `${styleKey}-${timestamp}`);
await fs.mkdir(outDir, { recursive: true });
console.log(`Output → ${outDir}`);

// ---------------------------------------------------------------------------
// Step 1: Upload source to fal storage
// ---------------------------------------------------------------------------

console.log('1. Uploading source to fal storage…');
const srcBuf = await fs.readFile(sourcePath);
const srcMime =
  sourcePath.toLowerCase().endsWith('.png') ? 'image/png' :
  sourcePath.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
const srcFile = new File([srcBuf], path.basename(sourcePath), { type: srcMime });
const sourceUrl = await fal.storage.upload(srcFile);
console.log('   Source URL:', sourceUrl);

const sourceCopy = path.join(outDir, `source${path.extname(sourcePath)}`);
await fs.writeFile(sourceCopy, srcBuf);

// ---------------------------------------------------------------------------
// Step 2: Vision analysis — both colors and scene inventory
// ---------------------------------------------------------------------------

console.log('2. Vision analysis (Gemini → Claude fallback)…');
const [scene, colors] = await Promise.all([
  analyzeScene(sourceUrl).catch((e) => { console.warn('   analyzeScene threw:', e?.message); return null; }),
  detectRoomColors(sourceUrl).catch((e) => { console.warn('   detectRoomColors threw:', e?.message); return null; }),
]);

if (scene) {
  await fs.writeFile(path.join(outDir, 'scene.json'), JSON.stringify(scene, null, 2));
  console.log('   ✓ scene analyzed (perspective, windows, doorways, walls, floor, ceiling)');
} else {
  console.log('   ⚠ scene analysis returned null — using generic preservation');
}
if (colors) {
  await fs.writeFile(path.join(outDir, 'colors.json'), JSON.stringify(colors, null, 2));
  console.log('   ✓ colors detected (hex + names for walls/ceiling/floor/trim)');
} else {
  console.log('   ⚠ color detection returned null — no hex anchors');
}

// ---------------------------------------------------------------------------
// Step 3: Build the unified positive prompt and negative prompt
// ---------------------------------------------------------------------------

// Scene block: rich preservation facts from analyzeScene
const scenePart = scene ? sceneToPromptBlock(scene) : '';

// Color anchors: concrete hex codes from detectRoomColors
const colorClauses = colorsToPromptClauses(colors);
const colorParts = [colorClauses?.wallClause, colorClauses?.floorClause, colorClauses?.ceilingClause]
  .filter(Boolean)
  .join(' ');

// Fallback when we have nothing
const fallbackPreservation =
  'PRESERVE EXACTLY (do not alter, move, resize, recolor, or remove): the room\'s walls, windows, doorways, floor material, ceiling, perspective, and lighting direction. Do not add or remove architectural features.';

const preservationBlock = [scenePart, colorParts].filter(Boolean).join('\n\n') || fallbackPreservation;

const styleInstruction = `STYLE — restyle the interior in ${stylePreset}. Add full appropriate furniture, decor, lighting, and styling for this aesthetic. Keep all architecture (walls, windows, doorways, floor, ceiling, perspective) IDENTICAL to the source.`;

const quality = 'QUALITY: photorealistic interior design photography, magazine quality, 8k, sharp focus, professional architectural photography lighting.';

const positivePrompt = [preservationBlock, '', styleInstruction, '', quality].join('\n');

// For endpoints without native negative_prompt, append it as language
const positiveWithNegative =
  positivePrompt + '\n\nAVOID (do not include in output): ' + NEGATIVE_PROMPT + '.';

await fs.writeFile(
  path.join(outDir, 'prompt.txt'),
  [
    '=== POSITIVE PROMPT ===',
    positivePrompt,
    '',
    '=== NEGATIVE PROMPT ===',
    NEGATIVE_PROMPT,
    '',
    '=== AS SENT TO ENDPOINTS WITHOUT NATIVE NEGATIVE SUPPORT ===',
    positiveWithNegative,
  ].join('\n'),
);
console.log('3. Prompt built (positive + negative)');

// ---------------------------------------------------------------------------
// Step 4: Call all endpoints in parallel
// ---------------------------------------------------------------------------

async function callEndpoint(ep) {
  const started = Date.now();
  const log = (msg) => console.log(`   [${ep.id}] ${msg}`);

  try {
    log('queuing…');
    const result = await fal.subscribe(ep.endpoint, {
      input: ep.buildInput({
        srcUrl: sourceUrl,
        positivePrompt: ep.supportsNativeNegative ? positivePrompt : positiveWithNegative,
        negativePrompt: NEGATIVE_PROMPT,
      }),
      logs: false,
    });

    const imageUrl =
      result?.data?.images?.[0]?.url ||
      result?.data?.image?.url ||
      result?.images?.[0]?.url ||
      null;
    if (!imageUrl) {
      throw new Error('no image URL in response: ' + JSON.stringify(result?.data || result).slice(0, 200));
    }

    const r = await fetch(imageUrl);
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    await fs.writeFile(path.join(outDir, `${ep.id}.png`), buf);

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    log(`✓ saved (${elapsed}s)`);
    return { ep, ok: true, file: `${ep.id}.png`, elapsed };
  } catch (err) {
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    let detail = err?.message || String(err);
    const body = err?.body || err?.response?.data || err?.response?.body;
    if (body) {
      try {
        detail += '\n    body: ' + (typeof body === 'string' ? body : JSON.stringify(body)).slice(0, 500);
      } catch (_) { /* ignore */ }
    }
    log(`✗ failed (${elapsed}s): ${detail}`);
    return { ep, ok: false, error: detail, elapsed };
  }
}

console.log(`4. Calling ${ENDPOINTS.length} endpoints in parallel…`);
const results = await Promise.all(ENDPOINTS.map(callEndpoint));

// ---------------------------------------------------------------------------
// Step 5: HTML report
// ---------------------------------------------------------------------------

const cards = results.map((r) => {
  const negativeHandling = r.ep.supportsNativeNegative
    ? '<span style="color:#1c5e1c">native negative_prompt</span>'
    : '<span style="color:#a06000">negative folded into positive</span>';

  if (r.ok) {
    return `
      <div class="card">
        <h3>${r.ep.label}</h3>
        <p class="note">${r.ep.note}</p>
        <p class="meta"><code>${r.ep.endpoint}</code> · ${r.elapsed}s · ${negativeHandling}</p>
        <a href="${r.file}" target="_blank"><img src="${r.file}" alt="${r.ep.label}"></a>
      </div>`;
  }
  return `
    <div class="card failed">
      <h3>${r.ep.label} — failed</h3>
      <p class="note">${r.ep.note}</p>
      <p class="meta"><code>${r.ep.endpoint}</code> · ${r.elapsed}s · ${negativeHandling}</p>
      <pre class="err">${r.error}</pre>
    </div>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>A/B test — ${styleKey} — ${timestamp}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 1400px; margin: 24px auto; padding: 0 24px; background: #f8f8f9; color: #16181c; }
    h1 { margin-bottom: 4px; }
    .sub { color: #555; margin-top: 0; }
    .source { background: #fff; padding: 16px; border-radius: 12px; border: 1px solid #e3e5e8; margin-bottom: 24px; }
    .source img { max-width: 100%; max-height: 380px; display: block; border-radius: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 20px; }
    .card { background: #fff; padding: 16px; border-radius: 12px; border: 1px solid #e3e5e8; }
    .card.failed { border-color: #f4c0c0; background: #fff7f7; }
    .card h3 { margin: 0 0 4px; font-size: 16px; }
    .card .note { margin: 0 0 4px; color: #555; font-size: 13px; }
    .card .meta { margin: 0 0 12px; color: #888; font-size: 12px; }
    .card img { max-width: 100%; display: block; border-radius: 8px; }
    .err { background: #fbe9e9; padding: 8px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; }
    pre { background: #f2f2f4; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.4; }
    details { background: #fff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e3e5e8; margin-bottom: 16px; }
    summary { cursor: pointer; font-weight: 600; }
    code { background: #f0f0f3; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
    .prompt-box { background: #fff; padding: 16px; border-radius: 12px; border: 1px solid #e3e5e8; margin-bottom: 16px; white-space: pre-wrap; font-size: 13px; line-height: 1.5; }
    .neg-box { background: #fff7f7; padding: 12px 16px; border-radius: 8px; border: 1px solid #f4c0c0; margin-bottom: 16px; font-size: 12px; font-family: ui-monospace, Menlo, monospace; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>A/B test — <em>${styleKey}</em></h1>
  <p class="sub">${timestamp} · ${results.filter(r => r.ok).length}/${results.length} endpoints succeeded</p>

  <div class="source">
    <h3 style="margin-top:0">Source room</h3>
    <img src="${path.basename(sourceCopy)}" alt="source">
  </div>

  ${scene ? `<details><summary>Scene analysis (analyzeScene)</summary><pre>${JSON.stringify(scene, null, 2)}</pre></details>` : ''}
  ${colors ? `<details><summary>Color detection (detectRoomColors)</summary><pre>${JSON.stringify(colors, null, 2)}</pre></details>` : ''}

  <details open>
    <summary>Positive prompt (identical for all endpoints)</summary>
    <div class="prompt-box">${positivePrompt}</div>
  </details>

  <details open>
    <summary>Negative prompt (passed natively to SDXL, appended as text elsewhere)</summary>
    <div class="neg-box">${NEGATIVE_PROMPT}</div>
  </details>

  <h2>Results</h2>
  <div class="grid">${cards}</div>
</body>
</html>`;

const htmlPath = path.join(outDir, 'index.html');
await fs.writeFile(htmlPath, html);

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

const okCount = results.filter((r) => r.ok).length;
console.log('');
console.log(`Done. ${okCount}/${results.length} endpoints succeeded.`);
console.log(`Open: file://${htmlPath}`);
