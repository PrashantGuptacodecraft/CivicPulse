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

  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (['host', 'connection', 'content-length'].includes(key.toLowerCase())) continue;
    headers.set(key, value);
  }

  const options = {
    method: req.method,
    headers,
  };

  if (!['GET', 'HEAD'].includes(req.method)) {
    try {
      options.body = await req.arrayBuffer();
    } catch {
      // No body to read
    }
  }

  try {
    const backendRes = await fetch(targetUrl, options);
    const body = await backendRes.arrayBuffer();

    const responseHeaders = new Headers();
    backendRes.headers.forEach((val, key) => {
      if (['transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) return;
      responseHeaders.set(key, val);
    });

    return new NextResponse(body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to communicate with backend service.', details: err.message },
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
