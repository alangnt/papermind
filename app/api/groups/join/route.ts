import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/middleware';
import { findGroupByInviteToken, joinGroupByToken } from '@/lib/groups';
import { groupWriteLimit } from '@/lib/groups-api';

/**
 * Preview an invite before accepting it, so the join page can name the group
 * rather than asking someone to join something unidentified. Returns only the
 * name and size — never the member list, which is not yours until you join.
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const token = req.nextUrl.searchParams.get('token') ?? '';
    const group = await findGroupByInviteToken(token);

    if (!group) {
      return NextResponse.json(
        { error: 'This invite link is invalid or has expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: group._id.toString(),
      name: group.name,
      owner: group.owner,
      memberCount: group.members.length,
      articleCount: group.articles.length,
    });
  } catch (error) {
    console.error('Preview invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const body = await req.json();
    const token = typeof body?.token === 'string' ? body.token : '';

    const outcome = await joinGroupByToken(token, user.username);

    if (outcome.result === 'invalid-token') {
      return NextResponse.json(
        { error: 'This invite link is invalid or has expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: outcome.result === 'joined' ? 'Joined the group' : 'You are already a member',
      id: outcome.groupId,
      name: outcome.name,
    });
  } catch (error) {
    console.error('Join group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
