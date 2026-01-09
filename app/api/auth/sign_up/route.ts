import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { hashPassword, createAccessToken, createRefreshToken } from '@/lib/auth';
import { UserInDB, BaseSignUp } from '@/types/models';
import { createAuthCookies } from '@/lib/cookies';
import { validatePasswordStrength } from '@/lib/password';
import { checkSignUpRateLimit, getClientIp } from '@/lib/ratelimit';

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

    // Rate limiting: 3 sign-ups per hour per IP
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkSignUpRateLimit(clientIp);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { 
          error: 'Too many sign-up attempts. Please try again later.',
          retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          }
        }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet requirements',
          details: passwordValidation.errors 
        },
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
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockedUntil: null,
      emailVerified: true, // Auto-verify for now (Phase 3 will add email verification)
      disabled: false,
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

    // Return success without tokens in body
    const response = NextResponse.json(
      { 
        message: 'Sign up successful',
        user: {
          username: newUser.username,
          email: newUser.email,
        }
      },
      { status: 201 }
    );

    // Set cookies using Next.js cookies API
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set('access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
