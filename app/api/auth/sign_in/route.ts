import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { verifyPassword, createAccessToken, createRefreshToken } from '@/lib/auth';
import { UserInDB, Token } from '@/types/models';

export async function POST(req: NextRequest) {
  try {
    // Parse form-urlencoded data
    const formData = await req.formData();
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const usersCollection = await getCollection<UserInDB>('users');
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { error: 'Incorrect username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect username or password' },
        { status: 401 }
      );
    }

    // Create tokens
    const access_token = createAccessToken({ sub: user.username });
    const refresh_token = createRefreshToken({ sub: user.username });

    const response: Token = {
      access_token,
      token_type: 'bearer',
      refresh_token,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
