const ALLOWED_ENDPOINTS: Record<string, string> = {
  '/login/device/code': 'https://github.com/login/device/code',
  '/login/oauth/access_token': 'https://github.com/login/oauth/access_token',
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const target = ALLOWED_ENDPOINTS[url.pathname];

    if (!target) {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    }

    // Forward the request to GitHub
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        Accept: request.headers.get('Accept') || 'application/json',
      },
      body: await request.text(),
    });

    // Return response with CORS headers
    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
