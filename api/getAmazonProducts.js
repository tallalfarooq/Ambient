/**
 * /api/getAmazonProducts — return shoppable affiliate links for a query.
 *
 * Strategy: pure deep-link approach. No SerpAPI / PA-API dependency, which
 * means $0 marginal cost per call and no rate limits to worry about until
 * scale forces an upgrade.
 *
 * For each query we return search-result URLs for several retailers, with
 * the Amazon affiliate tag attached. The user lands on a search page, picks
 * a product, and any subsequent purchase on Amazon credits our tag.
 *
 * This is intentionally NOT image-similarity matching. The "match" is the
 * user's intent: "I want a beige linen low-profile sofa Japandi" — the
 * Amazon search results page surfaces real options. v2 can add SerpAPI to
 * pre-fetch top results, or PA-API for ASIN-level matching, but neither is
 * needed for launch.
 *
 * Body: { query: string, limit?: number, budget_max?: number }
 * Returns: { matches: Array<{
 *   title, source, url, price, image_url, similarity_score, is_preloved, asin
 * }> }
 *
 * The shape matches what Design.jsx already expects from the legacy Base44
 * `getAmazonProducts` function, so no client-side change is required.
 */
import { allow, getUserFromRequest, json, readJson } from './_lib/auth.js';

// Vercel exposes VITE_*-prefixed env vars to serverless functions too — the
// prefix only governs whether the var lands in the client bundle. Reusing it
// here means we have a single source of truth for the affiliate tag.
const AMAZON_TAG =
  (process.env.VITE_AMAZON_AFFILIATE_TAG || 'ambientspacea-20').trim();

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  // Auth gate. Without it this route is an open relay for affiliate-tag
  // farming — anyone could hammer it to inflate someone else's tag.
  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Not authenticated' });

  const body = await readJson(req);
  const rawQuery = String(body?.query || '').trim();
  const limit = Math.max(1, Math.min(5, Number(body?.limit) || 3));
  const budgetMax = Math.max(0, Number(body?.budget_max) || 0);

  if (!rawQuery) {
    return json(res, 400, { error: 'Missing or empty `query`' });
  }
  if (rawQuery.length > 200) {
    return json(res, 400, { error: '`query` too long (max 200 chars)' });
  }

  const encQ = encodeURIComponent(rawQuery);
  // Amazon supports low-price/high-price as cents-to-dollars in the URL.
  // Skip the price filter when budget is 0/unset so the search returns the
  // full range — a too-tight band returns "no results" for niche queries.
  const priceQuery =
    budgetMax > 0 ? `&low-price=1&high-price=${budgetMax}` : '';

  const allMatches = [
    {
      title: rawQuery,
      source: 'Amazon',
      url: `https://www.amazon.com/s?k=${encQ}&tag=${AMAZON_TAG}&linkCode=ur2${priceQuery}`,
      price: null,
      image_url: null,
      similarity_score: 0.7,
      is_preloved: false,
      asin: null,
    },
    {
      title: rawQuery,
      source: 'IKEA',
      url: `https://www.ikea.com/us/en/search/?q=${encQ}`,
      price: null,
      image_url: null,
      similarity_score: 0.6,
      is_preloved: false,
      asin: null,
    },
    {
      title: rawQuery,
      source: 'Wayfair',
      url: `https://www.wayfair.com/keyword.php?keyword=${encQ}`,
      price: null,
      image_url: null,
      similarity_score: 0.55,
      is_preloved: false,
      asin: null,
    },
    {
      title: rawQuery,
      source: 'eBay',
      url: `https://www.ebay.com/sch/i.html?_nkw=${encQ}&LH_BIN=1`,
      price: null,
      image_url: null,
      similarity_score: 0.45,
      // Mark eBay results as potentially preloved so the UI can highlight
      // sustainable options when sustainability_mode is on for the design.
      is_preloved: true,
      asin: null,
    },
  ];

  return json(res, 200, { matches: allMatches.slice(0, limit) });
}
