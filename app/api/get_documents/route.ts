import { NextRequest, NextResponse } from 'next/server';
import { searchArxiv } from '@/lib/arxiv';
import { Query } from '@/types/models';

export async function POST(req: NextRequest) {
  try {
    const body: Query = await req.json();
    const { query, page = 1 } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const limit = 10 * page;

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
