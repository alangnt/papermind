import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { hashPassword, createAccessToken, createRefreshToken } from '@/lib/auth';
import { UserInDB, BaseSignUp } from '@/types/models';
import { validatePasswordStrength } from '@/lib/password';
import {
  EMAIL_RULE,
  USERNAME_RULE,
  normaliseEmail,
  normaliseUsername,
  usernameFilter,
} from '@/lib/identity';
import { checkSignUpRateLimit, getClientIp } from '@/lib/ratelimit';

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/** Which indexed field collided, read off the driver's keyPattern. */
function duplicateKeyField(error: unknown): string | undefined {
  const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  return keyPattern ? Object.keys(keyPattern)[0] : undefined;
}

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

    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const cleanUsername = normaliseUsername(username);
    if (!cleanUsername) {
      return NextResponse.json({ error: USERNAME_RULE }, { status: 400 });
    }

    const cleanEmail = normaliseEmail(email);
    if (!cleanEmail) {
      return NextResponse.json({ error: EMAIL_RULE }, { status: 400 });
    }

    // Rate limiting: 3 sign-ups per hour per IP
    const clientIp = getClientIp(req.headers);
    const rateLimit = await checkSignUpRateLimit(clientIp);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many sign-up attempts. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Password does not meet requirements',
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection<UserInDB>('users');

    // Case-insensitive, so "Alice" cannot be registered next to "alice" and
    // pass for them in a group's member list.
    const usernameExists = await usersCollection.findOne(usernameFilter(cleanUsername));
    if (usernameExists) {
      return NextResponse.json({ code: 2001, message: 'Username already exists' }, { status: 409 });
    }

    const emailExists = await usersCollection.findOne({ email: cleanEmail });
    if (emailExists) {
      return NextResponse.json({ code: 2002, message: 'Email already exists' }, { status: 409 });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const now = new Date();

    const newUser = {
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      created_at: now,
      updated_at: now,
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockedUntil: null,
      emailVerified: true, // Auto-verify for now (Phase 3 will add email verification)
      disabled: false,
    };

    let result;
    try {
      result = await usersCollection.insertOne(newUser as any);
    } catch (error) {
      // The checks above lose to a concurrent signup; the unique indexes on
      // username/email are what actually prevent duplicates. Translate the
      // driver's duplicate-key error into the same 409 those checks return.
      if (isDuplicateKeyError(error)) {
        const field = duplicateKeyField(error);
        return field === 'email'
          ? NextResponse.json({ code: 2002, message: 'Email already exists' }, { status: 409 })
          : NextResponse.json({ code: 2001, message: 'Username already exists' }, { status: 409 });
      }
      throw error;
    }

    if (!result.insertedId) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 400 });
    }

    // Create tokens
    const access_token = createAccessToken({ sub: username, tokenVersion: 0 });
    const refresh_token = createRefreshToken({ sub: username, tokenVersion: 0 });

    // Return success without tokens in body
    const response = NextResponse.json(
      {
        message: 'Sign up successful',
        user: {
          username: newUser.username,
          email: newUser.email,
        },
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
