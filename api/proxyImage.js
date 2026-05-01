/**
 * /api/proxyImage — server-side CORS proxy for product images.
 *
 * Why: Amazon and IKEA product images don't allow cross-origin canvas reads.
 * When we want to overlay them on a render or grab pixels, we need to fetch
 * via our domain.
 *
 * Security: hostname allow-list. Without it this would be an open proxy that
 * anyone on the internet could use to bounce traffic through our domain.
 *
 * Usage from the client:
 *   <img src={`/api/proxyImage?url=${encodeURIComponent(amazonImageUrl)}`} />
 */
import { allow, json } from './_lib/auth.js';

const ALLOWED_HOST_SUFFIXES = [
  // Amazon CDN domains
  '.amazon.com',
  '.media-amazon.com',
  '.ssl-images-amazon.com',
  '.images-amazon.com',
  // IKEA
  '.ikea.com',
  // Wayfair
  '.wfcdn.com',
  // Etsy
  '.etsystatic.com',
  // Our own (in case a render is somehow proxied)
  '.supabase.co',
  // fal.ai temporary URLs
  '.fal.media',
  '.fal.ai',
];

function isAllowedUrl(input) {
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix)
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (!allow(res, req, ['GET'])) return;

  const target = req.query?.url;
  if (!target || typeof target !== 'string') {
    return json(res, 400, { error: 'Missing `url` query parameter' });
  }
  if (!isAllowedUrl(target)) {
    return json(res, 403, { error: 'Hostname not allowed' });
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        // Some CDNs (Amazon) block requests without a real-looking UA
        'User-Agent':
          'Mozilla/5.0 (compatible; AmbientSpaceProxy/1.0; +https://ambientspace.ai)',
        Accept: 'image/*',
      },
    });

    if (!upstream.ok) {
      return json(res, upstream.status, {
        error: `Upstream returned ${upstream.status}`,
      });
    }

    // Pass through the content-type and bytes.
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(buffer);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/proxyImage] error:', err);
    return json(res, 502, {
      error: 'Proxy fetch failed',
      detail: err?.message || String(err),
    });
  }
}
