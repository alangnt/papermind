import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/middleware';
import { toGroupId, transferOwnership } from '@/lib/groups';
import { groupWriteLimit } from '@/lib/groups-api';

type Params = Promise<{ id: string }>;

/**
 * Hand the group to another member.
 *
 * Owner only. A non-member gets 404 rather than 403, as everywhere else in this
 * API: whether a group exists is itself something only its members should learn.
 */
export const PATCH = withAuth<Params>(async (req: NextRequest, { user, params }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const id = toGroupId((await params!).id);
    if (!id) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const body = await req.json().catch(() => null);
    const target = typeof body?.username === 'string' ? body.username.trim() : '';
    if (!target) {
      return NextResponse.json(
        { error: 'A member to hand the group to is required' },
        { status: 400 }
      );
    }

    switch (await transferOwnership(id, user.username, target)) {
      case 'transferred':
        return NextResponse.json({ message: `${target} now owns this group`, owner: target });
      case 'already-owner':
        return NextResponse.json({ error: 'You already own this group' }, { status: 409 });
      case 'not-a-member':
        return NextResponse.json(
          { error: 'That person is not a member of this group' },
          { status: 404 }
        );
      case 'not-owner':
        return NextResponse.json(
          { error: 'Only the owner can hand over this group' },
          { status: 403 }
        );
      default:
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Transfer group ownership error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
