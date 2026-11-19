import { NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://civic-pulse-x11a.vercel.app'
    : 'http://localhost:8000');

async function handle(req, { params }) {
  const resolvedParams = await params;
  const path = Array.isArray(resolvedParams?.path)
    ? resolvedParams.path.join('/')
    : '';

  const url = new URL(req.url);
  const targetUrl = `${BACKEND_URL.replace(/\/$/, '')}/${path}${url.search}`;

  // Forward only essential application headers to avoid edge-proxy conflicts
  const forwardHeaders = {};
  const allowedHeaders = [
    'content-type',
    'accept',
    'authorization',
    'x-session-token',
    'x-worker-id',
    'x-request-id',
    'cache-control',
  ];

  for (const name of allowedHeaders) {
    const val = req.headers.get(name);
    if (val) forwardHeaders[name] = val;
  }

  const options = {
    method: req.method,
    headers: forwardHeaders,
  };

  if (!['GET', 'HEAD'].includes(req.method)) {
    try {
      const text = await req.text();
      if (text) options.body = text;
    } catch {
      // no body
    }
  }

  try {
    const backendRes = await fetch(targetUrl, options);
    const responseText = await backendRes.text();

    const responseHeaders = new Headers();
    const contentType = backendRes.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);

    return new NextResponse(responseText, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Failed to communicate with backend service.',
        details: err.cause?.message || err.message,
      },
      { status: 502 }
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
