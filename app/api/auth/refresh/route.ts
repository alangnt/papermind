import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, createAccessToken, createRefreshToken } from '@/lib/auth';
import { getCookie } from '@/lib/cookies';
import { createAuthCookies } from '@/lib/cookies';

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    
    // Get refresh token from cookies (primary method)
    let refresh_token = getCookie(cookieHeader, 'refresh_token');
    
    // Fallback to request body for backward compatibility
    if (!refresh_token) {
      try {
        const body = await req.json();
        refresh_token = body.refresh_token;
      } catch (error) {
        // No JSON body, that's okay if we have cookie
      }
    }

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refresh_token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    const username = payload.sub;
    if (!username) {
      return NextResponse.json(
        { error: 'Invalid refresh token payload' },
        { status: 401 }
      );
    }

    // Create new access token and refresh token
    const access_token = createAccessToken({ sub: username });
    const new_refresh_token = createRefreshToken({ sub: username });

    // Return success
    const response = NextResponse.json(
      { message: 'Token refreshed successfully' },
      { status: 200 }
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

    response.cookies.set('refresh_token', new_refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
