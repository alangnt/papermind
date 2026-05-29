import { NextRequest, NextResponse } from 'next/server';
import { searchArxiv } from '@/lib/arxiv';
import { checkSearchRateLimit, getClientIp } from '@/lib/ratelimit';
import { Query } from '@/types/models';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const { allowed, resetAt } = checkSearchRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) },
      }
    );
  }

  try {
    const body: Query = await req.json();
    const { query, page = 1 } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const safePage = Math.min(Math.max(1, Number(page) || 1), 20);
    const limit = 10 * safePage;

    // Search arXiv
    const documents = await searchArxiv(query, 0, limit);

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No results found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
