import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { EditProfile } from '@/types/models';

export async function POST(req: NextRequest) {
  try {
    const body: EditProfile = await req.json();
    const { username, first_name, last_name } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');
    const result = await usersCollection.updateOne(
      { username },
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
}
