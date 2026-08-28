import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/middleware';
import { createInvite, getGroupForMember, revokeInvite, toGroupId } from '@/lib/groups';
import { groupWriteLimit } from '@/lib/groups-api';
import { inviteUrl } from '@/lib/site';

type Params = Promise<{ id: string }>;

/**
 * Mint an invite link, replacing any link already out there.
 *
 * Owner only, and the full URL is returned from here alone — a group fetch never
 * exposes the token, so a member cannot read one back out and pass it on.
 */
export const POST = withAuth<Params>(async (_req: NextRequest, { user, params }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const id = toGroupId((await params!).id);
    if (!id) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const invite = await createInvite(id, user.username);
    if (!invite) {
      const group = await getGroupForMember(id, user.username);
      if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      return NextResponse.json({ error: 'Only the owner can invite people' }, { status: 403 });
    }

    return NextResponse.json({
      url: inviteUrl(invite.token),
      expiresAt: invite.expires_at.toISOString(),
    });
  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withAuth<Params>(async (_req: NextRequest, { user, params }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const id = toGroupId((await params!).id);
    if (!id) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    if (!(await revokeInvite(id, user.username))) {
      const group = await getGroupForMember(id, user.username);
      if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      return NextResponse.json({ error: 'Only the owner can revoke the link' }, { status: 403 });
    }

    return NextResponse.json({ message: 'Invite link revoked' });
  } catch (error) {
    console.error('Revoke invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
