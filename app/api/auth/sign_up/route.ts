import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { hashPassword, createAccessToken, createRefreshToken } from '@/lib/auth';
import { UserInDB, BaseSignUp, Token } from '@/types/models';

export async function POST(req: NextRequest) {
  try {
    const body: BaseSignUp = await req.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection<UserInDB>('users');

    // Check if username exists
    const usernameExists = await usersCollection.findOne({ username });
    if (usernameExists) {
      return NextResponse.json(
        { code: 2001, message: 'Username already exists' },
        { status: 409 }
      );
    }

    // Check if email exists
    const emailExists = await usersCollection.findOne({ email });
    if (emailExists) {
      return NextResponse.json(
        { code: 2002, message: 'Email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const now = new Date();

    const newUser = {
      username,
      email,
      password: hashedPassword,
      created_at: now,
      updated_at: now,
    };

    const result = await usersCollection.insertOne(newUser as any);
    
    if (!result.insertedId) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 400 }
      );
    }

    // Create tokens
    const access_token = createAccessToken({ sub: username });
    const refresh_token = createRefreshToken({ sub: username });

    const response: Token = {
      access_token,
      token_type: 'bearer',
      refresh_token,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
