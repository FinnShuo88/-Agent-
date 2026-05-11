import { NextRequest, NextResponse } from 'next/server';

const PY_BACKEND = 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = Array.isArray(path) ? path.join('/') : String(path);
  const search = request.nextUrl.search;

  try {
    const res = await fetch(`${PY_BACKEND}/api/${pathStr}${search}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Python backend unavailable', agents: [], tasks: [], metrics: {} },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const body = await request.json();

  try {
    const res = await fetch(`${PY_BACKEND}/api/${pathStr}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Python backend unavailable' },
      { status: 503 }
    );
  }
}
