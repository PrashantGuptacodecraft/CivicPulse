import { NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://civic-pulse-x11a.vercel.app'
    : 'http://localhost:8000');

export async function GET() {
  try {
    const backendRes = await fetch(BACKEND_URL);
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Backend unreachable', details: err.message },
      { status: 502 }
    );
  }
}
