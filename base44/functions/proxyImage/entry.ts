import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const reqUrl = new URL(req.url);

    // GET mode: watermark proxy — fetch any image URL and return it with CORS headers
    if (req.method === 'GET') {
      const url = reqUrl.searchParams.get('url');
      if (!url) return new Response('Missing url param', { status: 400 });

      const response = await fetch(decodeURIComponent(url));
      if (!response.ok) return new Response('Image fetch failed', { status: 502 });

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // POST mode: Amazon product image proxy (existing behaviour)
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const body = await req.json();
    const { url } = body;

    if (!url || !url.includes('amazon')) {
      return new Response('Invalid URL', { status: 400 });
    }

    const response = await fetch(decodeURIComponent(url), {
      headers: {
        'Referer': 'https://www.amazon.de/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return new Response('Image fetch failed', { status: 502 });

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
});