import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getCollection } from '@/lib/mongodb';
import { clearAuthCookies } from '@/lib/cookies';
import { anonymiseContributions, detachUserFromAllGroups } from '@/lib/groups';
import { User } from '@/types/models';
import { ObjectId } from 'mongodb';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    // Remove sensitive fields
    const { password, ...userWithoutPassword } = user as any;

    // Convert ObjectId to string for JSON serialization
    const userResponse: User = {
      ...userWithoutPassword,
      _id: user._id instanceof ObjectId ? user._id.toString() : user._id,
    };

    return NextResponse.json(userResponse);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * Erase the signed-in account.
 *
 * Order matters: groups are settled first, so a failure part-way leaves the
 * account intact and the operation repeatable, rather than deleting the user
 * and orphaning groups that still name them as owner.
 *
 * Saved articles live inside the user document and go with it. Papers the
 * account contributed to groups stay — they belong to the group — but the
 * attribution is blanked.
 */
export const DELETE = withAuth(async (_req: NextRequest, { user }) => {
  try {
    const summary = await detachUserFromAllGroups(user.username);
    await anonymiseContributions(user.username);

    const resetTokens = await getCollection('reset_tokens');
    await resetTokens.deleteMany({ email: user.email });

    const users = await getCollection('users');
    const result = await users.deleteOne({ username: user.username });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const response = NextResponse.json({ message: 'Account deleted', groups: summary });
    // The session must not outlive the account it belongs to.
    for (const cookie of clearAuthCookies()) {
      response.headers.append('Set-Cookie', cookie);
    }
    return response;
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
