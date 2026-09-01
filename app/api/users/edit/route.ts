import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getCollection } from '@/lib/mongodb';
import { User } from '@/types/models';

const MAX_NAME_LENGTH = 80;

/**
 * Names are written straight into the user document and read back into the UI,
 * so anything that is not a plain string is refused rather than stored. Without
 * this the route persisted whatever JSON it was handed — an object shaped like
 * a Mongo operator included, which is a bad thing to have sitting in a field
 * that later code may put into a query.
 */
function normaliseName(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > MAX_NAME_LENGTH ? null : trimmed;
}

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json().catch(() => null);

    const firstName = normaliseName(body?.first_name);
    const lastName = normaliseName(body?.last_name);

    if (firstName === null || lastName === null) {
      return NextResponse.json(
        { error: `Names must be text of at most ${MAX_NAME_LENGTH} characters` },
        { status: 400 }
      );
    }

    const update: Partial<Pick<User, 'first_name' | 'last_name'>> = {};
    if (firstName !== undefined) update.first_name = firstName;
    if (lastName !== undefined) update.last_name = lastName;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const usersCollection = await getCollection<User>('users');
    const result = await usersCollection.updateOne({ username: user.username }, { $set: update });

    // matchedCount, not modifiedCount: saving a name that is already stored
    // changes nothing, and that is a success rather than a failure.
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Updated user', data: update });
  } catch (error) {
    console.error('Edit profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
