import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
