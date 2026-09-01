import { NextResponse } from 'next/server';

import { Group, GroupArticle } from '@/lib/groups';
import { checkGroupWriteRateLimit } from '@/lib/ratelimit';

/**
 * A group as the client sees it.
 *
 * The invite token is deliberately absent: only the owner is told the link, and
 * only from the route that mints it. Members must not be able to read it back
 * out of a group fetch and pass it on.
 */
export interface GroupResponse {
  id: string;
  name: string;
  owner: string;
  members: string[];
  isOwner: boolean;
  articleCount: number;
  articles: GroupArticle[];
  updatedAt: string;
}

export function toGroupResponse(group: Group, username: string): GroupResponse {
  return {
    id: group._id.toString(),
    name: group.name,
    owner: group.owner,
    members: group.members,
    isOwner: group.owner === username,
    articleCount: group.articles.length,
    articles: group.articles,
    updatedAt: group.updated_at.toISOString(),
  };
}

/** Shared 429 for the group write routes, matching the shape used elsewhere. */
export async function groupWriteLimit(username: string): Promise<NextResponse | null> {
  const { allowed, resetAt } = await checkGroupWriteRateLimit(username);
  if (allowed) return null;

  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) },
    }
  );
}
