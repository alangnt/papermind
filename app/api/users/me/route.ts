import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';                                                               
import { headers } from 'next/headers';
import { User } from '@/types/models';
import { ObjectId } from 'mongodb';

export const GET = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as unknown as User;

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
