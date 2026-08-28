import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/middleware';
import { listArticlesByIds } from '@/lib/articles';
import {
  deleteGroup,
  getGroupForMember,
  normaliseGroupName,
  renameGroup,
  toGroupId,
} from '@/lib/groups';
import { groupWriteLimit, toGroupResponse } from '@/lib/groups-api';

type Params = Promise<{ id: string }>;

/**
 * A non-member gets 404 rather than 403 throughout this file: whether a given
 * group exists is itself something only its members should learn.
 */
const notFound = () => NextResponse.json({ error: 'Group not found' }, { status: 404 });

export const GET = withAuth<Params>(async (_req: NextRequest, { user, params }) => {
  try {
    const id = toGroupId((await params!).id);
    if (!id) return notFound();

    const group = await getGroupForMember(id, user.username);
    if (!group) return notFound();

    // Papers are stored as references; resolve them from the article cache.
    const documents = await listArticlesByIds(group.articles.map((article) => article.arxiv_id));

    return NextResponse.json({
      group: toGroupResponse(group, user.username),
      documents,
    });
  } catch (error) {
    console.error('Get group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PATCH = withAuth<Params>(async (req: NextRequest, { user, params }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const id = toGroupId((await params!).id);
    if (!id) return notFound();

    const body = await req.json();
    const name = normaliseGroupName(body?.name);
    if (!name) {
      return NextResponse.json({ error: 'A group name is required' }, { status: 400 });
    }

    if (!(await renameGroup(id, user.username, name))) {
      // Either no such group, or the caller is a member but not the owner.
      const group = await getGroupForMember(id, user.username);
      if (!group) return notFound();
      return NextResponse.json({ error: 'Only the owner can rename this group' }, { status: 403 });
    }

    return NextResponse.json({ message: 'Group renamed', name });
  } catch (error) {
    console.error('Rename group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withAuth<Params>(async (_req: NextRequest, { user, params }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const id = toGroupId((await params!).id);
    if (!id) return notFound();

    if (!(await deleteGroup(id, user.username))) {
      const group = await getGroupForMember(id, user.username);
      if (!group) return notFound();
      return NextResponse.json({ error: 'Only the owner can delete this group' }, { status: 403 });
    }

    return NextResponse.json({ message: 'Group deleted' });
  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
