import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/middleware';
import {
  MAX_GROUPS_PER_USER,
  countGroupsForUser,
  createGroup,
  listGroupsForUser,
  normaliseGroupName,
} from '@/lib/groups';
import { groupWriteLimit, toGroupResponse } from '@/lib/groups-api';

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  try {
    const groups = await listGroupsForUser(user.username);
    return NextResponse.json({
      groups: groups.map((group) => toGroupResponse(group, user.username)),
    });
  } catch (error) {
    console.error('List groups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const limited = groupWriteLimit(user.username);
  if (limited) return limited;

  try {
    const body = await req.json();
    const name = normaliseGroupName(body?.name);

    if (!name) {
      return NextResponse.json({ error: 'A group name is required' }, { status: 400 });
    }

    if ((await countGroupsForUser(user.username)) >= MAX_GROUPS_PER_USER) {
      return NextResponse.json(
        { error: `You can belong to at most ${MAX_GROUPS_PER_USER} groups` },
        { status: 409 }
      );
    }

    const group = await createGroup(name, user.username);
    return NextResponse.json({ group: toGroupResponse(group, user.username) }, { status: 201 });
  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
