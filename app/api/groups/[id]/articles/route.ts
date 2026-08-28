import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/middleware';
import { getArticle } from '@/lib/articles';
import {
  MAX_ARTICLES_PER_GROUP,
  addArticleToGroup,
  removeArticleFromGroup,
  toGroupId,
} from '@/lib/groups';
import { groupWriteLimit } from '@/lib/groups-api';

type Params = Promise<{ id: string }>;

export const POST = withAuth<Params>(async (req: NextRequest, { user, params }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const id = toGroupId((await params!).id);
    if (!id) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const body = await req.json();
    // Accepts anything arXiv-shaped: a bare id, or the abs URL a Document carries.
    const arxivId = body?.arxiv_id ?? body?.article_id;
    if (typeof arxivId !== 'string') {
      return NextResponse.json({ error: 'An arXiv id is required' }, { status: 400 });
    }

    switch (await addArticleToGroup(id, user.username, arxivId)) {
      case 'added':
        // A group stores only a reference, so the group page can show nothing
        // for a paper with no cached copy. Adding one is normally preceded by a
        // search, which caches it, but an invite link can bring in a member who
        // never ran that search — so make sure the copy exists either way.
        void getArticle(arxivId);
        return NextResponse.json({ message: 'Paper added' }, { status: 201 });
      case 'already-present':
        return NextResponse.json({ message: 'Paper already in this group' });
      case 'bad-id':
        return NextResponse.json({ error: 'That is not a valid arXiv id' }, { status: 400 });
      case 'full':
        return NextResponse.json(
          { error: `A group holds at most ${MAX_ARTICLES_PER_GROUP} papers` },
          { status: 409 }
        );
      default:
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Add group article error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withAuth<Params>(async (req: NextRequest, { user, params }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const id = toGroupId((await params!).id);
    if (!id) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const body = await req.json();
    const arxivId = body?.arxiv_id ?? body?.article_id;
    if (typeof arxivId !== 'string') {
      return NextResponse.json({ error: 'An arXiv id is required' }, { status: 400 });
    }

    if (!(await removeArticleFromGroup(id, user.username, arxivId))) {
      return NextResponse.json({ error: 'Paper not found in this group' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Paper removed' });
  } catch (error) {
    console.error('Remove group article error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
