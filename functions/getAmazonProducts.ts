import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const AMAZON_TAG = "ambient019-21";
const SERP_API_KEY = Deno.env.get("SERP_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { query, limit = 3 } = body;

    if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

    const serpUrl = `https://serpapi.com/search.json?engine=amazon&amazon_domain=amazon.de&k=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`;

    const response = await fetch(serpUrl);
    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error }, { status: 502 });
    }

    const products = (data.organic_results || [])
      .filter(item => item.asin)
      .slice(0, limit)
      .map(item => ({
        title: item.title,
        asin: item.asin,
        price: item.price?.value ?? (item.extracted_price ?? null),
        image_url: item.thumbnail || null,
        source: "Amazon",
        url: `https://www.amazon.de/dp/${item.asin}?tag=${AMAZON_TAG}&linkCode=ll1`,
        is_preloved: false,
        similarity_score: 0.9,
        rating: item.rating ?? null,
        reviews: item.reviews ?? null,
        is_prime: item.prime ?? false,
      }));

    return Response.json({ matches: products });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});