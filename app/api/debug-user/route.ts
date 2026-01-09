import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return NextResponse.json({ 
        exists: false, 
        message: 'User not found' 
      });
    }

    return NextResponse.json({
      exists: true,
      username: user.username,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      hasNewFields: {
        tokenVersion: user.tokenVersion !== undefined,
        failedLoginAttempts: user.failedLoginAttempts !== undefined,
        lockedUntil: user.lockedUntil !== undefined,
        emailVerified: user.emailVerified !== undefined,
      },
      isLocked: user.lockedUntil ? new Date(user.lockedUntil) > new Date() : false,
      failedAttempts: user.failedLoginAttempts || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Error checking user',
      details: error.message 
    }, { status: 500 });
  }
}
