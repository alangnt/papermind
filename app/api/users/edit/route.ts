import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getCollection } from '@/lib/mongodb';

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const { first_name, last_name } = body;

    const usersCollection = await getCollection('users');
    const result = await usersCollection.updateOne(
      { username: user.username },
      { $set: { first_name, last_name } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Updated user',
      status: 200,
      data: { first_name, last_name },
    });
  } catch (error) {
    console.error('Edit profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
