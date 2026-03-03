import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const AMAZON_TAG = "ambient019-21";

const FURNITURE_KEYWORDS = [
  "sofa", "couch", "chair", "table", "desk", "shelf", "shelving",
  "bookcase", "lamp", "light", "lighting", "rug", "curtain", "pillow", "cushion",
  "bed", "mattress", "dresser", "cabinet", "wardrobe", "mirror",
  "plant", "vase", "storage", "ottoman", "bench", "nightstand",
  "coffee table", "dining", "stool", "rack", "decor", "throw", "blanket",
  "artwork", "frame", "candle", "basket", "tray", "clock"
];

function scoreMatch(product, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const haystack = `${product.title || ''} ${product.categories || ''}`.toLowerCase();
  const hits = terms.filter(t => haystack.includes(t)).length;
  return hits / Math.max(terms.length, 1);
}

function isFurnitureRelated(product) {
  const haystack = `${product.title || ''} ${product.categories || ''}`.toLowerCase();
  return FURNITURE_KEYWORDS.some(kw => haystack.includes(kw));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { query, budget_max, budget_min, limit = 3 } = body;

    if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

    // Fetch in smaller batches to avoid CPU limit
    const all = await base44.asServiceRole.entities.ProductCatalog.list('-created_date', 500);

    // Filter furniture-related + within budget
    const relevant = all.filter(p => {
      if (!isFurnitureRelated(p)) return false;
      if (budget_max && p.price_usd && p.price_usd > budget_max * 1.1) return false;
      return true;
    });

    // Score and sort
    const scored = relevant
      .map(p => ({ ...p, _score: scoreMatch(p, query) }))
      .filter(p => p._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    const matches = scored.map(p => ({
      title: p.title,
      price: p.price_usd ? Math.round(p.price_usd) : null,
      image_url: p.image_url || null,
      source: "Amazon",
      url: `https://www.amazon.de/dp/${p.asin}?tag=${AMAZON_TAG}`,
      is_preloved: false,
      similarity_score: Math.min(p._score, 1),
      asin: p.asin
    }));

    return Response.json({ matches });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});