import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/middleware';
import { removeMember, toGroupId } from '@/lib/groups';
import { groupWriteLimit } from '@/lib/groups-api';

type Params = Promise<{ id: string }>;

/**
 * Remove someone from a group.
 *
 * With no `username` in the body this is "leave"; with one it is the owner
 * removing a member. lib/groups enforces which of those the caller may do.
 */
export const DELETE = withAuth<Params>(async (req: NextRequest, { user, params }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const id = toGroupId((await params!).id);
    if (!id) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const target = typeof body?.username === 'string' ? body.username : user.username;

    switch (await removeMember(id, user.username, target)) {
      case 'left':
        return NextResponse.json({
          message: target === user.username ? 'You left the group' : 'Member removed',
        });
      case 'owner-must-delete':
        return NextResponse.json(
          { error: 'The owner cannot leave a group. Delete it instead.' },
          { status: 409 }
        );
      case 'forbidden':
        return NextResponse.json(
          { error: 'Only the owner can remove other members' },
          { status: 403 }
        );
      default:
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Remove group member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
