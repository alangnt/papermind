import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { verifyPassword, createAccessToken, createRefreshToken, hashPassword } from '@/lib/auth';
import { UserInDB } from '@/types/models';
import { createAuthCookies } from '@/lib/cookies';
import { checkSignInRateLimit, getClientIp, resetRateLimit } from '@/lib/ratelimit';

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

    // Rate limiting: Check before processing
    const clientIp = getClientIp(req.headers);
    const rateLimit = checkSignInRateLimit(clientIp, username);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { 
          error: 'Too many sign-in attempts. Please try again later.',
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

    // Get user from database
    const usersCollection = await getCollection<UserInDB>('users');
    const user = await usersCollection.findOne({ username });

    // Always hash password even if user doesn't exist (timing-safe)
    if (!user) {
      await hashPassword(password); // Constant-time operation
      return NextResponse.json(
        { error: 'Incorrect username or password' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const lockDuration = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 1000 / 60);
      return NextResponse.json(
        { error: `Account is locked. Try again in ${lockDuration} minutes.` },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };

      // Lock account after 10 failed attempts
      if (failedAttempts >= 10) {
        updateData.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      }

      await usersCollection.updateOne(
        { username },
        { $set: updateData }
      );

      return NextResponse.json(
        { error: 'Incorrect username or password' },
        { status: 401 }
      );
    }

    // Check if account is disabled
    if (user.disabled) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Reset failed login attempts on successful login
    await usersCollection.updateOne(
      { username },
      { $set: { failedLoginAttempts: 0, lockedUntil: null } }
    );

    // Reset rate limit on successful login
    resetRateLimit('signin', `${clientIp}:${username}`);

    // Create tokens
    const access_token = createAccessToken({ sub: user.username });
    const refresh_token = createRefreshToken({ sub: user.username });

    // Create secure cookies
    const [accessCookie, refreshCookie] = createAuthCookies(access_token, refresh_token);

    // Return success without tokens in body
    const response = NextResponse.json(
      { 
        message: 'Sign in successful',
        user: {
          username: user.username,
          email: user.email,
        }
      },
      { status: 200 }
    );

    // Set cookies in response
    response.headers.append('Set-Cookie', accessCookie);
    response.headers.append('Set-Cookie', refreshCookie);

    return response;
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
